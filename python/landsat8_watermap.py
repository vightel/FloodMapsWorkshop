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

class Landsat8:
	def __init__( self, outpath, input_file ):	
		self.input_file 		= input_file
		fileName				= os.path.basename(input_file)
		baseName				= fileName.split('.')[0]
		
		self.input_file			= os.path.join(outpath, input_file + "_SREF.tif")
		self.output_file		= os.path.join(outpath, baseName + "_WATERMAP.tif")
		self.bqa_file			= os.path.join(outpath, baseName + "_BQA_4326.tif")
		
		print baseName, self.bqa_file
		
	def get_stats(self, name, arr):
		print name, "[ STATS ] =  Minimum=%.3f, Maximum=%.3f, Mean=%.3f, StdDev=%.3f" % (numpy.amin(arr), numpy.amax(arr), numpy.mean(arr), numpy.std(arr) )
						

	def generate_color_table(self):
		self.ct = gdal.ColorTable()
		for i in range(256):
			self.ct.SetColorEntry( i, (0, 0, 0, 0) )

		self.ct.SetColorEntry( 1, (255, 0, 0, 255) )
		
	def process_bqa(self):
		if verbose:
			print "Opening", self.bqa_file

		bqads = gdal.Open( self.bqa_file )
		if bqads is None:
			print('ERROR: file no bqa data:')
			sys.exit(-1)

		bqaband 		= bqads.GetRasterBand(1)
		bqa_data 		= bqaband.ReadAsArray(0, 0, bqads.RasterXSize, bqads.RasterYSize )
		
		# cloud mask
		self.cloud_mask		= (bqa_data & 0xC000) == 0xC000
		self.cirrus_mask	= (bqa_data & 0x3000) == 0x3000
		
		
		dst_ds 	= None
		bqads 	= None
		print "Done"

#######################################################
# Otsu's Method
# Author: Samuel Jackson (samueljackson@outlook.com)
# Date: 21/07/2013
# Description: Performs Otsu's method of thresholding
# using the between class variance.
#######################################################
 
	def otsu(self, hist, totalPixels):
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
		
		projection   = ds.GetProjection()
		geotransform = ds.GetGeoTransform()
		
		if verbose:
			print "size", RasterXSize, RasterYSize, RasterCount
		
		driver 		= gdal.GetDriverByName( "GTiff" )
		dst_ds 		= driver.Create( self.output_file, RasterXSize, RasterYSize, 1, gdal.GDT_Byte, [ 'INTERLEAVE=PIXEL', 'COMPRESS=DEFLATE' ] )
		band 		= dst_ds.GetRasterBand(1)
		output_data = band.ReadAsArray(0, 0, dst_ds.RasterXSize, dst_ds.RasterYSize )

		
		green_band 	= ds.GetRasterBand(3)
		green_data	= green_band.ReadAsArray(0, 0, RasterXSize, RasterYSize )
		green_mask	= (green_data == 0)
		
		red_band 	= ds.GetRasterBand(4)
		red_data	= red_band.ReadAsArray(0, 0, RasterXSize, RasterYSize )
		red_mask	= (red_data == 0)

		nir_band 	= ds.GetRasterBand(5)
		nir_data	= nir_band.ReadAsArray(0, 0, RasterXSize, RasterYSize )
		nir_mask	= (nir_data == 0)

		mir_band 	= ds.GetRasterBand(6)
		mir_data	= mir_band.ReadAsArray(0, 0, RasterXSize, RasterYSize )
		mir_mask	= (mir_data == 0)

		#self.get_stats("GREEN", green_data)
		#self.get_stats("RED", red_data)
		#self.get_stats("NIR", nir_data)
		#self.get_stats("MIR", mir_data)
		
		L = 0.5
		
		# MNDWI = Modified Normalized Difference Water Index = (Green-MIR)/(Green+MIR) 
		# NDBI = Normalized Difference Built-up Index = (MIR-NIR)/(MIR+NIR)
		# SAVI = Soil Adjusted Vegetation Index = (NIR-Red)/(NIR+Red)
		# SAVI = Soil Adjusted Vegetation Index = (NIR-Red)*(1+L)/(NIR+Red+L)
		# Label a pixel as water if (MNDWI > NDBI) AND (MNDWI > SAVI) [AND (RedReflectance > 0.13)]
		
		# NDWI = Normalized Difference Water Index (Green-NIR)/(Green+NIR)		Water > 0
		# NDMI = Normalized Difference Moisture Index (NIR-MIR)/(NIR + MIR)		Water > 0
		
		# Water Ratio Index WRI = (Green+Red)/(NIR+RED)
		
		# to avoid divide by zero
		green_data[green_mask]	= 1
		red_data[red_mask]		= 1
		mir_data[mir_mask]		= 1
		nir_data[nir_mask]		= 1

		if verbose:
			print "compute indices"
			
		mndwi 					= (green_data-mir_data)/(green_data+mir_data)
		#ndbi					= (mir_data-nir_data) / (mir_data+nir_data)
		#savi					= (nir_data-red_data) * (1+L) / (nir_data+red_data + L)
		#wri					= (green_data+red_data)/(nir_data+red_data)
		
		#mask					= (mndwi>ndbi) #& (mndwi>savi) #& (red_data > 0.13)
		#mask					= (mndwi>0) #& (mndwi>savi) #& (red_data > 0.13)
		
		if verbose:
			print "compute threshold using otsu method"
		
		data 		= mndwi.flatten()	#mndwi	
		hist, bins 	= numpy.histogram(data, bins=256, range=(0,255))
		threshold 	= self.otsu(hist,len(data))
		
		if verbose:
			mask = (mndwi<=threshold)
			print "threshold", threshold, len(data), numpy.count_nonzero(mask)	

		output_data[mask] 		= 1
		
		if verbose:
			count = numpy.count_nonzero(output_data)
			print "non zeros:",  count
			
		output_data[green_mask] = 0
		output_data[red_mask] 	= 0
		output_data[mir_mask] 	= 0
		output_data[nir_mask] 	= 0
		
		output_data[self.cloud_mask]	= 0
		output_data[self.cirrus_mask]	= 0
		
		if verbose:
			count = numpy.count_nonzero(output_data)
			print "non zeros 2:",  count
		
		dst_ds.SetGeoTransform( geotransform )
		dst_ds.SetProjection( projection )

		band.SetRasterColorTable(self.ct)
		band.WriteArray(output_data, 0, 0)
		band.SetNoDataValue(0)
		
		dst_ds 	= None
		ds 		= None
		
		if verbose:
			print "Done"
		
if __name__ == '__main__':

	parser = argparse.ArgumentParser(description='Generate Landsat8 Floodmap vectors')
	apg_input = parser.add_argument_group('Input')
	apg_input.add_argument("-f", "--force", 	action='store_true', help="Forces new product to be generated")
	apg_input.add_argument("-v", "--verbose", 	action='store_true', help="Verbose on/off")
	apg_input.add_argument("-s", "--scene", 	help="Landsat Scene")
	
	options 	= parser.parse_args()
	force		= options.force
	verbose		= options.verbose
	scene	 	= options.scene
	
	outdir		= os.path.join(config.LANDSAT8_DIR,scene)	
	
	app 		= Landsat8(outdir, scene)
	
	app.generate_color_table()
	app.process_bqa()
	app.process()
	
