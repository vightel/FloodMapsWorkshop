#!/usr/bin/env python
#
# Created on 6/28/2013 Pat Cappelaere - Vightel Corporation
# 
# Requirements:
#	gdal...
#
# GeoJSON output of OSM Water Reference
#

import os, inspect
import argparse

import sys, urllib, httplib
from datetime import datetime
from pprint import pprint
import math
import numpy
import mapnik

from osgeo import gdal
from osgeo import osr
from osgeo import ogr

def generate_geojson(filename, ll, dx, dy, res, verbose, force):
	png_file 		= filename + ".png"
	pgm_file 		= filename + ".pgm"
	geojson_file 	= filename + ".geojson"
	topojson_file 	= filename + ".topojson"
	topojson_tgz_file 	= filename + ".topojson.tgz"
	
	# convert black to transparent
	if force or not os.path.isfile(pgm_file):
		cmd = "convert "+png_file+" "+pgm_file
		if verbose:
			print(cmd)
		os.system(cmd)
	
	if force or not os.path.isfile(geojson_file):
		cmd = str.format("potrace -z black -a 1.5 -t 1 -i -b geojson -o {0} {1} -x {2} -L {3} -B {4} ", 
		geojson_file, pgm_file, res, xorg, ymax ); 
		if verbose:
			print(cmd)
		os.system(cmd)
	
	
def generate_image(xml, filename, ext, ftype, ll, dx, dy, res, verbose, force):
	print "generate_image:", xml, filename
	mapfile 	= xml
	
	merc 		= "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs +over"
	latlon		= "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs"
	
	m 			= mapnik.Map(dx, dy)
	
	mapnik.load_map(m, mapfile)
	
	# Override projection defined in mapfile    
	m.srs 	= latlon
	#m.srs 	= merc
	
	# Calculate projected boundaries
	prj 	= mapnik.Projection(m.srs)
	c0 		= prj.forward(mapnik.Coord(ll[0], ll[1]))
	c1 		= prj.forward(mapnik.Coord(ll[2], ll[3]))

	# Apply bounding box
	bbox 	= mapnik.Envelope(c0.x, c0.y, c1.x, c1.y)
	m.zoom_to_box(bbox)

	# Render image
	im 		= mapnik.Image(dx, dy)
	mapnik.render(m, im)
	
	view 	= im.view(0, 0, dx, dy)

	png_file = filename + ext	#".png"
	
	if force or not os.path.isfile(png_file):
		if verbose:
			print( "saving "+ png_file)
		view.save(png_file, ftype)
	
	
# Main
#  geojson_osm.py --bbox 20.0 -20.0 30.00 -10.00 --img 4551 4551 --res 0.00219726562502 --dir . -v

if __name__ == '__main__':
	version_num = int(gdal.VersionInfo('VERSION_NUM'))
	if version_num < 1800: # because of GetGeoTransform(can_return_null)
		print('ERROR: Python bindings of GDAL 1.8.0 or later required')
		sys.exit(1)

	parser = argparse.ArgumentParser(description='GEOJSON OSM Processing')
	
	apg_input = parser.add_argument_group('Input')
	apg_input.add_argument("-f", "--force", action='store_true', help="forces new water image to be generated")
	apg_input.add_argument("-v", "--verbose", action='store_true', help="Verbose Flag")
	apg_input.add_argument("-b", "--bbox", nargs=4, type=float, metavar=('X1', 'Y1', 'X2', 'Y2'), help="generate tiles inside a bounding box")
	apg_input.add_argument("-i", "--img", nargs=2, type=int, metavar=('dx','dy'), help="output image size in pixels")
	apg_input.add_argument("--dir", help='directory for outputfile', default='image.png')
	apg_input.add_argument("-r", "--res", help='pixel resolution')

	options 	= parser.parse_args()

	force		= options.force
	verbose		= options.verbose
	ll	 		= options.bbox
	img			= options.img
	dir			= options.dir
	res			= options.res

	start 		= datetime.now()

	dx 			= img[0]
	dy			= img[1]
	xorg		= ll[0]
	ymax		= ll[1]

	cwd = os.path.dirname(sys.argv[0])

	osm_coastal_water 			= os.path.join(dir, "osm_coastal")		
	osm_surface_water 			= os.path.join(dir, "osm_water")	
	osm_marshes 				= os.path.join(dir, "osm_marshes")
	osm_layers	 				= os.path.join(dir, "osm_layers.topojson")
	osm_layers_gz	 			= os.path.join(dir, "osm_layers.topojson.gz")

	if force or not os.path.isfile(osm_coastal_water+".png"):
		generate_image(	os.path.join(cwd,"water_coastal_only_4326.xml"), osm_coastal_water, ".png", "png8", ll, dx, dy, res, verbose, force)

	if force or not os.path.isfile(osm_coastal_water+".tif"):
		cmd = str.format("convert {0} -threshold 10 {1}", osm_coastal_water+".png", osm_coastal_water+".tif")
		if verbose:
			print(cmd)
		os.system(cmd)
	
	if force or not os.path.isfile(osm_surface_water+".png"):
		generate_image(	os.path.join(cwd,"water_only_4326.xml"), osm_surface_water, ".png", "png8:z=9", ll, dx, dy, res, verbose, force)

	if force or not os.path.isfile(osm_surface_water+".geojson"):
		generate_geojson(	osm_surface_water, 		ll, dx, dy, res, verbose, force)
	
	if force or not os.path.isfile(osm_marshes+".png"):
		generate_image(	os.path.join(cwd,"watershed_marshes_4326.xml"), osm_marshes, ".png", "png8:z=9", ll, dx, dy, res, verbose, force)

	if force or not os.path.isfile(osm_marshes+".tif"):
		cmd = str.format("convert {0} -threshold 10 {1}", osm_marshes+".png", osm_marshes+".tif")
		if verbose:
			print(cmd)
		os.system(cmd)

	if force or not os.path.isfile(osm_marshes+".geojson"):
		generate_geojson( 	osm_marshes, 		ll, dx, dy, res, verbose, force)
		
	if force or not os.path.isfile(osm_layers):
		cmd = str.format("topojson {0} {1} -o {2} ", osm_surface_water+".geojson", osm_marshes+".geojson", osm_layers); 
		if verbose:
			print(cmd)
		os.system(cmd)
		
	if force or not os.path.exists(osm_layers_gz):
		cmd = str.format("gzip {0} ", osm_layers ); 
		print(cmd)
		os.system(cmd)
	
	end = datetime.now()
	
	if verbose:	
		print str(end), "Done.", end-start