# VIIRS Chlorophyll-A 4km Product
#
# http://oceandata.sci.gsfc.nasa.gov/VIIRS/Mapped/Daily/4km/CHL/2015/
#
import numpy, sys, os, inspect
from osgeo import osr, gdal
from ftplib import FTP
from datetime import date
import warnings
from gzip import GzipFile
import numpy
import json
from datetime import date
from dateutil.parser import parse
import urllib2

# Site configuration
import config
import argparse

from browseimage import MakeBrowseImage 
from s3 import CopyToS3
from level import CreateLevel

verbose 	= 0
force 		= 0

def execute( cmd ):
	if verbose:
		print cmd
	os.system(cmd)

def get_file(year, mydir, filename):
	#url = "http://oceandata.sci.gsfc.nasa.gov/VIIRS/Mapped/Daily/4km/CHL/%s/%s"%(year, filename)
	url = "http://oceandata.sci.gsfc.nasa.gov/cgi/getfile/%s" % (filename)
	if verbose:
		print "get_file", url
		
	response = urllib2.urlopen(url)
	outf = open(os.path.join(mydir, filename), "w")
	outf.write( response.read()  )
	outf.close()
	
def process_viirs_chla_file( mydir, regionName, viirs_filename, s3_bucket, s3_folder):
	print "Processing", viirs_filename+":chlor_a"
	region		= config.regions[regionName]
	bbox		= region['bbox']
	
	rdir		= os.path.join(mydir, regionName)
	if not os.path.exists(rdir):            
		os.makedirs(rdir)
	
	geojsonDir	= os.path.join(rdir,"geojson")
	if not os.path.exists(geojsonDir):            
		os.makedirs(geojsonDir)

	levelsDir	= os.path.join(rdir,"levels")
	if not os.path.exists(levelsDir):            
		os.makedirs(levelsDir)

	shpDir	= os.path.join(rdir,"shp")
	if not os.path.exists(shpDir):            
		os.makedirs(shpDir)

	subset_file			= os.path.join(rdir, "viirs_chla.%s.tif" % ymd)
	super_subset_file	= os.path.join(rdir, "viirs_chla_super.%s.tif" % ymd)
	merge_filename 		= os.path.join(geojsonDir, "viirs_chla.%s.geojson" % ymd)
	topojson_filename 	= os.path.join(geojsonDir, "..", "viirs_chla.%s.topojson" % ymd)
	browse_filename 	= os.path.join(geojsonDir, "..", "viirs_chla.%s_browse.tif" % ymd)
	subset_filename 	= os.path.join(geojsonDir, "..", "viirs_chla.%s_small_browse.tif" % ymd)
	osm_bg_image		= os.path.join(geojsonDir, "..", "osm_bg.png")
	sw_osm_image		= os.path.join(geojsonDir, "..", "viirs_chla.%s_thn.jpg" % ymd)
	shp_filename 		= os.path.join(rdir, "viirs_chla.%s.shp.gz" % (ymd))
	json_filename		= os.path.join(geojsonDir, "viirs_chla.%s.json" % (ymd))
	
	if force or not os.path.exists(subset_file):
		cmd = "gdalwarp -overwrite -q -te %f %f %f %f %s %s" % (bbox[0], bbox[1], bbox[2], bbox[3], viirs_filename, subset_file)
		execute(cmd)
	
	ds 					= gdal.Open( subset_file )
	geotransform		= ds.GetGeoTransform()
	px					= geotransform[1] / 10
	py					= geotransform[5] / 10
	ds					= None
	
	# upsample and convolve
	if force or not os.path.exists(super_subset_file):
		cmd = "gdalwarp -overwrite -q -r cubicspline -tr %s %s -te %f %f %f %f -co COMPRESS=LZW %s %s" % (str(px), str(py), bbox[0], bbox[1], bbox[2], bbox[3], subset_file, super_subset_file)
		execute(cmd)
	
	levels 				= [350, 100, 50, 30, 20, 15, 10, 5, 3, 1]

	# From http://colorbrewer2.org/
	hexColors 			= ["#5e4fa2", "#3288bd", "#66c2a5", "#abdda4", "#e6f598", "#fee08b", "#fdae61", "#f46d43", "#d53e4f", "#9e0142"]
	
	ds 					= gdal.Open( super_subset_file )
	band				= ds.GetRasterBand(1)
	data				= band.ReadAsArray(0, 0, ds.RasterXSize, ds.RasterYSize )
	data *= 100
	
	if force or not os.path.exists(topojson_filename+".gz"):
		for l in levels:
			fileName 		= os.path.join(levelsDir, ymd+"_level_%d.tif"%l)
			CreateLevel(l, geojsonDir, fileName, ds, data, "viirs_chla", force, verbose)
	
		jsonDict = dict(type='FeatureCollection', features=[])
	
		for l in reversed(levels):
			fileName 		= os.path.join(geojsonDir, "viirs_chla_level_%d.geojson"%l)
			if os.path.exists(fileName):
				print "merge", fileName
				with open(fileName) as data_file:    
					data = json.load(data_file)
		
				if 'features' in data:
					for f in data['features']:
						jsonDict['features'].append(f)
	

		with open(merge_filename, 'w') as outfile:
		    json.dump(jsonDict, outfile)	

		# Convert to topojson
		cmd 	= "topojson -p -o "+ topojson_filename + " " + merge_filename
		execute(cmd)

		cmd 	= "gzip --keep "+ topojson_filename
		execute(cmd)
	
	# Create shapefile gz
	if force or not os.path.exists(shp_filename):
		# Convert simplified topojson to geojson
		cmd = "topojson-geojson --precision 5 %s -o %s" % (topojson_filename, geojsonDir)
		execute(cmd)
		
		cmd = "ogr2ogr -f 'ESRI Shapefile' %s %s" % (shpDir, json_filename)
		execute(cmd)
		
		cmd = "cd %s; tar -zcvf %s %s" % (rdir, shp_filename, shpDir)
		execute(cmd)
		
		
	if force or not  .path.exists(sw_osm_image):
		zoom 	= region['thn_zoom']
		scale 	= 100	
		MakeBrowseImage(ds, browse_filename, subset_filename, osm_bg_image, sw_osm_image, levels, hexColors, force, verbose, zoom, scale)
		
	ds = None
	
	file_list = [ sw_osm_image, topojson_filename, topojson_filename+".gz", subset_file, shp_filename ]
	CopyToS3( s3_bucket, s3_folder, file_list, force, verbose )
