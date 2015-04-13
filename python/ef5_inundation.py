#
# Processes Flood Inundation Maps from EF5 http://flash.ou.edu/pakistan/
#

import os, sys
from datetime import date
from dateutil.parser import parse

import glob, fnmatch, urllib, math, shutil
from osgeo import gdal
import numpy
import argparse
import config
import json

from browseimage import MakeBrowseImage 
from s3 import CopyToS3
from level import CreateLevel

force 		= 0
verbose 	= 0

BASE_DIR 	= config.EF5_DIR

def execute( cmd ):
	if verbose:
		print cmd
	os.system(cmd)
		
def process(mydir, scene, s3_bucket, s3_folder):
	fullName = os.path.join(mydir, scene+".tif")
	if not os.path.exists(fullName):
		print "File does not exist", fullName
		sys.exit(-1)
	
		
	# Flood inundation map for Namibia has to large of an extent [[10,-30,30,-10]]
	# we can trim it [15, -20, 20, -10]
	subsetFileName	= os.path.join(mydir,	   "%s_subset.tif" % scene)
	if force or not os.path.exists(subsetFileName):
		bbox 			= [15, -20, 20, -12]
		warpOptions 	= "-q -overwrite -co COMPRESS=DEFLATE -t_srs EPSG:4326 -te %s %s %s %s " % (bbox[0], bbox[1], bbox[2], bbox[3])
		warpCmd 		= 'gdalwarp ' + warpOptions + fullName + ' ' + subsetFileName
		execute( warpCmd )
	
	#sys.exit(-1)
	
	geojsonDir	= os.path.join(mydir,"geojson")
	if not os.path.exists(geojsonDir):            
		os.makedirs(geojsonDir)

	levelsDir	= os.path.join(mydir,"levels")
	if not os.path.exists(levelsDir):            
		os.makedirs(levelsDir)

	merge_filename 		= os.path.join(geojsonDir, "ef5.%s.geojson" % scene)
	topojson_filename 	= os.path.join(geojsonDir, "..", "ef5.%s.topojson" % scene)
	browse_filename 	= os.path.join(geojsonDir, "..", "ef5.%s_browse.tif" % scene)
	small_filename	 	= os.path.join(geojsonDir, "..", "ef5.%s_small_browse.tif" % scene)
	osm_bg_image		= os.path.join(geojsonDir, "..", "osm_bg.png")
	sw_osm_image		= os.path.join(geojsonDir, "..", "ef5.%s_thn.jpg" % scene)
	
	ds 					= gdal.Open( subsetFileName )
	band				= ds.GetRasterBand(1)
	data				= band.ReadAsArray(0, 0, ds.RasterXSize, ds.RasterYSize )
		
	levels 				= [ 21, 13, 8, 5, 3, 2, 1]
	hexColors 			= [ "#fee5d9", "#fcbba1", "#fc9272", "#fb6a4a", "#ef3b2c", "#cb181d", "#99000d"]

	if force or not os.path.exists(topojson_filename+".gz"):
		if verbose:
			print "Processing", subsetFileName

		for l in levels:
			fileName 		= os.path.join(levelsDir, scene+"_level_%d.tif"%l)
			CreateLevel(l, geojsonDir, fileName, ds, data, "height", force, verbose)
	
		jsonDict = dict(type='FeatureCollection', features=[])
	
		for l in reversed(levels):
			fileName 		= os.path.join(geojsonDir, "height_level_%d.geojson"%l)
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

	if force or not os.path.exists(sw_osm_image):
		MakeBrowseImage(ds, browse_filename, subsetFileName, osm_bg_image, sw_osm_image, levels, hexColors, force, verbose, 6)
			
	# we could remove geojsonDir and levelsDir
	#cmd 	= "rm -rf %s %s" %(geojsonDir, levelsDir)
	
	ds = None
	
	file_list = [ sw_osm_image, topojson_filename, topojson_filename+".gz", fullName ]
	
	CopyToS3( s3_bucket, s3_folder, file_list, force, verbose )
	
# ===============================
# Main
#
# python ef5_inundation.py --date 2015-02-03 -v -f

if __name__ == '__main__':

	aws_access_key 			= os.environ.get('AWS_ACCESSKEYID')
	aws_secret_access_key 	= os.environ.get('AWS_SECRETACCESSKEY')
	
	parser = argparse.ArgumentParser(description='Generate EF5 flood map')
	apg_input = parser.add_argument_group('Input')
	apg_input.add_argument("-f", "--force", action='store_true', help="HydroSHEDS forces new water image to be generated")
	apg_input.add_argument("-v", "--verbose", action='store_true', help="Verbose on/off")
	apg_input.add_argument("-d", "--date", help="Date 2015-03-20 or today if not defined")

	todaystr	= date.today().strftime("%Y-%m-%d")

	options 	= parser.parse_args()

	dt			= options.date or todaystr
	force		= options.force
	verbose		= options.verbose
	
	today		= parse(dt)
	year		= today.year
	month		= today.month
	day			= today.day
	doy			= today.strftime('%j')
		
	ef5_dir		= os.path.join(BASE_DIR,str(year),doy)	

	old_fileName	= "%d%02d%02d.120000" % (year,month,day)
	old_fullName	= os.path.join(ef5_dir, old_fileName)

	fileName	= "%d%02d%02d" % (year,month,day)
	fullName	= os.path.join(ef5_dir, fileName)
	
	shutil.copy2(old_fullName+".tif", fullName+".tif")
	
	s3_folder	= os.path.join("ef5", str(year), doy)
	s3_bucket	= 'ojo-d4'	# Namibia
	
	process(ef5_dir, fileName, s3_bucket, s3_folder)
