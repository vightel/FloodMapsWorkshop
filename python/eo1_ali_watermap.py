#!/usr/bin/env python
#
# Created on 07/11/2014 Pat Cappelaere - Vightel Corporation
#
# Input: EO1 GeoTiff L1T
# Output: Top of Atmosphere Corrected Water map
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
	
	mndwi_file 			= "mndwi.tif"
	ndbi_file 			= "ndbi.tif"
	ndvi_file 			= "ndvi.tif"
	savi_file 			= "savi.tif"
	output_file 		= "watermap.tif"
	
	cloud_mask_file		= outdir + "/cloud_mask.tif"
	
	output_file_4326 	= outdir + "/watermap_4326.tif"

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
		print "Loading mir band"
		
	mir_dn				= app.get_band_data( 9 ) 	
	mir_radiance		= app.radiance(9, mir_dn)
	mir_toa				= app.toa(9, mir_radiance)
	mir_mask			= (mir_dn == 0)

	cloud_ds = gdal.Open( cloud_mask_file )
	if cloud_ds is None:
		print 'ERROR: file has no cloud data:', cloud_mask_file
		sys.exit(-1)
		
	cloud_band 	= cloud_ds.GetRasterBand(1)
	cloud_data	= cloud_band.ReadAsArray(0, 0, cloud_ds.RasterXSize, cloud_ds.RasterYSize )
			
	# MNDWI = Modified Normalized Difference Water Index = (Green-MIR)/(Green+MIR) 

	if verbose:
		print "compute MNDWI"

	#
	# MNDWI
	#
	mndwi 					=  (green_toa-mir_toa)/(green_toa+mir_toa)	
	mndwi[mndwi<0]			= 0
	mndwi[mndwi>0]			= 1
	mndwi[green_mask] 		= 0
	mndwi[mir_mask] 		= 0
	mndwi[cloud_data>0]		= 0
	
 
	app.write_data( mndwi, output_file, gdal.GDT_Byte, 1, 1)	

	infileName 	= os.path.join(outdir, "watermap.tif")
	outfileName = os.path.join(outdir, scene+"_WATERMAP.tif")

	app.reproject("EPSG:4326", infileName, outfileName)
	
	if verbose:
		print "Done"
