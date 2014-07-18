#!/usr/bin/env python
#
# Created on 07/11/2014 Pat Cappelaere - Vightel Corporation
#
# Input: Landsat8 GeoTiffs
# Output: Composite EPSG:4326
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
	def __init__( self, outpath, scene, red, green, blue ):	
		self.scene 				= scene
		self.outpath 			= outpath

		self.red				= red
		self.green				= green
		self.blue				= blue
		
		self.output_file		= os.path.join(outpath, scene + "_COMPOSITE_"+red+green+blue+".tif")
		self.bqa_file			= os.path.join(outpath, scene + "_BQA.TIF")
		self.meta_file			= os.path.join(outpath, scene + "_MTL.txt")
				
	def execute( self, cmd ):
		if verbose:
			print cmd
		os.system(cmd)
								
	def reproject( self, epsg, in_file, out_file):
		if verbose:
			print "reproject ", in_file, " to:", out_file

		# remove out_file if it already exists
		if force and os.path.isfile(out_file):
			os.remove(out_file)
		
		if not force and os.path.isfile(out_file):
			return
			
		cmd = "gdalwarp -of GTiff -co COMPRESS=DEFLATE -t_srs "+ epsg +" -multi -dstalpha " + in_file + " " + out_file
		self.execute(cmd)
		
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
		self.cloud_mask		= (bqa_data & 0xC000) 	== 0xC000
		self.cirrus_mask	= (bqa_data & 0x3000) 	== 0x3000
		self.no_data		= (bqa_data & 0x1) 		== 0x1
		
		bqads 	= None
		
	def computeTOAReflectance(self, band, data):
		mp 			= float(self.metadata['REFLECTANCE_MULT_BAND_'+str(band)])
		ap			= float(self.metadata['REFLECTANCE_ADD_BAND_'+str(band)])
		se			= float(self.metadata['SUN_ELEVATION'])
		
		if verbose:
			print 'REFLECTANCE_MULT_BAND_'+str(band), mp
			print 'REFLECTANCE_ADD_BAND_'+str(band), ap
			print 'SUN_ELEVATION', se, math.sin( se * math.pi/180.0)
			
		toa			= (mp * data + ap) / math.sin( se * math.pi/180.0)
		
		toa[ toa < 0 ] = 0
		
		# save it for debug purpose
		if 0 :
			fname 		= os.path.join(self.outpath, "band_" + str(band) + "_toa.tif")
			driver 		= gdal.GetDriverByName( "GTiff" )
			dst_ds 		= driver.Create( fname, self.RasterXSize, self.RasterYSize, 1, gdal.GDT_Byte )
			band 		= dst_ds.GetRasterBand(1)			
			band.WriteArray(self.linear_stretch(toa), 0, 0)
			dst_ds.SetGeoTransform( self.geotransform )
			dst_ds.SetProjection( self.projection )
		
			dst_ds		= None
			print "Written TOA", fname, self.RasterXSize, self.RasterYSize, numpy.min(toa), numpy.max(toa), numpy.mean(toa), numpy.std(toa) 
		
		return toa
		
	def getMetaData(self):
		f = open(self.meta_file)
		#Create an empty dictionary with which to populate all the metadata fields.
		self.metadata = {}

		#Each item in the txt document is seperated by a space and each key is
		#equated with '='. This loop strips and seperates then fills the dictonary.

		for line in f:
			if not line.strip() == "END":
				val = line.strip().split('=')
				self.metadata [val[0].strip()] = val[1].strip().strip('"')      
			else:
				break
	    #if verbose:
		#	print self.metadata
	
	def get_band_data(self, bandNum ):
		
		fileName = os.path.join(self.outpath, self.scene + "_B" + str(bandNum)+ ".TIF")

		ds = gdal.Open( fileName )
		if ds is None:
			print 'ERROR: file has no data:', fileName
			sys.exit(-1)

		self.RasterXSize = ds.RasterXSize
		self.RasterYSize = ds.RasterYSize
		self.RasterCount = ds.RasterCount
		
		self.projection  = ds.GetProjection()
		self.geotransform= ds.GetGeoTransform()
		
		band 	= ds.GetRasterBand(1)
		data	= band.ReadAsArray(0, 0, self.RasterXSize, self.RasterYSize )
				
		if verbose:
			print "Loaded:", bandNum, fileName, numpy.min(data), numpy.mean(data), numpy.max(data)

		mask 	= (data <=0) 
		
		ds 		= None
		toa		= self.computeTOAReflectance(bandNum, data)
		
		toa[ mask ] = 0
		
		if verbose:
			print "TOA:", bandNum, numpy.min(toa), numpy.mean(toa), numpy.max(toa)

		return toa
		
	def write_data(self, data, fileName, colorTable):
		fileName 	= os.path.join(self.outpath, fileName)
		driver 		= gdal.GetDriverByName( "GTiff" )
		dst_ds 		= driver.Create( fileName, self.RasterXSize, self.RasterYSize, 1, gdal.GDT_Byte, [ 'COMPRESS=DEFLATE' ] )
		band 		= dst_ds.GetRasterBand(1)

		if self.geotransform:
			dst_ds.SetGeoTransform( self.geotransform )
			
		if self.projection:
			dst_ds.SetProjection( self.projection )

		if colorTable:
			print "Add colortable"
			band.SetRasterColorTable(self.ct)

		band.WriteArray(data, 0, 0)
			
		if verbose:
			print "Written", fileName

		ds 		= None
					
	def linear_stretch(self, data):
		# clip bottom and top 2 percent of the points
		zeroes = (data == 0)
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
			
		red_data  	= self.get_band_data(self.red)
		red_data[self.cloud_mask]	=	0
		red_data[self.cirrus_mask]	=	0		
		red_data	= self.linear_stretch(red_data)
		
		green_data  = self.get_band_data(self.green)
		green_data[self.cloud_mask]	=	0
		green_data[self.cirrus_mask]=	0		
		green_data	= self.linear_stretch(green_data)
			
		blue_data  	= self.get_band_data(self.blue)
		blue_data[self.cloud_mask]	=	0
		blue_data[self.cirrus_mask]	=	0		
		blue_data	= self.linear_stretch(blue_data)
		
		if verbose:
			print "Creating", self.output_file
			
		driver 			= gdal.GetDriverByName( "GTiff" )
		dst_ds 			= driver.Create( self.output_file, self.RasterXSize, self.RasterYSize, 4, gdal.GDT_Byte, [ 'INTERLEAVE=PIXEL', 'COMPRESS=DEFLATE' ] )
		
		if verbose:
			print "Writing red band"
			
		dst_ds.GetRasterBand(1).WriteArray(red_data, 0, 0)
		dst_ds.GetRasterBand(1).SetNoDataValue(0)
		
		if verbose:
			print "Writing green band"
		dst_ds.GetRasterBand(2).WriteArray(green_data, 0, 0)
		dst_ds.GetRasterBand(2).SetNoDataValue(0)
		
		if verbose:
			print "Writing blue band"
		dst_ds.GetRasterBand(3).WriteArray(blue_data, 0, 0)
		dst_ds.GetRasterBand(3).SetNoDataValue(0)
		
		if verbose:
			print "Writing alpha band"
		alpha_band			= dst_ds.GetRasterBand(4)
		alpha_data 			= alpha_band.ReadAsArray(0, 0, dst_ds.RasterXSize, dst_ds.RasterYSize )
		alpha_data[self.no_data]	= 0
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
	app.getMetaData()
	app.process()