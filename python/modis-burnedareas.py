#!/usr/bin/env python
#
# Created on 9/27/2012 Pat Cappelaere - Vightel Corporation
#
# Requirements:
#	gdal, numpy pytrmm...
#
# Access and Process MODIS Burned Areas
# ftp://ba1.geog.umd.edu/Collection51/MODIS_Burned_Area_Collection51_User_Guide_3.0.pdf
# Monthly product
# 
#
import numpy, sys, os, inspect
from osgeo import osr, gdal
from ftplib import FTP
from datetime import date
import warnings
from gzip import GzipFile

from datetime import date
from dateutil.parser import parse

# Site configuration
import config
import argparse

from browseimage import MakeBrowseImage 
from s3 import CopyToS3

ftp_site 	= "ba1.geog.umd.edu"
user		= 'user'
password	= 'burnt_data'
force		= 0
verbose		= 0

def execute( cmd ):
	if verbose:
		print cmd
	os.system(cmd)
	
def get_latest_mcd45_file(mydir, regionName, year):
	print("Checking "+ ftp_site + " for latest file...")
	ftp = FTP(ftp_site)
	
	ftp.login(user, password)               				# user anonymous, passwd anonymous@
	
	if regionName == 'd02':
		path		= "Collection51/TIFF/Win04/%s"%(year)		# 
	if regionName == 'd03':
		path		= "Collection51/TIFF/Win04/%s"%(year)		# 
	if regionName == 'd04':
		path		= "Collection51/TIFF/Win12/%s"%(year)		# 
	if regionName == 'd05':
		path		= "Collection51/TIFF/Win12/%s"%(year)		# 
	if regionName == 'd06':
		path		= "Collection51/TIFF/Win18/%s"%(year)		# 
		
	print("cwd to "+path)
	ftp.cwd(path)
	filenames 	= []
	ftp.retrlines('NLST', filenames.append )
	download 	= filenames[len(filenames)-1]	# last one in list
	download  	= download[:len(download)-3]	# remove .gz
	
	print "latest is: ", download	
	
	local_filename = os.path.join(mydir, download)
	if os.path.exists(local_filename):
		print "already downloaded and processed..."
		ftp.close()
		if not force:
			sys.exit(-1)
		else:
			return local_filename
	else:
		if verbose:
			print "Downloading ", download+".gz", " to:", local_filename+".gz"
		file = open(local_filename+".gz", 'wb')
		try:
			ftp.retrbinary("RETR " + download+".gz", file.write)
			file.close()
			ftp.quit()
			
			# decompress it
			cmd = "gunzip -d "+local_filename+".gz" 
			if verbose:
				print cmd
			err = os.system(cmd)
			print "gunzip err", err
			if err != 0:
				raise Exception("gunzip error")
			ftp.close()
			return local_filename
		except:
			print "Error", sys.exc_info()[0]
			os.remove(local_filename+".gz")
			ftp.close()
			sys.exit(1)
			
