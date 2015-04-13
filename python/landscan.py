#!/usr/bin/env python
#
# Created on 7/5/2013 Pat Cappelaere - Vightel Corporation
# 
# Requirements:
#	gdal...
#
# Requires 2011 LandScan EPSG:4326
# cd [ls]/LandScan-2011/ArcGIS/Population
# gdalwarp lspop2011 -t_srs EPSG:4326 -of GTIFF lspop2011_4326.tif
#

import os, inspect
import argparse

from osgeo import gdal
from osgeo import osr
from osgeo import ogr

import config
import json

from browseimage import MakeBrowseImage 
from s3 import CopyToS3
from level import CreateLevel

force 		= 0
verbose 	= 0

BASE_DIR 	= config.LS_DIR

def execute( cmd ):
	if verbose:
		print cmd
	os.system(cmd)
	
def process(mydir, lsFile, region, s3_bucket, s3_folder):
	scene			= config.REGION['name']
	subsetFileName	= os.path.join(mydir, "ls.2011_subset.tif")
	if force or not os.path.exists(subsetFileName):
		bbox 			= config.REGION['bbox']
		warpOptions 	= "-q -overwrite -co COMPRESS=DEFLATE -t_srs EPSG:4326 -te %s %s %s %s " % (bbox[0], bbox[1], bbox[2], bbox[3])
		warpCmd 		= 'gdalwarp ' + warpOptions + lsFile + ' ' + subsetFileName
		execute( warpCmd )
		if verbose:
			print "LS Subset", subsetFileName

	if verbose:
		print "Processing", subsetFileName
		
	geojsonDir	= os.path.join(mydir,"geojson")
	if not os.path.exists(geojsonDir):            
		os.makedirs(geojsonDir)

	levelsDir	= os.path.join(mydir,"levels")
	if not os.path.exists(levelsDir):            
		os.makedirs(levelsDir)
	
	merge_filename 		= os.path.join(geojsonDir, "%s_levels.geojson" % scene)
	
	topojson_filename 	= os.path.join(geojsonDir, "..", "ls.2011.topojson" )
	browse_filename 	= os.path.join(geojsonDir, "..", "ls.2011_browse.tif" )
	subset_filename 	= os.path.join(geojsonDir, "..", "ls.2011_small_browse.tif" )
	osm_bg_image		= os.path.join(geojsonDir, "..", "osm_bg.png")
	sw_osm_image		= os.path.join(geojsonDir, "..", "ls.2011_thn.jpg" )

	levels 				= [ 55000, 34000, 21000, 13000, 8000, 5000, 3000, 2000, 1000 ]
	
	# From http://colorbrewer2.org/	
	hexColors 			= [	"#f7f4f9", "#e7e1ef", "#d4b9da", "#c994c7", "#df65b0", "#e7298a", "#ce1256", "#980043", "#67001f"]
	
	ds 					= gdal.Open( subsetFileName )
	band				= ds.GetRasterBand(1)
	data				= band.ReadAsArray(0, 0, ds.RasterXSize, ds.RasterYSize )
	
	if force or not os.path.exists(topojson_filename+".gz"):
		for l in levels:
			fileName 		= os.path.join(levelsDir, scene+"_level_%d.tif"%l)
			CreateLevel(l, geojsonDir, fileName, ds, data, "population", force,verbose)
	
		jsonDict = dict(type='FeatureCollection', features=[])
	
		for l in reversed(levels):
			fileName 		= os.path.join(geojsonDir, "population_level_%d.geojson"%l)
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
	
	file_list = [ sw_osm_image, topojson_filename, topojson_filename+".gz", subsetFileName ]
	
	CopyToS3( s3_bucket, s3_folder, file_list, force, verbose )
	
# python landscan.py -v
if __name__ == '__main__':
	version_num = int(gdal.VersionInfo('VERSION_NUM'))
	if version_num < 1800: # because of GetGeoTransform(can_return_null)
		print('ERROR: Python bindings of GDAL 1.8.0 or later required')
		sys.exit(1)

	parser 		= argparse.ArgumentParser(description='Generate Population Density')
	apg_input 	= parser.add_argument_group('Input')
	apg_input.add_argument("-f", "--force", action='store_true', help="forces new product to be generated")
	apg_input.add_argument("-v", "--verbose", action='store_true', help="Verbose on/off")

	options 	= parser.parse_args()
	force		= options.force
	verbose		= options.verbose

	# Landscan directory
	lsFile		= "/Volumes/MacBay3/GeoData/ls/LandScan-2011/ArcGIS/Population/lspop2011_4326.tif"
	region		= config.REGION
	year		= 2011
	s3_folder	= os.path.join("ls", str(year))
	s3_bucket	= 'ojo-d6'

	if not os.path.exists(lsFile):
		print "Landscan file does not exist", lsFile
		sys.exit(-1)
		
	ls_dir	= os.path.join(BASE_DIR,str(year))
	if not os.path.exists(ls_dir):
	    os.makedirs(ls_dir)

	process(ls_dir, lsFile, region, s3_bucket, s3_folder)