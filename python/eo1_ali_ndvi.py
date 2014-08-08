#!/usr/bin/env python
#
# Created on 07/11/2014 Pat Cappelaere - Vightel Corporation
#
# Input: EO1 GeoTiff L1T
# Output: NDVI
#

import os, inspect, sys
import argparse

import numpy
import math, time
import scipy
import scipy.cluster.vq as vq

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
	
	ndvi_file 			= "ndvi.tif"
	cloud_mask_file		= outdir + "/cloud_mask.tif"
	
	app 				= EO1_ALI_L1T(outdir, scene, verbose)
	
	if verbose:
		print "Loading green band"

	red_dn				= app.get_band_data( 5 ) 	
	red_radiance		= app.radiance(5, red_dn)
	red_toa				= app.toa(5, red_radiance)
	red_mask			= (red_dn == 0)
	
	nir_dn				= app.get_band_data( 7 ) 	
	nir_radiance		= app.radiance(7, nir_dn)
	nir_toa				= app.toa(7, nir_radiance)
	nir_mask			= (nir_dn == 0)

	cloud_ds = gdal.Open( cloud_mask_file )
	if cloud_ds is None:
		print 'ERROR: file has no cloud data:', cloud_mask_file
		sys.exit(-1)
	cloud_band 	= cloud_ds.GetRasterBand(1)
	cloud_data	= cloud_band.ReadAsArray(0, 0, cloud_ds.RasterXSize, cloud_ds.RasterYSize )
			
	#
	# NDVI
	epsilon					= 0.001
	#ndvi					= (nir_dn - red_dn) / (epsilon + nir_dn+red_dn)
	#ndvi					= (nir_radiance - red_radiance) / (epsilon +nir_radiance+red_radiance)
	ndvi					= (nir_toa - red_toa) / (nir_toa+red_toa)
	ls_ndvi 				= app.linear_stretch(ndvi)
	
	#ls_ndvi[ls_ndvi> 100]	= 0
	#ls_ndvi[ls_ndvi> 5]	= 2
	#ls_ndvi[ls_ndvi> 4]	= 3
	#ls_ndvi[ls_ndvi> 3]	= 4
	#ls_ndvi[ls_ndvi> 2]	= 5
	#ls_ndvi[ls_ndvi>= 1]	= 6
	
	ls_ndvi[red_mask] 		= 0
	ls_ndvi[nir_mask] 		= 0
	#ls_ndvi[cloud_data>0]	= 0
			
	app.write_data( ls_ndvi, ndvi_file, gdal.GDT_Byte, 1, 0)
	
	if verbose:
		print "Done"
