#!/usr/bin/env python
#
# Created on 07/11/2014 Pat Cappelaere - Vightel Corporation
#
# Input: EO-1 GeoTiff L1T
# Output: Radiance or TOA RGB COMPOSITE EPSG:4326
#

import os, inspect, sys
import argparse

import numpy
import scipy
import math, time

from scipy import ndimage

from osgeo import gdal
from osgeo import osr
from osgeo import ogr
from which import *

from eo1_ali_l1t import EO1_ALI_L1T

import config

force 	= 0
verbose	= 0
mode	= "dn"
			
if __name__ == '__main__':

	parser = argparse.ArgumentParser(description='Generate EO-1 RGB Composite vectors')
	apg_input = parser.add_argument_group('Input')
	apg_input.add_argument("-f", "--force", 	action='store_true', help="Forces new product to be generated")
	apg_input.add_argument("-v", "--verbose", 	action='store_true', help="Verbose on/off")
	apg_input.add_argument("-s", "--scene", 	required=True, help="EO-1 Scene")
	apg_input.add_argument("-r", "--red", 		required=True, help="EO-1 red")
	apg_input.add_argument("-g", "--green", 	required=True, help="EO-1 green")
	apg_input.add_argument("-b", "--blue", 		required=True, help="EO-1 blue")
	apg_input.add_argument("-m", "--mode", 		help="radiance|toa|dn")

	options 			= parser.parse_args()
	force				= options.force
	verbose				= options.verbose
	scene	 			= options.scene
	mode	 			= options.mode or 'dn'
	
	red	 				= int(options.red)
	green	 			= int(options.green)
	blue	 			= int(options.blue)

	outdir				= os.path.join(config.EO1_DIR,scene)	
	scene	 			= options.scene.split("_")[0]
	
	if (mode != 'radiance') and (mode != 'toa') and (mode != 'dn'): 
		print "invalid mode", mode
		sys.exit(-1)
	
	output_file 		= os.path.join(outdir, "COMPOSITE_"+options.red+options.green+options.blue+".tif")
	output_file_4326 	= os.path.join(outdir, "COMPOSITE_"+options.red+options.green+options.blue+"_4326.tif")
	
	if mode != 'dn':
		output_file 		= os.path.join(outdir, "COMPOSITE_"+options.red+options.green+options.blue+"_"+mode+".tif")
		output_file_4326 	= os.path.join(outdir, "COMPOSITE_"+options.red+options.green+options.blue+"_"+mode+"_4326.tif")
		
	app 				= EO1_ALI_L1T(outdir, scene, verbose )

	# Get DN
	red_data			= app.get_band_data(red)
	
	if mode == 'radiance':
		red_data		= app.radiance(red, red_data)

	if mode == 'toa':
		red_radiance	= app.radiance(red, red_data)
		red_data		= app.toa(red, red_radiance)
		
	red_data			= app.linear_stretch(red_data)
	
	green_data		 	= app.get_band_data(green)		

	if mode == 'radiance':
		green_data		= app.radiance(green, green_data)

	if mode == 'toa':
		green_radiance	= app.radiance(green, green_data)
		green_data		= app.toa(green, green_radiance)
	
	green_data			= app.linear_stretch(green_data)

	blue_data 			= app.get_band_data(blue)

	if mode == 'radiance':
		blue_data			= app.radiance(blue, blue_data)

	if mode == 'toa':
		blue_radiance	= app.radiance(blue, blue_data)
		blue_data		= app.toa(blue, blue_radiance)
	
	blue_data			= app.linear_stretch(blue_data)
	
	driver 				= gdal.GetDriverByName( "GTiff" )
	dst_ds 				= driver.Create( output_file, app.RasterXSize, app.RasterYSize, 4, gdal.GDT_Byte, [ 'INTERLEAVE=PIXEL', 'COMPRESS=DEFLATE' ] )

	dst_ds.GetRasterBand(1).WriteArray(red_data, 0, 0)
	dst_ds.GetRasterBand(2).WriteArray(green_data, 0, 0)
	dst_ds.GetRasterBand(3).WriteArray(blue_data, 0, 0)
		
	alpha_band			= dst_ds.GetRasterBand(4)
	alpha_data 			= alpha_band.ReadAsArray(0, 0, app.RasterXSize, app.RasterYSize )

	alpha_data[blue_data>0]		= 255
	alpha_data[red_data>0]		= 255
	alpha_data[green_data>0]	= 255

	alpha_data[red_data == 0]	= 0
	alpha_data[green_data == 0]	= 0
	alpha_data[blue_data == 0]	= 0
	
	alpha_band.WriteArray(alpha_data, 0, 0)
	
	dst_ds.SetGeoTransform( app.geotransform )
	dst_ds.SetProjection( app.projection )

	dst_ds 	= None

	app.reproject( "EPSG:4326", output_file, output_file_4326)
	
	if verbose:
		print "done. Saved", output_file_4326