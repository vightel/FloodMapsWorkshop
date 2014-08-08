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


#######################################################
# Otsu's Method
# Author: Samuel Jackson (samueljackson@outlook.com)
# Date: 21/07/2013
# Description: Performs Otsu's method of thresholding
# using the between class variance.
#######################################################
 
def otsu( hist, totalPixels):
	currentMax = 0
	threshold = 0
	sumTotal, sumForeground, sumBackground = 0, 0, 0
	weightBackground, weightForeground = 0, 0

	# Calculate the total of the data
	for i,t in enumerate(hist): sumTotal += i * hist[i]

	for i,t in enumerate(hist):

		# Calculate the weight of the background
		weightBackground += hist[i]
		if( weightBackground == 0 ): continue

		# Calculate the weight of the foreground
		weightForeground = totalPixels - weightBackground
		if ( weightForeground == 0 ): break

		sumBackground += i*hist[i]

		# Calculate the mean of the classes
		meanB = sumBackground / weightBackground
		meanF = (sumTotal - sumBackground) / weightForeground

		# Calculate variance between classes
		varBetween = weightBackground*weightForeground
		varBetween *= (meanB-meanF)*(meanB-meanF)

		# Check if the variance between classes is greater than
		# the current best
		if(varBetween > currentMax):
			currentMax = varBetween
			threshold = i

	return threshold
		

		
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
	 
	#red_dn				= app.get_band_data( 5 ) 	
	#red_radiance		= app.radiance(5, red_dn)
	#red_toa				= app.toa(5, red_radiance)
	#red_mask			= (red_dn == 0)
	
	#nir_dn				= app.get_band_data( 7 ) 	
	#nir_radiance		= app.radiance(7, nir_dn)
	#nir_toa				= app.toa(7, nir_radiance)
	#nir_mask			= (nir_dn == 0)

	b8_dn				= app.get_band_data( 8 ) 	
	b8_radiance			= app.radiance(8, b8_dn)
	b8_toa				= app.toa(8, b8_radiance)
	if verbose:
		print 'b8_toa', numpy.min(b8_toa), numpy.mean(b8_toa), numpy.max(b8_toa)

	data = app.linear_stretch(b8_toa)
	#data[data>100]	= 0
	
	app.write_data( data, "b8t.tif", gdal.GDT_Byte, 1, 0)
	#nir_mask			= (nir_dn == 0)


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
			
	#	green_mask	= (green_data <= 0)
	#	mir_mask	= (mir_data <= 0)
	#	
	#	red_mask	= (red_data == 0)
	#	nir_mask	= (nir_data == 0)

	#L = 0.5

	# MNDWI = Modified Normalized Difference Water Index = (Green-MIR)/(Green+MIR) 
	# NDBI = Normalized Difference Built-up Index = (MIR-NIR)/(MIR+NIR)
	# SAVI = Soil Adjusted Vegetation Index = (NIR-Red)*(1+L)/(NIR+Red+L)
	# Label a pixel as water if (MNDWI > NDBI) AND (MNDWI > SAVI) [AND (RedReflectance > 0.13)]
		
	# NDWI = Normalized Difference Water Index (Green-NIR)/(Green+NIR)		Water > 0
	# NDMI = Normalized Difference Moisture Index (NIR-MIR)/(NIR + MIR)		Water > 0
		
	# Water Ratio Index WRI = (Green+Red)/(NIR+RED)
		
	# to avoid divide by zero
	#green_data[green_mask]	= 1
	#mir_data[mir_mask]		= 1
	#nir_data[nir_mask]		= 1
	#red_data[red_mask]		= 1

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
	
	#ls_mndwi				= app.linear_stretch(mndwi)		
	#data					= app.linear_stretch(mndwi)
	#data					= 255 - app.linear_stretch(mndwi)
	#data[green_mask] 		= 0
	#data[mir_mask] 		= 0
	#data[cloud_data>0]		= 0
	
	#app.write_data( mndwi, mndwi_file,gdal.GDT_Byte, 1, 1)
	#app.write_data( app.linear_stretch(mndwi), mndwi_file,gdal.GDT_Byte, 1, 0)

	#
	# NDBI
	#ndbi					= (mir_toa - nir_toa) / (mir_toa+nir_toa)
	#ls_ndbi 				= app.linear_stretch(ndbi)
	#ls_ndbi[green_mask] 	= 0
	#ls_ndbi[nir_mask] 		= 0
	#ls_ndbi[cloud_data>0]	= 0
			
	#if verbose:
	#	app.write_data( ls_ndbi, ndbi_file, gdal.GDT_Byte, 1, 0)

	#
	# SAVI
	#savi					= (1.0+L)*(nir_toa - red_toa) / (nir_toa+red_toa+L)
	#ls_savi 				= app.linear_stretch(ndbi)
	#ls_savi[red_mask] 	= 0
	#ls_savi[nir_mask] 		= 0
	#ls_ndbi[cloud_data>0]	= 0
			
	#if verbose:
	#	app.write_data( ls_savi, savi_file, gdal.GDT_Byte, 1, 0)
	
	#
	# NDVI
	#ndvi					= (nir_toa - red_toa) / (nir_toa+red_toa)
	#ls_ndvi 				= app.linear_stretch(ndvi)
	#if verbose:
	#	print 'ndvi', numpy.min(ndvi), numpy.mean(ndvi), numpy.max(ndvi)
	#	print 'ndvi stretched', numpy.min(ls_ndvi), numpy.mean(ls_ndvi), numpy.max(ls_ndvi)
	
	#ls_ndvi[ls_ndvi> 100]	= 0
	#ls_ndvi[ls_ndvi> 5]	= 2
	#ls_ndvi[ls_ndvi> 4]	= 3
	#ls_ndvi[ls_ndvi> 3]	= 4
	#ls_ndvi[ls_ndvi> 2]	= 5
	#ls_ndvi[ls_ndvi>= 1]	= 6
	
	#ls_ndvi[red_mask] 		= 0
	#ls_ndvi[nir_mask] 		= 0
	#ls_ndvi[cloud_data>0]	= 0
			
	#if verbose:
	#	app.write_data( ls_ndvi, ndvi_file, gdal.GDT_Byte, 1, 0)
	
	#
	# SAVI
	#
	# savi 					=  (1.0+L)*(nir_data-red_data)/(nir_data+red_data+L)
		
	# ls_savi 				= self.linear_stretch(savi)
	# ls_savi[nir_mask] 	= 0
	# ls_savi[red_mask] 	= 0
		
	# self.write_data( ls_savi, "savi.tif", None)
	# if verbose:
	#	print 'SAVI', numpy.min(savi), numpy.mean(savi), numpy.max(savi)
	
	#data 		= ls_mndwi.flatten()
	#hist, bins 	= numpy.histogram(data, bins=256, range=(0,255))
	#threshold 	= otsu(hist,len(data))
	#if verbose:
	#	print "compute threshold using otsu method", threshold, len(data), numpy.min(data), numpy.mean(data), numpy.max(data)

	#threshold = 130
	#ls_mndwi[ls_mndwi < threshold] 	= 0
	#ls_mndwi[ls_mndwi >= threshold] = 1
	#ls_mndwi[cloud_data>0]		= 0
	#ls_mndwi[green_mask]		= 0
	#ls_mndwi[mir_mask]			= 0

	#print "k-means..."
	#k = 7
	#res, idx = vq.kmeans2(ls_mndwi, k, 30)
	
	#for i in range(0,k-1):
	#	ls_mndwi[idx==i]=i+1
	
	#classes = gdalnumeric.numpy.histogram(ls_mndwi, bins=k)[1]
	#print len(classes), classes
	#start = 0
	#for i in range(len(classes)):
		#mask = gdalnumeric.numpy.logical_and(start <= ls_mndwi, ls_mndwi <= classes[i])
		#print i, classes[i]
		#ls_mndwi[ (ls_mndwi>start) & (ls_mndwi <= classes[i]) ] = i
		#start = classes[i]
 
	app.write_data( mndwi, output_file, gdal.GDT_Byte, 1, 1)	

	infileName 	= os.path.join(outdir, "watermap.tif")
	outfileName = os.path.join(outdir, scene+"_WATERMAP.tif")

	app.reproject("EPSG:4326", infileName, outfileName)
	
	if verbose:
		print "Done"
