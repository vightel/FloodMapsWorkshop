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

force 	= 0
verbose	= 0

class Landsat8:
	def __init__( self, outpath, input_file, red, green, blue ):	
		self.input_file 		= input_file
		fileName				= os.path.basename(input_file)
		baseName				= fileName.split('.')[0]
		
		self.red				= red
		self.green				= green
		self.blue				= blue
		
		self.input_file			= os.path.join(outpath, input_file + "_SREF.tif")
		self.output_file		= os.path.join(outpath, baseName + "_COMPOSITE_"+red+green+blue+".tif")
		self.bqa_file			= os.path.join(outpath, baseName + "_BQA_4326.tif")
		self.cloud_mask_file	= os.path.join(outpath, baseName + "_CLOUD_MASK.tif")
		
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
		#water_mask		= bqa_data & 0x30
		
		driver 			= gdal.GetDriverByName( "GTiff" )
		dst_ds 			= driver.Create( self.cloud_mask_file, bqads.RasterXSize, bqads.RasterYSize, 1, gdal.GDT_Byte, [ 'INTERLEAVE=PIXEL', 'COMPRESS=DEFLATE' ] )
		band 			= dst_ds.GetRasterBand(1)
		output_data 	= band.ReadAsArray(0, 0, dst_ds.RasterXSize, dst_ds.RasterYSize )

		#output_data[bqa_data>0] 			= 0

		# cloud mask
		self.cloud_mask		= (bqa_data & 0xC000) == 0xC000
		self.cirrus_mask	= (bqa_data & 0x3000) == 0x3000
		
		output_data[self.cloud_mask] = 1
		
		band.SetRasterColorTable(self.ct)
		band.WriteArray(output_data, 0, 0)
		band.SetNoDataValue(0)
		
		dst_ds 	= None
		bqads 	= None
		print "Cloud Masking Done"
		
	def old_linear_stretch(self, data, percent):
		minVal		= numpy.min(data)
		maxVal		= numpy.max(data)
		rang		= (maxVal - minVal) 
				
		# clip bottom and top percent assuming some linear distribution
		delta 		= rang * percent / 100.0
		minVal		+= delta
		maxVal		-= delta
		
		data		= (255.0 * (data - minVal) / (rang - 2.0 * delta)).astype(numpy.uint8)
		return data
		
		
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
		
	# Histogram Equalization
	def histeq( self, data):		
		
		nbr_bins = 256
		imhist,bins = numpy.histogram(data,nbr_bins,normed=True)

		cdf = imhist.cumsum() #cumulative distribution function
		cdf = 255 * cdf / cdf[-1] #normalize

		#use linear interpolation of cdf to find new pixel values
		im2 = numpy.interp(data,bins[:-1],cdf)

		return im2
		 
	def process(self):
		if verbose:
			print "Opening", self.input_file
			
		ds = gdal.Open( self.input_file )
		if ds is None:
			print('ERROR: file no data:')
			sys.exit(-1)

		if verbose:
			print "Process Red band"
			
		r  		 	= int(self.red)
		red_band 	= ds.GetRasterBand(r)
		red_data 	= red_band.ReadAsArray(0, 0, ds.RasterXSize, ds.RasterYSize )
		red_data[self.cloud_mask]=0
		zeroes		= (red_data == 0)
		#red_data 	= self.linear_stretch(red_data, 0)
		red_data	= self.linear_stretch(red_data)
		red_data[zeroes]=0
		
		if verbose:
			print "Process Green band"
		g   		= int(self.green)
		green_band 	= ds.GetRasterBand(g)
		green_data 	= green_band.ReadAsArray(0, 0, ds.RasterXSize, ds.RasterYSize )
		green_data[self.cloud_mask]=0
		zeroes		= (green_data == 0)
		#green_data 	= self.linear_stretch(green_data, 0)
		green_data	= self.linear_stretch(green_data)
		green_data[zeroes]=0

		if verbose:
			print "Process Blue band"
			
		b  			= int(self.blue)
		blue_band 	= ds.GetRasterBand(b)
		blue_data 	= blue_band.ReadAsArray(0, 0, ds.RasterXSize, ds.RasterYSize )
		blue_data[self.cloud_mask]=0
		zeroes		= (blue_data == 0)
		#blue_data 	= self.linear_stretch(blue_data, 0)
		blue_data	= self.linear_stretch(blue_data)
		blue_data[zeroes]=0

		print r,g,b

		RasterXSize = ds.RasterXSize
		RasterYSize = ds.RasterYSize
		RasterCount = ds.RasterCount
		
		driver 			= gdal.GetDriverByName( "GTiff" )
		dst_ds 			= driver.Create( self.output_file, RasterXSize, RasterYSize, 4, gdal.GDT_Byte, [ 'INTERLEAVE=PIXEL', 'COMPRESS=DEFLATE' ] )
		
		
		dst_ds.GetRasterBand(1).WriteArray(red_data, 0, 0)
		dst_ds.GetRasterBand(1).SetNoDataValue(0)
		
		dst_ds.GetRasterBand(2).WriteArray(green_data, 0, 0)
		dst_ds.GetRasterBand(2).SetNoDataValue(0)
		
		dst_ds.GetRasterBand(3).WriteArray(blue_data, 0, 0)
		dst_ds.GetRasterBand(3).SetNoDataValue(0)
		
		alpha_band			= dst_ds.GetRasterBand(4)
		alpha_data 			= alpha_band.ReadAsArray(0, 0, dst_ds.RasterXSize, dst_ds.RasterYSize )
		alpha_data[blue_data == 0]	= 0
		alpha_data[blue_data>0]		= 255
		alpha_band.WriteArray(alpha_data, 0, 0)

		dst_ds = None
		ds		= None
		
if __name__ == '__main__':

	parser = argparse.ArgumentParser(description='Generate Landsat8 Floodmap vectors')
	apg_input = parser.add_argument_group('Input')
	apg_input.add_argument("-f", "--force", 	action='store_true', help="Forces new product to be generated")
	apg_input.add_argument("-v", "--verbose", 	action='store_true', help="Verbose on/off")
	apg_input.add_argument("-s", "--scene", 	help="Landsat Scene")
	apg_input.add_argument("-r", "--red", 		help="Landsat red")
	apg_input.add_argument("-g", "--green", 	help="Landsat green")
	apg_input.add_argument("-b", "--blue", 		help="Landsat blue")

	options 	= parser.parse_args()
	force		= options.force
	verbose		= options.verbose
	scene	 	= options.scene
	
	red	 		= options.red
	green	 	= options.green
	blue	 	= options.blue

	outdir		= os.path.join(config.LANDSAT8_DIR,scene)	

	app 		= Landsat8(outdir, scene, red, green, blue)

	app.generate_color_table()
	app.process_bqa()
	app.process()