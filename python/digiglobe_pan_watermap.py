#!/usr/bin/env python
#
# Created on 07/11/2014 Pat Cappelaere - Vightel Corporation
#
# Input: WorldView 1 Panchromatic EPSG:4326
# Output: Water map
#

import os, inspect, sys
import argparse

import numpy
import math

from scipy import ndimage
from skimage.filter import sobel, threshold_isodata, threshold_otsu, rank
from skimage.filter.rank import median
from skimage.restoration import denoise_bilateral
from skimage.morphology import binary_opening, disk
from skimage import filter

from osgeo import gdal
from osgeo import osr
from osgeo import ogr
from which import *

import config

force 	= 0
verbose	= 0

class DIGIGLOBE_PAN:
	def __init__( self, scene ):	
		self.scene 				= scene
		arr 					= scene.split("_")
		datestr					= arr[1]
		date					= datestr[0:4]+"-"+datestr[4:6]+"-"+datestr[6:8]
		
		self.outpath			= os.path.join(config.DIGIGLOBE_DIR, datestr, scene)
		self.input_file			= os.path.join(self.outpath, scene+".tif")
		self.output_file		= os.path.join(self.outpath, "output.tif")
		self.pgm_file			= os.path.join(self.outpath, "output.pgm")
		self.bmp_file			= os.path.join(self.outpath, "output.bmp")
		self.geojson_file		= os.path.join(self.outpath, "output.geojson")
		self.topojson_file		= os.path.join(self.outpath, "output.topojson")
		self.surface_water_json	= os.path.join(self.outpath, "surface_water.json")
		self.surface_water_osm	= os.path.join(self.outpath, "surface_water.osm")
		
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
			
		band 		= ds.GetRasterBand(1)
		data 		= band.ReadAsArray(0, 0, ds.RasterXSize, ds.RasterYSize )
		
		mean		= numpy.mean(data)
		minimum		= numpy.min(data)
		
		#threshold 	= (mean+minimum)/2
		threshold 	= mean
		
		print minimum, mean, threshold
		
		data[data>threshold] = 0
		
		thresh2 = threshold_otsu(data, nbins=100)
		print "otsu threshold", thresh2
		
		data[data>thresh2] = 0
				
		#data = denoise_bilateral(data, sigma_range=0.05, sigma_spatial=15)
		#data = binary_opening(data, disk(3))
		data = median(data, disk(3))
			
		data[data>0] = 255
			
		# Compute the Canny filter for two values of sigma
		#edges = filter.canny(data, sigma=3)
		
		
		driver 		= gdal.GetDriverByName( "GTiff" )
		dst_ds 		= driver.Create( self.output_file, RasterXSize, RasterYSize, 1, gdal.GDT_Byte, [ 'INTERLEAVE=PIXEL', 'COMPRESS=DEFLATE' ] )
		band 		= dst_ds.GetRasterBand(1)
		band.WriteArray(data, 0, 0)
		band.SetNoDataValue(0)

		if verbose:
			print "Written", self.output_file
		
		dst_ds = None
		ds = None

		# Convert to PGM
		#cmd = "gdal_translate -q  -scale 0 255 0 65535 " + self.output_file + " -of PNM  "+self.pgm_file
		cmd = "gdal_translate -q  -scale 0 255 0 65535 " + self.output_file + " -of BMP  "+self.bmp_file
		self.execute( cmd )

		#if force or not os.path.exists(self.geojson_file):
		cmd = str.format("potrace -z black -a 1.5 -t 2 -i -b geojson -o {0} {1} -x {2}x{3} -L {4} -B {5} ", self.geojson_file, self.bmp_file, xres, -yres, xorg, ymax ); 
		self.execute(cmd)

		# We need to add a water property
		# This may or may not be nexessary based on styling or multi color requirements
		#cmd = str.format("node add_geojson_props.js {0}", self.geojson_file)
		#self.execute(cmd)
		
		# Convert to Topojson
		cmd = str.format("topojson -o {0} --simplify-proportion 0.5 -- surface_water={1}", self.topojson_file, self.geojson_file); 
		self.execute(cmd)
		
		# Convert back to geojson now that it has been simplified
		cmd = str.format("topojson-geojson --precision 5 -o {0} {1}", self.outpath, self.topojson_file ); 
		self.execute(cmd)
		
		# convert it to OSM to visualize in JOSM and update reference water
		cmd = str.format("node geojson2osm {0}", self.surface_water_json ); 
		self.execute(cmd)
		
		# gzip it
		cmd = str.format("gzip {0} ", self.topojson_file ); 
		self.execute(cmd)
		
		# compress it			
		cmd = "bzip2 " + self.surface_water_osm
		self.execute(cmd)

		cmd = str.format("gzip {0} ", self.surface_water_json ); 
		self.execute(cmd)

#
# digiglobe_pan_watermap.py -v --scene Namibia_20130710
#
if __name__ == '__main__':
	parser = argparse.ArgumentParser(description='Generate Digiglobe Floodmap vectors')
	apg_input = parser.add_argument_group('Input')
	apg_input.add_argument("-f", "--force", 	action='store_true', help="Forces new product to be generated")
	apg_input.add_argument("-v", "--verbose", 	action='store_true', help="Verbose on/off")
	apg_input.add_argument("-s", "--scene", 	help="DFO Scene")
	
	options 	= parser.parse_args()
	force		= options.force
	verbose		= options.verbose
	scene	 	= options.scene
		
	app 		= DIGIGLOBE_PAN(scene)
	
	app.process()