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
import scipy
import math

from scipy import ndimage

from osgeo import gdal
from osgeo import osr
from osgeo import ogr
from which import *

import config
import colorsys

force 	= 0
verbose	= 0

class Landsat8:
	def __init__( self, outpath, scene, rgb ):	
		
		self.rgb_file			= os.path.join(outpath, rgb)
		self.pan_file			= os.path.join(outpath, scene + "_B8_4326.tif")
		self.output_file		= os.path.join(outpath, rgb + ".PS_HSV.TIF")
			
	def linear_stretch(self, data):
		# clip bottom and top 2 percent of the points
		zeroes = (data == 0)
		data
		max_cut = numpy.percentile(data, 98)
		
		# we need to move the Zeroes out of the way to find the bottom 2%
		data[zeroes] = max_cut
		min_cut = numpy.percentile(data, 2)
		data[zeroes] = 0
		
		data = scipy.misc.bytescale(data, min_cut, max_cut)
		return data
					 
	def process(self):
		if verbose:
			print "Opening Pan", self.pan_file
		pan_ds = gdal.Open( self.pan_file )
		if pan_ds is None:
			print('ERROR: file no pan data:')
			sys.exit(-1)
		pan_band 	= pan_ds.GetRasterBand(1)
		pan_data 	= self.linear_stretch(pan_band.ReadAsArray(0, 0, pan_ds.RasterXSize, pan_ds.RasterYSize ))

		if verbose:
			print "Opening RGB", self.rgb_file
			
		ds = gdal.Open( self.rgb_file )
		if ds is None:
			print('ERROR: file no data:')
			sys.exit(-1)

		if verbose:
			print "Read red band"			
		red_band 	= ds.GetRasterBand(1)
		red_data 	= red_band.ReadAsArray(0, 0, ds.RasterXSize, ds.RasterYSize )

		if verbose:
			print "Read green band"
		green_band 	= ds.GetRasterBand(2)
		green_data 	= green_band.ReadAsArray(0, 0, ds.RasterXSize, ds.RasterYSize )

		if verbose:
			print "Read blue band"
		blue_band 	= ds.GetRasterBand(3)
		blue_data 	= blue_band.ReadAsArray(0, 0, ds.RasterXSize, ds.RasterYSize )

		# Change RGB to HSV
		
		RasterXSize = ds.RasterXSize
		RasterYSize = ds.RasterYSize
		RasterCount = ds.RasterCount
		
		driver 		= gdal.GetDriverByName( "GTiff" )
		dst_ds 		= driver.Create( self.output_file, RasterXSize, RasterYSize, 3, gdal.GDT_Byte, [ 'INTERLEAVE=PIXEL', 'COMPRESS=DEFLATE' ] )
		
		rgb_to_hsv 	= numpy.vectorize(colorsys.rgb_to_hsv)
		hsv_to_rgb 	= numpy.vectorize(colorsys.hsv_to_rgb)
		
		if verbose:
			print "change to HSV"
		h,s,v 		= rgb_to_hsv(red_data, green_data, blue_data)

		if verbose:
			print "change to RGB wiht PAN"

		r,g,b 		= hsv_to_rgb(h,s,pan_data)
		
		if verbose:
			print "write red band"
			
		dst_ds.GetRasterBand(1).WriteArray(r, 0, 0)
		dst_ds.GetRasterBand(1).SetNoDataValue(0)
		
		if verbose:
			print "write green band"
		dst_ds.GetRasterBand(2).WriteArray(g, 0, 0)
		dst_ds.GetRasterBand(2).SetNoDataValue(0)
		
		dst_ds.GetRasterBand(3).WriteArray(b, 0, 0)
		if verbose:
			print "write blue band"
		dst_ds.GetRasterBand(3).SetNoDataValue(0)
		
		dst_ds 	= None
		ds		= None

		if verbose:
			print "written", self.output_file
		
if __name__ == '__main__':

	parser = argparse.ArgumentParser(description='Generate Landsat8 Floodmap vectors')
	apg_input = parser.add_argument_group('Input')
	apg_input.add_argument("-f", "--force", 		action='store_true', help="Forces new product to be generated")
	apg_input.add_argument("-v", "--verbose", 		action='store_true', help="Verbose on/off")
	apg_input.add_argument("-s", "--scene", 		help="Landsat Scene")
	apg_input.add_argument("-rgb", "--rgb", 	help="Landsat RGB")
	
	options 	= parser.parse_args()
	force		= options.force
	verbose		= options.verbose
	scene	 	= options.scene
	
	rgb	 		= options.rgb

	outdir		= os.path.join(config.LANDSAT8_DIR,scene)	

	app 		= Landsat8(outdir, scene, rgb)

	app.process()