#
# Processes Soil Moisture from EF5 http://flash.ou.edu/pakistan/
# 0-300 mm
#

import os, inspect, sys, math, urllib
import argparse

from datetime import date
from dateutil.parser import parse
from osgeo import gdal
import numpy
import json

from browseimage import MakeBrowseImage 
from s3 import CopyToS3
from level import CreateLevel

import config

verbose = 0
force 	= 0
		
def execute( cmd ):
	if verbose:
		print cmd
	os.system(cmd)

def process(swe_dir, scene, s3_bucket, s3_folder):
	fullName = os.path.join(swe_dir, scene+".tif")
	if not os.path.exists(fullName):
		print "File does not exist", fullName
		sys.exit(-1)
	
	if verbose:
		print "Processing", fullName
		
	geojsonDir	= os.path.join(swe_dir,"geojson")
	if not os.path.exists(geojsonDir):            
		os.makedirs(geojsonDir)

	levelsDir	= os.path.join(swe_dir,"levels")
	if not os.path.exists(levelsDir):            
		os.makedirs(levelsDir)

	merge_filename 		= os.path.join(geojsonDir, "%s_levels.geojson" % scene)
	topojson_filename 	= os.path.join(geojsonDir, "..", "%s_levels.topojson" % scene)
	browse_filename 	= os.path.join(geojsonDir, "..", "%s_browse.tif" % scene)
	subset_filename 	= os.path.join(geojsonDir, "..", "%s_small_browse.tif" % scene)
	osm_bg_image		= os.path.join(geojsonDir, "..", "osm_bg.png")
	sw_osm_image		= os.path.join(geojsonDir, "..", "%s_thn.jpg" % scene)


	levels 				= [144, 89, 55, 34, 21, 13, 8, 5, 3]
	
	# From http://colorbrewer2.org/
	hexColors 			= ["#d73027","#f46d43","#fdae61", "#fee08b", "#ffffbf","#d9ef8b","#a6d96a","#66bd63","#1a9850"]
	
	ds 					= gdal.Open( fullName )
	band				= ds.GetRasterBand(1)
	data				= band.ReadAsArray(0, 0, ds.RasterXSize, ds.RasterYSize )
	
	if force or not os.path.exists(topojson_filename+".gz"):
		for l in levels:
			fileName 		= os.path.join(levelsDir, scene+"_level_%d.tif"%l)
			CreateLevel(l, geojsonDir, fileName, ds, data, "soil_moisture", force,verbose)
	
		jsonDict = dict(type='FeatureCollection', features=[])
	
		for l in reversed(levels):
			fileName 		= os.path.join(geojsonDir, "soil_moisture_level_%d.geojson"%l)
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
		MakeBrowseImage(ds, browse_filename, subset_filename, osm_bg_image, sw_osm_image,levels, hexColors, force, verbose)
		
	ds = None
	
	file_list = [ sw_osm_image, topojson_filename, topojson_filename+".gz", fullName ]
	
	CopyToS3( s3_bucket, s3_folder, file_list, force, verbose )
	
# Main
#  python ef5_sm.py --date 2015-03-20 -v -f

if __name__ == '__main__':
	parser 		= argparse.ArgumentParser(description='EF5 Soil Moisture Processing')
	apg_input 	= parser.add_argument_group('Input')
	
	apg_input.add_argument("-f", "--force", action='store_true', help="forces new product to be generated")
	apg_input.add_argument("-v", "--verbose", action='store_true', help="Verbose Flag")
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
		
	swe_dir		= os.path.join(config.SM_DIR,str(year),doy)
	
	fileName	= "sm.%d%02d%02d.120000" % (year,month,day)
	s3_folder	= os.path.join("sm", str(year), doy)
	s3_bucket	= 'ojo-d6'
	
	process(swe_dir, fileName, s3_bucket, s3_folder)
