#!/usr/bin/env python
#
# Created on 07/11/2014 Pat Cappelaere - Vightel Corporation
#
# Input: Palsar2 scene
#

import os, inspect, sys
import argparse
from urlparse import urlparse

import sys, urllib, httplib, subprocess

import numpy
import math

#NoneType = type(None)
import scipy.signal
from scipy import ndimage

from osgeo import gdal
from osgeo import osr
from osgeo import ogr

import config
#import ogr2osm
from which import *

from datetime import datetime

import config
BASE_DIR = config.PALSAR2_DIR;
HAND_DIR = config.HANDS_DIR
HAND_VRT = config.HANDS_AREA + "_hand.vrt"

force 	= 0
verbose	= 0

class Palsar2:
	def execute( self, cmd ):
		if self.verbose:
			print cmd
		os.system(cmd)

	def __init__( self, inpath, scene ):
		if verbose:
			print("Processing: %s" % inpath)
	
		self.inpath 					= inpath
		
		self.hh_scene 					= os.path.join(inpath, "IMG-HH-"+scene+"-FBDL1.5RUD.tif")
		self.hv_scene 					= os.path.join(inpath, "IMG-HV-"+scene+"-FBDL1.5RUD.tif")
		self.rgb_scene 					= os.path.join(inpath, "IMG-RGB-"+scene+".tif")
		self.rgb_4326_scene 			= os.path.join(inpath, "IMG-RGB-4326_"+scene+".tif")
		self.browse_image 				= os.path.join(inpath, "IMG-browse_"+scene+".png")
		self.surface_water 				= os.path.join(inpath, "IMG-surface_water_"+scene+".tif")
		
	#
	# Reproject
	#
	def reproject( self, epsg, in_file, out_file):
		# remove out_file if it already exists
		if os.path.isfile(out_file):
			os.remove(out_file)

		cmd = "gdalwarp -of GTiff -co COMPRESS=DEFLATE -t_srs "+ epsg +"  " + in_file + " " + out_file
		self.execute(cmd)
		
	def threshold( self ):
		mean = numpy.mean(self.data)
		if app.verbose:
			print( "thresholding - mean: %f threshold: %f" % (mean, mean/2))
		self.data = ( self.data < mean/2 )
		if app.verbose:
			print( "done.")
	
	#
	# Apply Speckle filter
	#
	def speckle_filter(self, filter_name, ws):
		if app.verbose:
			print("filter it..")

		# we need to turn it to float
		self.data = numpy.float32(self.data)
		if filter_name == 'median':
			self.data = scipy.signal.medfilt2d(self.data, kernel_size=ws)
		elif filter_name == 'wiener':
			self.data = scipy.signal.wiener(self.data,mysize=(ws,ws),noise=None)
	
	def generate_color_table(self):
		self.ct = gdal.ColorTable()
		for i in range(256):
			self.ct.SetColorEntry( i, (0, 0, 0, 0) )

		self.ct.SetColorEntry( 1, (255, 0, 0, 255) )

	def browseimage(self):
		if os.path.isfile(self.browse_image):
			os.remove(self.browse_image)

		cmd = "gdal_translate -outsize 5% 5% " + self.rgb_4326_scene + " " + self.browse_image
		self.execute(cmd)

	def process_composite(self):
		if self.force or not os.path.isfile(self.rgb_scene):
			format 				= "GTiff"
			driver 				= gdal.GetDriverByName( format )

			if verbose:
				print "Reading", self.hh_scene 
				
			hh_ds 				= gdal.Open( self.hh_scene )
			hh_band 			= hh_ds.GetRasterBand(1)
			
			self.RasterXSize 	= hh_ds.RasterXSize
			self.RasterYSize 	= hh_ds.RasterYSize

			hh_data				= hh_band.ReadAsArray(0, 0, self.RasterXSize, self.RasterYSize )
			hh_max 				= numpy.amax(hh_data)
			
			projection  		= hh_ds.GetProjection()
			geotransform		= hh_ds.GetGeoTransform()
			
			hv_ds 				= gdal.Open( self.hv_scene )
			hv_band 			= hv_ds.GetRasterBand(1)
			hv_data				= hv_band.ReadAsArray(0, 0, self.RasterXSize, self.RasterYSize )
			hv_max 				= numpy.amax(hv_data)
				
			if verbose:
				print "Computing HH/HV..."
			
			hh_hv_data 			= numpy.float32(hh_data) / numpy.float32(hv_data+1)
			hh_hv_max			= numpy.amax(hh_hv_data)
		
			dst_ds				= driver.Create( self.rgb_scene, self.RasterXSize, self.RasterYSize, 3, gdal.GDT_Byte, [ 'INTERLEAVE=PIXEL', 'COMPRESS=DEFLATE' ] )

			if verbose:
				print "Writing red..."

			red_band 			= dst_ds.GetRasterBand(1)
			data				= numpy.float32(hh_data)*255.0/hh_max
			red_band.WriteArray(data, 0, 0)

			if verbose:
				print "Writing green..."
			
			data = numpy.float32(hv_data)*255.0/hv_max
			green_band 			= dst_ds.GetRasterBand(2)
			green_band.WriteArray(data, 0, 0)


			if verbose:
				print "Writing blue..."
				
			data = hh_hv_data*255.0/hh_hv_max
			
			blue_band 			= dst_ds.GetRasterBand(3)
			blue_band.WriteArray(data, 0, 0)

	
			if verbose:
				print "Writing misc proj/geotransform..."
	
			dst_ds.SetGeoTransform( geotransform )
			dst_ds.SetProjection( projection )

			dst_ds 	= None
			hh_ds	= None
			hv_ds	= None
		
	def process_raw_data(self):
		if self.force or not os.path.isfile(self.rgb_scene):
			format 				= "GTiff"
			driver 				= gdal.GetDriverByName( format )

			if verbose:
				print "Reading", self.hh_scene 
				
			hh_ds 				= gdal.Open( self.hh_scene )
			hh_band 			= hh_ds.GetRasterBand(1)
			
			self.RasterXSize 	= hh_ds.RasterXSize
			self.RasterYSize 	= hh_ds.RasterYSize

			self.data			= hh_band.ReadAsArray(0, 0, self.RasterXSize, self.RasterYSize )
			
			projection  		= hh_ds.GetProjection()
			geotransform		= hh_ds.GetGeoTransform()
			
			self.threshold()
			#self.speckle_filter('median', 3)
			
			self.generate_color_table()

			# will be open as writeable as well
			if verbose:
				print "Creating output...", self.surface_water
				
			dst_ds				= driver.Create( self.surface_water, self.RasterXSize, self.RasterYSize, 1, gdal.GDT_Byte, [ 'COMPRESS=DEFLATE' ]  )

			band = dst_ds.GetRasterBand(1)
			
			print "set color table"
			band.SetRasterColorTable(self.ct)

			print "write array"
			band.WriteArray(self.data, 0, 0)

			print "set nodata"
			band.SetNoDataValue(0)
		
			dst_ds.SetGeoTransform( geotransform )
			dst_ds.SetProjection( projection )

			dst_ds 	= None
			hh_ds	= None
			hv_ds	= None
			
			print "Done!"
		
# palsar2.py --scene ALOS2004073570-140620 -v

if __name__ == '__main__':
	parser = argparse.ArgumentParser(description='Process Palsar2 scene')
	apg_input = parser.add_argument_group('Input')
	apg_input.add_argument("-f", "--force", 	action='store_true', help="Forces new product to be generated")
	apg_input.add_argument("-v", "--verbose", 	action='store_true', help="Verbose on/off")
	apg_input.add_argument("-c", "--clean", 	action='store_true', help="Clean artifacts")
	apg_input.add_argument("-s", "--scene", 	help="radarsat2 scene")
	
	options 	= parser.parse_args()
	force		= options.force
	verbose		= options.verbose
	scene	 	= options.scene
	clean	 	= options.clean
	
	if verbose:
		print "** Palsar-2 Processing start:", str(datetime.now())

	inpath 		= os.path.join(BASE_DIR, scene)
		
	app 		= Palsar2(inpath, scene)
	app.force 	= force
	app.verbose	= verbose

	#app.process_raw_data()
	app.process_composite()
	app.browseimage()

	if force or not os.path.isfile(app.rgb_4326_scene):
		app.reproject("EPSG:4326", app.rgb_scene, app.rgb_4326_scene)
		