#
# ======================================================================
#	python viirs_CHLA.py --region d03 --date 2015-04-14 -v
#
if __name__ == '__main__':
	version_num = int(gdal.VersionInfo('VERSION_NUM'))
	if version_num < 1800: # because of GetGeoTransform(can_return_null)
		print('ERROR: Python bindings of GDAL 1.8.0 or later required')
		sys.exit(1)
	
	parser 		= argparse.ArgumentParser(description='VIIRS Chlorophyl-A Processing')
	apg_input 	= parser.add_argument_group('Input')
	apg_input.add_argument("-f", "--force", action='store_true', help="forces new product to be generated")
	apg_input.add_argument("-v", "--verbose", action='store_true', help="Verbose Flag")
	apg_input.add_argument("-r", "--region", 	help="Region")
	apg_input.add_argument("-d", "--date", 	help="Date")
	
	options 	= parser.parse_args()
	force		= options.force
	verbose		= options.verbose

	regionName	= options.region	
	region		= config.regions[regionName]
	
	todaystr	= date.today().strftime("%Y-%m-%d")
	dt			= options.date or todaystr
	
	today		= parse(dt)
	
	year		= today.year
	month		= today.month
	day			= today.day
	doy			= today.strftime('%j')
	
	ymd 		= "%d%02d%02d" % (year, month, day)
	
	mydir 		= os.path.join(config.VIIRS_CHLA_DIR, str(year), doy)
	if not os.path.exists(mydir):            
		os.makedirs(mydir)
	
	filename				= "V%s%s.L3m_DAY_NPP_CHL_chlor_a_4km.nc" % (year, doy)
	netcdf_viirs_filename 	= os.path.join(mydir, filename )	
	tif_viirs_filename 		= os.path.join(mydir, "V%s%s.L3m_DAY_NPP_CHL_chlor_a_4km.tif" % (year, doy))	
	
	if not os.path.exists(netcdf_viirs_filename):          
		print "file not found",   netcdf_viirs_filename
		get_file(str(year), mydir, filename)

	if not os.path.exists(tif_viirs_filename):          
		cmd = "gdal_translate netcdf:%s:chlor_a %s" % (netcdf_viirs_filename, tif_viirs_filename)
		execute(cmd)
		
	s3_folder	= os.path.join("viirs_chla", str(year), doy)
	s3_bucket	= region['bucket']
	
	process_viirs_chla_file( mydir, regionName, tif_viirs_filename, s3_bucket, s3_folder)