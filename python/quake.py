#!/usr/bin/env python
#
# Created on 9/27/2012 Pat Cappelaere - Vightel Corporation
#
# Requirements:
#	gdal, numpy pytrmm...
#
# Access and Process USGS Earthquakes
#
#

import numpy, sys, os, inspect, io
import urllib
import csv
import json

import time
from datetime import date
from dateutil.parser import parse

import browseimage
from browseimage import mapbox_image

# Site configuration
import config
import argparse
from s3 import CopyToS3

from PIL import Image, ImageDraw

force 	= 0
verbose = 0

quakes_urls = [
	{ 	"url": "http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson",
		"geojson": "quakes_2.5_day.geojson"
	},
	{ 	"url": "http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson",
		"geojson": "quakes_2.5_week.geojson"
	},
	{ 	"url": "http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_month.geojson",
		"geojson": "quakes_2.5_month.geojson"
	}
]

def execute( cmd ):
	if verbose:
		print cmd
	os.system(cmd)

def inbbox(bbox, lat, lon):
	if (lon >= bbox[0]) and (lon <= bbox[2]) and (lat >= bbox[1]) and (lat <= bbox[3]):
		return 1
	return 0

def process_url( mydir, url, ymd, bbox, zoom, s3_bucket, s3_folder ):
	orig_filename		= os.path.join(os.path.join(mydir,  "..", "quakes." + ymd + '.geojson'))

	csv_filename		= os.path.join(os.path.join(mydir,  "quakes." + ymd + '.csv'))
	geojson_filename	= os.path.join(os.path.join(mydir,  "quakes." + ymd + '.geojson'))
	geojsongz_filename	= os.path.join(os.path.join(mydir,  "quakes." + ymd + '.geojson.gz'))
	tif_filename		= os.path.join(os.path.join(mydir,  "quakes." + ymd + '.tif'))
	osm_bg_image		= os.path.join(os.path.join(mydir,  "osm_bg_image.tif"))
	thn_image			= os.path.join(os.path.join(mydir,  "quakes." + ymd + '_thn.jpg'))
		
	if force or not os.path.exists(orig_filename):
		if verbose:
			print "retrieving:", orig_filename
		urllib.urlretrieve(url, orig_filename)

	json_data 	= open(orig_filename).read()
	data 		= json.loads(json_data)
	
	results = {}
	results['type'] 	= "FeatureCollection"
	results['bbox'] 	= data['bbox']
	results['metadata'] = data['metadata']
	results['features']	= []
	
	for f in data['features']:
		coords = f['geometry']['coordinates']
		lon		= coords[0]
		lat		= coords[1]
		if inbbox(bbox, lat, lon):
			qtime = int(f['properties']['time'])/1000
			f['properties']['date'] = time.ctime(qtime)
			results['features'].append(f)
			
	print "found", len(results['features'])
	with open(geojson_filename, 'w') as outfile:
	    json.dump(results, outfile)
		
	if force or not os.path.exists(geojsongz_filename):
		cmd = 'gzip < %s > %s' %( geojson_filename, geojsongz_filename)
		execute(cmd)

	centerlat 	= (bbox[1]+bbox[3])/2
	centerlon	= (bbox[0]+bbox[2])/2
	rasterXSize	= 400
	rasterYSize	= 250
	
	mapbox_image(centerlat, centerlon, zoom, rasterXSize, rasterYSize, osm_bg_image)
	
	ullon, ullat, lrlon, lrlat = browseimage.bbox(centerlat, centerlon, zoom, rasterXSize, rasterYSize)
	dx = (lrlon-ullon)/rasterXSize
	dy = (ullat-lrlat)/rasterXSize

	#print "org:", ullon, ullat, dx, dy
	
	im 		= Image.open(osm_bg_image)
	draw 	= ImageDraw.Draw(im)
	for f in results['features']:
		coords = f['geometry']['coordinates']
		lon		= coords[0]
		lat		= coords[1]
		x		= int((lon-ullon)/dx)
		y		= int((ullat-lat)/dx)
		
		#print lon, lat, x, y
		draw.ellipse( [(x-1,y-1),(x+1,y+1)])
	
	im.save(tif_filename, "PNG")
	
	# superimpose the suface water over map background
	#if force or not os.path.isfile(sw_osm_image):	
	if force or not os.path.isfile(thn_image):	
		#cmd = str.format("composite -gravity center {0} {1} {2}", tif_filename, osm_bg_image, thn_image)
		cmd = "cp %s %s" % (tif_filename, thn_image)
		execute(cmd)
		
	file_list = [ geojson_filename, geojsongz_filename, thn_image ]
	CopyToS3( s3_bucket, s3_folder, file_list, force, verbose )
	
#
# ======================================================================
#
if __name__ == '__main__':
	parser 		= argparse.ArgumentParser(description='USGS Quake Processing')
	apg_input 	= parser.add_argument_group('Input')
	apg_input.add_argument("-f", "--force", action='store_true', help="forces new product to be generated")
	apg_input.add_argument("-v", "--verbose", action='store_true', help="Verbose Flag")
	apg_input.add_argument("-r", "--region", 	help="Region")

	options 	= parser.parse_args()
	force		= options.force
	verbose		= options.verbose
	regionName	= options.region
	region		= config.regions[regionName]
	assert(region)
	
	dt			= date.today().strftime("%Y-%m-%d")
	today		= parse(dt)
	
	year		= today.year
	month		= today.month
	day			= today.day
	doy			= today.strftime('%j')
	
	ymd 		= "%d%02d%02d" % (year, month, day)		

	mydir		= os.path.join(config.QUAKES_DIR, str(year),doy, regionName)
	if not os.path.exists(mydir):            
		os.makedirs(mydir)

	s3_folder	= os.path.join("quakes", str(year), doy)
	s3_bucket	= region['bucket']
	bbox		= region['bbox']
	zoom		= region['thn_zoom']
	
	url			= "http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_month.geojson"
	process_url(mydir, url, ymd, bbox, zoom, s3_bucket, s3_folder)