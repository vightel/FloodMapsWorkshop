#!/usr/bin/env python
#
# Created on 07/11/2014 Pat Cappelaere - Vightel Corporation
#
# Input: WorldView 2 RGB EPSG:4326
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
from skimage.exposure import equalize_hist

from osgeo import gdal
from osgeo import osr
from osgeo import ogr
from which import *

import config

force 	= 0
verbose	= 0

class DIGIGLOBE_RGB:
	def __init__( self, scene ):	
		self.scene 				= scene
		arr 					= scene.split("_")
		datestr					= arr[1]
		self.date				= datestr[0:4]+"-"+datestr[4:6]+"-"+datestr[6:8]
		
		self.outpath			= os.path.join(config.DIGIGLOBE_DIR, datestr, scene)
		self.input_file			= os.path.join(self.outpath, scene+".tif")
		self.gray_file			= os.path.join(self.outpath, "output_gray.tif")
		self.output_file		= os.path.join(self.outpath, "output.tif")
		
		self.bmp_file			= os.path.join(self.outpath, "output.bmp")
		self.geojson_file		= os.path.join(self.outpath, "output.geojson")
		self.topojson_file		= os.path.join(self.outpath, "output.topojson")
		self.surface_water_json	= os.path.join(self.outpath, "surface_water.json")
		self.surface_water_osm	= os.path.join(self.outpath, "surface_water.osm")

	def execute( self, cmd ):
		if verbose:
			print cmd
		os.system(cmd)

	# finetuned for greenish water detection
	def gray01( self, red, green, blue, RasterXSize, RasterYSize ):		
		lum			= 0.95 * red + 0.05 * green + 0.05 * blue
		driver 		= gdal.GetDriverByName( "GTiff" )
		dst_ds 		= driver.Create( self.gray_file, RasterXSize, RasterYSize, 1, gdal.GDT_Byte, [ 'INTERLEAVE=PIXEL', 'COMPRESS=DEFLATE' ] )
		band 		= dst_ds.GetRasterBand(1)
		band.WriteArray(lum, 0, 0)
		band.SetNoDataValue(0)
		dst_ds 		= None
		print "Written", self.gray_file
		return lum

	# finetuned for blueish water detection
	def gray1( self, red, green, blue, RasterXSize, RasterYSize ):		
		lum			= 0.95 * red + 0.01 * green #+ 0.0 * blue
		driver 		= gdal.GetDriverByName( "GTiff" )
		dst_ds 		= driver.Create( self.gray_file, RasterXSize, RasterYSize, 1, gdal.GDT_Byte, [ 'INTERLEAVE=PIXEL', 'COMPRESS=DEFLATE' ] )
		band 		= dst_ds.GetRasterBand(1)
		band.WriteArray(lum, 0, 0)
		band.SetNoDataValue(0)
		dst_ds 		= None
		print "Written", self.gray_file
		return lum
	
	# http://en.wikipedia.org/wiki/Relative_luminance
	def rgb2gray( self, red, green, blue, RasterXSize, RasterYSize ):		
		lum			= 0.2126 * red + 0.7152 * green + 0.0722 * blue
		
		#driver 		= gdal.GetDriverByName( "GTiff" )
		#dst_ds 		= driver.Create( self.output_file2, RasterXSize, RasterYSize, 1, gdal.GDT_Byte, [ 'INTERLEAVE=PIXEL', 'COMPRESS=DEFLATE' ] )
		#band 		= dst_ds.GetRasterBand(1)
		#band.WriteArray(lum, 0, 0)
		#band.SetNoDataValue(0)
		#dst_ds 		= None
		#print "Written", self.output_file2
		return lum
	
		
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
			
		print "Read red"
		rb 		= ds.GetRasterBand(1)
		red 	= (rb.ReadAsArray(0, 0, ds.RasterXSize, ds.RasterYSize )).astype(float)

		print "Read green"
		gb 		= ds.GetRasterBand(2)
		green 	= (gb.ReadAsArray(0, 0, ds.RasterXSize, ds.RasterYSize )).astype(float)

		print "Read blue"
		bb 		= ds.GetRasterBand(3)
		blue 	= (bb.ReadAsArray(0, 0, ds.RasterXSize, ds.RasterYSize )).astype(float)
		
		data 	= self.gray1(red, green, blue, RasterXSize, RasterYSize)
		#data 	= self.rgb2gray(red, green, blue, RasterXSize, RasterYSize)
		
		#data 		= equalize_hist(data)
		#data *= 255.0

		mean		= numpy.mean(data)
		minimum		= numpy.min(data)
		maximum		= numpy.max(data)
		
		#threshold 	= mean		
		print minimum, mean, maximum
		
		#threshold = mean
		
		#data = equalize_hist(data)
		#data *= 255
		#print numpy.min(data), numpy.mean(data), numpy.max(data)
		
		#data[data>threshold] = 0
		
		thresh2 = threshold_otsu(data, nbins=100)
		print "otsu threshold", thresh2
		data[data>thresh2] 	= 0
		
		data[data>0] 		= 1
		
		print "de-speckle..."
		data = median(data.astype(numpy.uint8), disk(3))
		print "Write data..."
		
		data[data>0] 		= 255
		
		driver 		= gdal.GetDriverByName( "GTiff" )
		dst_ds 		= driver.Create( self.output_file, RasterXSize, RasterYSize, 1, gdal.GDT_Byte, [ 'INTERLEAVE=PIXEL', 'COMPRESS=DEFLATE' ] )
		band 		= dst_ds.GetRasterBand(1)
		band.WriteArray(data.astype(int), 0, 0)
		band.SetNoDataValue(0)
		
		dst_ds 		= None
		ds 			= None
		
		# Convert to BMP
		cmd = "gdal_translate -q  -scale 0 255 0 65535 " + self.output_file + " -of BMP  "+self.bmp_file
		self.execute( cmd )
		sys.exit(0)
		
		#if force or not os.path.exists(self.geojson_file):
		cmd = str.format("potrace -z black -a 1.5 -t 2 -i -b geojson -o {0} {1} -x {2}x{3} -L {4} -B {5} ", self.geojson_file, self.bmp_file, xres, -yres, xorg, ymax ); 
		self.execute(cmd)

		# We need to add a water property
		# This may or may not be necessary based on styling or multi color requirements
		#cmd = str.format("node add_geojson_props.js {0}", self.geojson_file)
		#self.execute(cmd)
		
		# Convert to Topojson
		cmd = str.format("topojson -o {0} --simplify-proportion 0.5 -- surface_water={1}", self.topojson_file, self.geojson_file); 
		self.execute(cmd)
		
		# Convert back to geojson now that it has been simplified
		cmd = str.format("topojson-geojson --precision 5 -o {0} {1}", self.outpath, self.topojson_file ); 
		self.execute(cmd)
		
		# convert it to OSM to visualize in JOSM and update reference water
		data_source = "WorldView-2"
		cmd = str.format("node geojson2osm {0} {1}", self.surface_water_json, data_source ); 
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
# Resample first at 5m
# 	gdal_merge.py -ps 0.000045 0.000045 -o kavango_20140801.tif kavango_20140801_R1C1.tif kavango_20140801_R1C2.tif kavango_20140801_R1C3.tif
#
# digiglobe_rgb_watermap.py -v --scene kavango_20140801
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
		
	app 		= DIGIGLOBE_RGB(scene)
	
	app.process()