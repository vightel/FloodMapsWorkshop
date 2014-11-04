#!/usr/bin/env python
#
# Created on 07/11/2014 Pat Cappelaere - Vightel Corporation
#
# Input: EO1 GeoTiff L1T
# Output: Top of Atmosphere Corrected Water map using NDWI
# first proposed by McFeeters in 1996 to detect surface water
# Using ALI bands 4 (red) & 7 (NOR)
# Composite for quality control uses Landsat band 3,5,6 -> ALI 4,7,9 or 7,4,3 or 7,5,4
#

import os, inspect, sys
import argparse

import numpy
import math, time
import scipy

from scipy import ndimage

from osgeo import gdal
from osgeo import osr
from osgeo import ogr
from which import *

import gdalnumeric

from eo1_ali_l1t import EO1_ALI_L1T

import config

force 	= 0
verbose	= 0
		
# eo1_ali_watermap.py --scene EO1A0090462012344110KF
if __name__ == '__main__':

	parser = argparse.ArgumentParser(description='Generate EO-1 watermap')
	apg_input = parser.add_argument_group('Input')
	apg_input.add_argument("-f", "--force", 	action='store_true', help="Forces new product to be generated")
	apg_input.add_argument("-v", "--verbose", 	action='store_true', help="Verbose on/off")
	apg_input.add_argument("-s", "--scene", 	help="EO1 ALI Scene")
	
	options 			= parser.parse_args()
	force				= options.force
	verbose				= options.verbose
	
	outdir				= os.path.join(config.EO1_DIR, options.scene)	
	scene	 			= options.scene.split("_")[0]
		
	output_file 		= "watermap_ndwi.tif"
	output_file_4326 	= os.path.join(outdir,"watermap_ndwi_4326.tif")

	if verbose:
		print "output_file", output_file
	
	app 				= EO1_ALI_L1T(outdir, scene, verbose)
	
	if verbose:
		print "Loading green band"
			
	green_dn 			= app.get_band_data( 4 )
	green_radiance		= app.radiance(4, green_dn)
	green_toa			= app.toa(4, green_radiance)
	green_mask			= (green_dn == 0)

	if verbose:
		print "Loading nir band"
		
	nir_dn				= app.get_band_data( 7 ) 	
	nir_radiance		= app.radiance(7, nir_dn)
	nir_toa				= app.toa(7, nir_radiance)
	nir_mask			= (nir_dn == 0)


	if verbose:
		print "compute NDWI"

	ndwi 				=  1.0*(green_toa-nir_toa)/(green_toa+nir_toa)	
	
	print numpy.min(ndwi), numpy.mean(ndwi), numpy.max(ndwi)
	
	ndwi[ndwi<=0]		= 0
	ndwi[ndwi>0.2]		= 255
	
	ndwi[green_mask]	= 0
	ndwi[nir_mask] 		= 0	
 
	app.write_data( ndwi, output_file, gdal.GDT_Byte, 1, 0)	

	#app.reproject("EPSG:4326", os.path.join(outdir,output_file), output_file_4326)
	
	if verbose:
		print "Done"
