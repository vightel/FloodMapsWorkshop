#!/usr/bin/env python
#
# Created on 07/11/2014 Pat Cappelaere - Vightel Corporation
#
# Input: Landsat8 Atmospherically Corrected GeoTiff EPSG:4326
# Output: Water map
#

import os, inspect, sys
import argparse

import numpy
import math

from scipy import ndimage

from osgeo import gdal
from osgeo import osr
from osgeo import ogr
from which import *

import config

force 	= 0
verbose	= 0

class DFO:
	def __init__( self, scene ):	
		self.scene 			= scene
		
		self.dir			= scene[len(scene)-4:]
		self.outpath		= os.path.join(config.DFO_DIR, self.dir)
		self.input_file		= os.path.join(config.DFO_DIR, self.dir, scene+".tif")
		self.output_file	= os.path.join(config.DFO_DIR, self.dir, "watermap.tif")
		self.pgm_file		= os.path.join(config.DFO_DIR, self.dir, "watermap.pgm")
		self.geojson_file	= os.path.join(config.DFO_DIR, self.dir, "watermap.geojson")
		self.topojson_file	= os.path.join(config.DFO_DIR, self.dir, "watermap.topojson")
		
		self.osm_file			= os.path.join(self.outpath, "surface_water.osm")
		self.surface_water_json	= os.path.join(self.outpath, "surface_water.json")

		if verbose:
			print self.input_file
			
	def execute( self, cmd ):
		if verbose:
			print cmd
		os.system(cmd)
	
	def process(self):
		if verbose:
			print "Opening", self.input_file
			
		ds = gdal.Open( self.input_file )
		if ds is None:
			print('ERROR: file no data:')
			sys.exit(-1)

		RasterXSize = ds.RasterXSize
		RasterYSize = ds.RasterYSize
		RasterCount = ds.RasterCount
		
		projection  = ds.GetProjection()
		geotransform= ds.GetGeoTransform()

		print geotransform
		
		xorg		= geotransform[0]
		yorg  		= geotransform[3]
		
		xres		= geotransform[1]
		yres		= geotransform[5]
		
		xmax		= xorg + geotransform[1]* RasterXSize
		ymax		= yorg + geotransform[5]* RasterYSize

		if verbose:
			print "size", RasterXSize, RasterYSize, RasterCount
			print "xorg", xorg, "yorg", yorg
			print "xmax", xmax, "ymax", ymax
		
		driver 		= gdal.GetDriverByName( "GTiff" )
		dst_ds 		= driver.Create( self.output_file, RasterXSize, RasterYSize, 1, gdal.GDT_Byte, [ 'INTERLEAVE=PIXEL', 'COMPRESS=DEFLATE' ] )
		band 		= dst_ds.GetRasterBand(1)
		output_data = band.ReadAsArray(0, 0, dst_ds.RasterXSize, ds.RasterYSize )
		
		red_band 	= ds.GetRasterBand(1)
		red_data 	= red_band.ReadAsArray(0, 0, ds.RasterXSize, ds.RasterYSize )

		green_band 	= ds.GetRasterBand(2)
		green_data 	= green_band.ReadAsArray(0, 0, ds.RasterXSize, ds.RasterYSize )

		blue_band 	= ds.GetRasterBand(3)
		blue_data 	= blue_band.ReadAsArray(0, 0, ds.RasterXSize, ds.RasterYSize )
		
		red_mask 	= (red_data == 255)
		green_mask 	= (green_data < 255)
		blue_mask	= (blue_data < 255)
		 
		#output_data[ red_mask & blue_mask & green_mask] = 1
		output_data[ blue_mask & green_mask] = 1
		
		dst_ds.SetGeoTransform( geotransform )
		dst_ds.SetProjection( projection )

		ct = gdal.ColorTable()

		ct.SetColorEntry( 0, (0, 0, 0, 255) )
		ct.SetColorEntry( 1, (255, 255, 255, 255) )
		
		band.SetRasterColorTable(ct)
		band.WriteArray(output_data, 0, 0)
		band.SetNoDataValue(0)
		
		dst_ds 	= None
		ds 		= None

		cmd = "rm watermap.* surface_water.*"
		self.execute( cmd )

		# Convert to PGM
		cmd = "gdal_translate  -q -scale 0 1 0 65535 " + self.output_file + " -b 1 -of PNM -ot Byte "+self.pgm_file
		self.execute( cmd )

		#if force or not os.path.exists(self.geojson_file):
		cmd = str.format("potrace -z black -a 1.5 -t 2 -i -b geojson -o {0} {1} -x {2}x{3} -L {4} -B {5} ", self.geojson_file, self.pgm_file, xres, -yres, xorg, ymax ); 
		self.execute(cmd)

		# We need to add a water property
		# This may or may not be nexessary based on styling or multi color requirements
		cmd = str.format("node add_geojson_props.js {0}", self.geojson_file)
		self.execute(cmd)
		
		# Convert to Topojson
		cmd = str.format("topojson -o {0} -p --simplify-proportion 0.5 -- surface_water={1}", self.topojson_file, self.geojson_file); 
		self.execute(cmd)
		
		# Convert back to geojson now that it has been simplified
		cmd = str.format("topojson-geojson --precision 5 -o {0} {1}", self.outpath, self.topojson_file ); 
		self.execute(cmd)
		
		# convert it to OSM to visualize in JOSM and update reference water
		data_source = "dfo"
		cmd = str.format("node geojson2osm {0} {1}", self.surface_water_json, data_source ); 
		self.execute(cmd)
			
		# gzip topojson
		cmd = str.format("tar -zcvf {0} {1} ", self.topojson_file+".gz", self.topojson_file ); 
		self.execute(cmd)
			
		# compress OSM to bz2			
		cmd = str.format("tar -jcvf {0} {1}", self.osm_file+".bz2", self.osm_file)
		self.execute(cmd)
	
		# gzip geojson
		cmd = str.format("tar -zcvf {0} {1} ", self.surface_water_json+".gz", self.surface_water_json ); 
		self.execute(cmd)

#
# dfo_watermap.py -v --scene 2014Bangladesh4178
#
if __name__ == '__main__':
	version_num = int(gdal.VersionInfo('VERSION_NUM'))
	if version_num < 1800: # because of GetGeoTransform(can_return_null)
		print('ERROR: Python bindings of GDAL 1.8.0 or later required')
		sys.exit(1)

	err = which("tar")
	if err == None:
		print "tar missing"
		sys.exit(-1)

	err = which("potrace")
	if err == None:
		print "potrace missing"
		sys.exit(-1)

	err = which("topojson")
	if err == None:
		print "topojson missing"
		sys.exit(-1)
		
	parser = argparse.ArgumentParser(description='Generate Landsat8 Floodmap vectors')
	apg_input = parser.add_argument_group('Input')
	apg_input.add_argument("-f", "--force", 	action='store_true', help="Forces new product to be generated")
	apg_input.add_argument("-v", "--verbose", 	action='store_true', help="Verbose on/off")
	apg_input.add_argument("-s", "--scene", 	help="Landsat Scene")
	
	options 	= parser.parse_args()
	force		= options.force
	verbose		= options.verbose
	scene	 	= options.scene
		
	app 		= DFO(scene)
	
	app.process()