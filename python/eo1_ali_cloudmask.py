#!/usr/bin/env python
#
# Created on 07/11/2014 Pat Cappelaere - Vightel Corporation
# http://eo1.gsfc.nasa.gov/new/extended/sensorweb/eo-1_validation%20on-board%20cloud%20assessment_rpt.pdf
#
# Input: EO-1 GeoTiff L1T
# Output: EO1 ALI Cloudmask
#

import os, inspect, sys
import argparse

import numpy
import scipy
import math, time

from eo1_ali_l1t import EO1_ALI_L1T

from scipy import ndimage

from osgeo import gdal
from osgeo import osr
from osgeo import ogr
from which import *

import config

force 	= 0
verbose	= 0


if __name__ == '__main__':

	parser = argparse.ArgumentParser(description='Generate EO-1 ALI Cloud Mask')
	apg_input = parser.add_argument_group('Input')
	apg_input.add_argument("-f", "--force", 	action='store_true', help="Forces new product to be generated")
	apg_input.add_argument("-v", "--verbose", 	action='store_true', help="Verbose on/off")
	apg_input.add_argument("-s", "--scene", 	help="EO-1 Scene")
	

	options 			= parser.parse_args()
	force				= options.force
	verbose				= options.verbose
	scene	 			= options.scene

	outdir				= os.path.join(config.EO1_DIR,scene)	
	scene	 			= options.scene.split("_")[0]
	output_file 		= "cloud_mask.tif"
	output_file_4326 	= os.path.join(outdir, "cloud_mask_4326.tif")
	
	app 				= EO1_ALI_L1T(outdir, options.scene, verbose )

	epsilon				= 0.0001

	#if verbose:
	#	print "Process B2"
	b2_dn 			= app.get_band_data(2)
	b2_radiance 	= app.radiance(2, b2_dn)
	#b2_radiance 	= app.get_band_data(2)
	b2_toa 			= app.toa(2, b2_radiance)
	if verbose:
		print 'b2_toa', numpy.min(b2_toa), numpy.mean(b2_toa), numpy.max(b2_toa)
	
	
	#if verbose:
	#	print "Process B3"
	b3_dn 			= app.get_band_data(3)
	##b3_radiance 	= app.radiance(3, b3_dn)
	#b3_toa 			= app.toa(3, b3_radiance)

	#ac_index 		= (b2_radiance-b3_radiance)/(epsilon+b2_radiance+b3_radiance)
	
	#app.write_data( app.linear_stretch(ac_index), "ac_index.tif", gdal.GDT_Byte, 1, 0)
	
	
	if verbose:
		print "Process B5"
	b5_dn 			= app.get_band_data(5)
	b5_radiance 	= app.radiance(5, b5_dn)
	#b5_radiance 	= app.get_band_data(5)
	b5_toa 			= app.toa(5, b5_radiance)
	 
	if verbose:
		print "Process B7"
		
	b7_dn  			= app.get_band_data(7)
	b7_radiance 	= app.radiance(7, b7_dn)
	#b7_radiance 	= app.get_band_data(7)
	b7_toa 			= app.toa(7, b7_radiance)

	if verbose:
		print "Process B8"
		
	b8_dn  			= app.get_band_data(8)
	b8_radiance 	= app.radiance(8, b8_dn)
	#b8_radiance 	= app.get_band_data(8)
	b8_toa 			= app.toa(8, b8_radiance)

	visnir_ratio	= b5_toa / b7_toa		# Red/NIR
	
	#if verbose:
	#	print 'visnir_ratio', numpy.min(visnir_ratio), numpy.mean(visnir_ratio), numpy.max(visnir_ratio)

	#ls_visnir_ratio 		= app.linear_stretch(visnir_ratio)
	#app.write_data( ls_visnir_ratio, "ls_visnir_ratio.tif", gdal.GDT_Byte, 1, 0)
	
	#ls_visnir_ratio[veg_ratio<1] = 0
	#ls_visnir_ratio[b5_dn ==0] = 0
	#ls_visnir_ratio[b7_dn ==0] = 0
	#ls_visnir_ratio[veg_ratio>=0.7] = 1
	
	#app.write_data( ls_veg_ratio, "veg_ratio.tif", gdal.GDT_Byte, 1, 1)
	#app.write_data( ls_veg_ratio, "veg_ratio.tif", gdal.GDT_Byte, 1, 0)
	
	high_clouds			= (b8_toa > 300.0) & (b5_toa > 300.0)  & (visnir_ratio>0.7)
	#low_clouds			= (b9_data<0.3) & (b5_data>0.14) & (b8_data>0.1)
	
	# grab last band and initialize it
	b8_dn[b8_dn>0]	= 0
	b8_dn[high_clouds]	= 1
	#b10_data[low_clouds]	= 1
	b8_dn[b5_radiance ==0] = 0
	b8_dn[b7_radiance ==0] = 0
	
	app.write_data( b8_dn, output_file, gdal.GDT_Byte, 1, 1)
		
	#app.reproject( "EPSG:4326", os.path.join(outdir, output_file), output_file_4326)
	