def process_mcd45_file(mydir, dx, file_name, s3_bucket, s3_folder):
	if verbose:
		print "Processing:"+file_name
		
	region 	= config.regions[dx]
	assert(region)
	
	bbox	= region['bbox']

	localdir			= os.path.join(mydir, dx )
	if not os.path.exists(localdir):            
		os.makedirs(localdir)
	
	# Set file vars
	output_file 			= os.path.join(localdir, "mcd45_%s_out.tif" % ymd)
	rgb_output_file 		= os.path.join(localdir, "mcd45_%s_out_rgb.tif" % ymd)
	subset_file 			= os.path.join(localdir, "mcd45_%s_subset.tif" % ymd)
	subset_rgb_file 		= os.path.join(localdir, "mcd45_%s_subset_rgb.tif" % ymd)
	color_file 				= os.path.join("cluts","mcd45_colors.txt")
	resampled_file 			= os.path.join(localdir, "mcd45_%s_resampled.tif" % ymd)
	resampled_rgb_file 		= os.path.join(localdir, "mcd45_%s_resampled_rgb.tif" % ymd)
	bmp_file 				= os.path.join(localdir, "mcd45_%s.bmp" % ymd)
	geojson_file 			= os.path.join(localdir, "mcd45_%s.geojson" % ymd)
	topojson_file 			= os.path.join(localdir, "mcd45_%s.topojson" % ymd)
	topojsongz_file 		= os.path.join(localdir, "mcd45_%s.topojson.gz" % ymd)
	sw_osm_image			= os.path.join(localdir, "mcd45.%s_thn.jpg" % ymd)
	osm_bg_image			= os.path.join(localdir, "osm_bg.png")
	browse_filename 		= os.path.join(localdir, "mcd45.%s_browse.tif" % ymd)
	small_browse_filename 	= os.path.join(localdir, "mcd45.%s_small_browse.tif" % ymd)
	
	# subset it to our BBOX
	# use ullr
	if force or not os.path.exists(subset_file):
		lonlats	= "" + str(bbox[0]) + " " + str(bbox[3]) + " " + str(bbox[2]) + " " + str(bbox[1])
		cmd 	= "gdal_translate -projwin " + lonlats +" "+ file_name + " " + subset_file
		execute(cmd)

	# color it using colormap
	if force or not os.path.exists(resampled_rgb_file):
		cmd = "gdaldem color-relief -alpha " + subset_file + " " + color_file + " " + resampled_rgb_file
		execute(cmd)
		
	if force or not os.path.exists(bmp_file):
		cmd = "gdal_translate -b 1 -of BMP -ot Byte %s %s" % (resampled_rgb_file, bmp_file)
		execute(cmd)
	
		execute("rm -f "+bmp_file+".aux.xml")

	ds 				= gdal.Open( resampled_rgb_file )
	geotransform 	= ds.GetGeoTransform()
	xorg			= geotransform[0]
	yorg  			= geotransform[3]
	res				= geotransform[1]		
	xmax			= geotransform[0] + ds.RasterXSize * geotransform[1]
	ymax			= geotransform[3] + ds.RasterYSize * geotransform[5]


	if force or not os.path.exists(geojson_file):
		cmd = str.format("potrace -z black -a 1.5 -t 1 -i -b geojson -o {0} {1} -x {2} -L {3} -B {4} ", geojson_file, bmp_file, res, xorg, ymax ); 
		execute(cmd)

	if force or not os.path.exists(topojson_file):
		cmd = str.format("topojson --bbox --simplify-proportion 0.5 {0} -o {1} ", geojson_file, topojson_file ); 
		execute(cmd)

	if force or not os.path.exists(topojsongz_file):
		# compress topojson without all the directories
		cmd = str.format("gzip --keep {0} ", topojson_file); 
		execute(cmd)

	zoom 		= region['thn_zoom']
	levels 		= [365, 0]
	hexColors 	= [ "#990066", "#ff0000"]

	if force or not os.path.exists(sw_osm_image):
		MakeBrowseImage(ds, browse_filename, small_browse_filename, osm_bg_image, sw_osm_image, levels, hexColors, force, verbose, zoom)

	file_list = [ sw_osm_image, topojson_file, topojson_file+".gz", subset_file ]
	CopyToS3( s3_bucket, s3_folder, file_list, force, verbose )

	ds = None
#
# ======================================================================
#	python modis-burnedareas.py --region d03 -v
#
if __name__ == '__main__':
	version_num = int(gdal.VersionInfo('VERSION_NUM'))
	if version_num < 1800: # because of GetGeoTransform(can_return_null)
		print('ERROR: Python bindings of GDAL 1.8.0 or later required')
		sys.exit(1)
	
	parser 		= argparse.ArgumentParser(description='MODIS Processing')
	apg_input 	= parser.add_argument_group('Input')
	apg_input.add_argument("-f", "--force", action='store_true', help="forces new product to be generated")
	apg_input.add_argument("-v", "--verbose", action='store_true', help="Verbose Flag")
	apg_input.add_argument("-r", "--region", 	help="Region")
	
	options 	= parser.parse_args()
	force		= options.force
	verbose		= options.verbose

	regionName	= options.region	
	region		= config.regions[regionName]
	
	dt			= date.today().strftime("%Y-%m-%d")
	today		= parse(dt)
	
	year		= today.year
	month		= today.month
	day			= today.day
	doy			= today.strftime('%j')
	
	ymd 		= "%d%02d%02d" % (year, month, day)
	
	mydir = config.MODIS_BURNEDAREAS_DIR
	if not os.path.exists(mydir):            
		os.makedirs(mydir)
	
	latest_file = get_latest_mcd45_file(mydir, regionName, year)
	
	s3_folder	= os.path.join("mcd45", str(year), doy)
	s3_bucket	= region['bucket']
	
	process_mcd45_file( mydir, regionName, latest_file, s3_bucket, s3_folder)