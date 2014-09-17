#!/usr/bin/env python
#
# Created on 07/11/2014 Pat Cappelaere - Vightel Corporation
#
# Surface Water Map Using Landsat8 Top Of Atmosphere Reflectance
#
# output reprojected EPSG:4326
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

import config

force 	= 0
verbose	= 0

#http://landsat.usgs.gov/Landsat8_Using_Product.php	

class Landsat8:
	def __init__( self, outpath, scene ):	
		self.outpath			= outpath
		self.scene				= scene
		self.bqa_file			= os.path.join(outpath, scene + "_BQA.TIF")
		self.meta_file			= os.path.join(outpath, scene + "_MTL.txt")
		self.projection			= None
		self.geotransform		= None

	def execute( self, cmd ):
		if verbose:
			print cmd
		os.system(cmd)
				
	def process_bqa(self):
		if verbose:
			print "Opening", self.bqa_file

		bqads = gdal.Open( self.bqa_file )
		if bqads is None:
			print('ERROR: file no bqa data:')
			sys.exit(-1)

		self.RasterXSize			= bqads.RasterXSize
		self.RasterYSize			= bqads.RasterYSize
		
		bqaband 					= bqads.GetRasterBand(1)
		bqa_data 					= bqaband.ReadAsArray(0, 0, bqads.RasterXSize, bqads.RasterYSize )

		# cloud mask
		self.cloud_mask				= (bqa_data & 0xC000) == 0xC000
		self.cirrus_mask			= (bqa_data & 0x3000) == 0x3000
		self.no_data				= (bqa_data & 0x1) == 0x1
	
		bqa_data[self.cloud_mask] 	= 1
		bqa_data[self.cirrus_mask] 	= 1
		bqa_data[self.no_data] 		= 0
		
		if verbose:
			self.write_data( bqa_data, "cloud_mask.tif", self.ct)

		bqads 	= None
		
	def linear_stretch(self, data):
		# clip bottom and top 2 percent of the points
		max_cut = numpy.percentile(data, 98)
		
		# we need to move the Zeroes out of the way to find the bottom 2%
		min_cut = numpy.percentile(data, 2)
		
		#if verbose:
		#	print "mincut:", min_cut
		#	print "maxcut:", max_cut
			
		data = scipy.misc.bytescale(data, min_cut, max_cut)
		#data = scipy.misc.bytescale(data)
		return data
			
			
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
			
	def generate_color_table(self):
		self.ct = gdal.ColorTable()
		for i in range(256):
			self.ct.SetColorEntry( i, (0, 0, 0, 0) )

		self.ct.SetColorEntry( 1, (255, 0, 0, 255) )
		
		# For testing
		#self.ct.SetColorEntry( 2, (0, 255, 0, 255) )
		#self.ct.SetColorEntry( 3, (0, 0, 255, 255) )
		
		
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
		
	def process(self):
				
		green_data 	= self.get_band_data(3)
		mir_data	= self.get_band_data(6) 	
		
		green_mask	= (green_data == 0)
		mir_mask	= (mir_data == 0)
		
		if verbose:
			print "compute indices"

		#
		# MNDWI
		#
		# to avoid divide by zero
		green_data[green_mask]		= 1
		mir_data[mir_mask]			= 1

		mndwi 						= (green_data-mir_data)/(green_data+mir_data)
			
		mndwi[mndwi > 0.0] 			= 1
		
		mndwi[green_mask] 			= 0
		mndwi[mir_mask] 			= 0
		mndwi[self.cloud_mask]	 	= 0
		mndwi[self.cirrus_mask] 	= 0

		self.write_data( mndwi, "watermap.tif", self.ct)

		if verbose:
			print "Done"
		
# landsat8_toa_watermap.py --scene EO1A0090462012344110KF
if __name__ == '__main__':

	parser = argparse.ArgumentParser(description='Generate EO-1 Floodmap vectors')
	apg_input = parser.add_argument_group('Input')
	apg_input.add_argument("-f", "--force", 	action='store_true', help="Forces new product to be generated")
	apg_input.add_argument("-v", "--verbose", 	action='store_true', help="Verbose on/off")
	apg_input.add_argument("-s", "--scene", 	help="EO1 ALI Scene")
	
	options 	= parser.parse_args()
	force		= options.force
	verbose		= options.verbose
	scene	 	= options.scene
	
	outdir		= os.path.join(config.LANDSAT8_DIR,scene)	
	
	app 		= Landsat8(outdir, scene)
	
	app.getMetaData()
	
	app.generate_color_table()
	app.process_bqa()
	
	app.process()

	infileName 	= os.path.join(outdir, "watermap.tif")
	outfileName = os.path.join(outdir, scene+"_WATERMAP.tif")

	app.reproject("EPSG:4326", infileName, outfileName)

