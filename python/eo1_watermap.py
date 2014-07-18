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

def calcJDay (date):
    #Separate date aspects into list (check for consistnecy in formatting of all
    #Landsat7 metatdata) YYYY-MM-DD
    dt = date.rsplit("-")

    #Cast each part of the date as a in integer in the 9 int tuple mktime
    t = time.mktime((int(dt[0]), int(dt[1]), int(dt[2]), 0, 0, 0, 0, 0, 0))

    #As part of the time package the 7th int in mktime is calulated as Julian Day
    #from the completion of other essential parts of the tuple
    jday = time.gmtime(t)[7]

    return jday

# http://lists.osgeo.org/pipermail/gdal-dev/2009-April/020406.html
def calcSolarDist (doy):
	return (1+0.01672 * math.sin(2 * math.pi * (doy - 93.5) / 365))

# from USGS http://eo1.usgs.gov/faq/question?id=21
def getESUN(bandNum):
	ESUN = { 	'b1':	1967.6,
				'b2':	1851.8,
				'b3':	1837.2,
				'b4':	1551.47,
				'b5':	1164.53,
				'b6':	957.46,
				'b7':	230.03,
				'b8':	451.37,
				'b9':	79.61,
				'b10':	1747.86 }
				
	esun = ESUN[bandNum]
	if verbose:
		print "ESUN", bandNum, esun
		
	return esun
	
class EO1_ALI:
	def __init__( self, outpath, input_file ):	
		self.input_file 		= input_file
		self.outpath			= outpath
		fileName				= os.path.basename(input_file)
		baseName				= fileName.split('.')[0]
		
		self.output_file		= os.path.join(outpath, baseName + "_WATERMAP.tif")
		self.mndwi_file			= os.path.join(outpath, baseName + "_MNDWI.tif")
		self.savi_file			= os.path.join(outpath, baseName + "_SAVI.tif")
		self.green_file			= os.path.join(outpath, baseName + "_B04_L1T.tif")
		self.red_file			= os.path.join(outpath, baseName + "_B05_L1T.tif")
		self.nir_file			= os.path.join(outpath, baseName + "_B07_L1T.tif")
		self.mir_file			= os.path.join(outpath, baseName + "_B09_L1T.tif")
		self.meta_file			= os.path.join(outpath, baseName + "_MTL_L1T.TXT")
				
	def get_stats(self, name, arr):
		print name, "[ STATS ] =  Minimum=%.3f, Maximum=%.3f, Mean=%.3f, StdDev=%.3f" % (numpy.amin(arr), numpy.amax(arr), numpy.mean(arr), numpy.std(arr) )
				
	def computeTOA(self, band, data):
		zeroes		= (data <= 0)
		esun 		= getESUN(band)
		const		= esun * self.toa_constant
		
		toa			= 1.0 * data / const
		toa[toa<1] 	= 1
		toa[zeroes]	= 0	# NO DATA
		
		#if verbose:
		#	fname 		= os.path.join(self.outpath, band + "_toa.tif")
		#	driver 		= gdal.GetDriverByName( "GTiff" )
		#	dst_ds 		= driver.Create( fname, self.RasterXSize, self.RasterYSize, 1, gdal.GDT_Int32 )
		#	band 		= dst_ds.GetRasterBand(1)			
		#	band.WriteArray(toa, 0, 0)
		#	dst_ds.SetGeoTransform( self.geotransform )
		#	dst_ds.SetProjection( self.projection )
			
		#	dst_ds		= None
		#	print "Written TOA", fname, self.RasterXSize, self.RasterYSize, numpy.min(toa), numpy.max(toa), numpy.mean(toa), numpy.std(toa) 
		
		return toa
		
	def getTOAParams(self):
		dt 	= self.metadata['ACQUISITION_DATE']
		jd 	= calcJDay(dt)
		esd	= calcSolarDist(jd)
		
		el	= self.metadata['SUN_ELEVATION']
		za	= (90.0- float(el))
		if verbose:
			print "Acquisition Date:", dt
			print "Julian Day:", jd
			print "Earth-Sun distance:", esd
			print "Sun Elevation in Deg:", el
			print "Sun Zenith Angle in Deg:", za
		
		# constant = Cos(sun zenith angle) / (pi * (Sun-Earth distance)^2)
		self.toa_constant = math.cos( za * math.pi/180.0 ) / ( math.pi * esd**2 )
		
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
		
	def linear_stretch(self, data):
		# clip bottom and top 2 percent of the points
		#max_cut = numpy.percentile(data, 98)
		
		# we need to move the Zeroes out of the way to find the bottom 2%
		#min_cut = numpy.percentile(data, 2)
		
		#if verbose:
		#	print "mincut:", min_cut
		#	print "maxcut:", max_cut
			
		#data = scipy.misc.bytescale(data, min_cut, max_cut)
		data = scipy.misc.bytescale(data)
		return data
		
	def get_band_data(self, bandNum, fileName ):
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
		
		data[data<0] = 0	# remove edges
		
		if verbose:
			print "Loaded:", bandNum, numpy.min(data), numpy.mean(data), numpy.max(data)

		ds 		= None
		toa		= self.computeTOA(bandNum, data)
		if verbose:
			print "TOA:", bandNum, numpy.min(toa), numpy.mean(toa), numpy.max(toa)

		return toa
		
	def write_data(self, data, fileName, colorTable):
		fileName 	= os.path.join(self.outpath, fileName)
		driver 		= gdal.GetDriverByName( "GTiff" )
		dst_ds 		= driver.Create( fileName, self.RasterXSize, self.RasterYSize, 1, gdal.GDT_Byte, [ 'INTERLEAVE=PIXEL', 'COMPRESS=DEFLATE' ] )
		band 		= dst_ds.GetRasterBand(1)

		band.WriteArray(data, 0, 0)
		band.SetNoDataValue(0)

		dst_ds.SetGeoTransform( self.geotransform )
		dst_ds.SetProjection( self.projection )

		if colorTable:
			print "Add colortable"
			band.SetRasterColorTable(self.ct)
			
		if verbose:
			print "Written", fileName

		ds 		= None
		
	def process(self):
				
		green_data 	= self.get_band_data( 'b4', self.green_file )
		mir_data	= self.get_band_data( 'b9', self.mir_file ) 	

		red_data	= self.get_band_data( 'b5', self.red_file ) 	
		nir_data	= self.get_band_data( 'b7', self.nir_file ) 	

		green_mask	= (green_data <= 0)
		mir_mask	= (mir_data <= 0)
		
		red_mask	= (red_data == 0)
		nir_mask	= (nir_data == 0)

		L = 0.5

		# MNDWI = Modified Normalized Difference Water Index = (Green-MIR)/(Green+MIR) 
		# NDBI = Normalized Difference Built-up Index = (MIR-NIR)/(MIR+NIR)
		# SAVI = Soil Adjusted Vegetation Index = (NIR-Red)*(1+L)/(NIR+Red+L)
		# Label a pixel as water if (MNDWI > NDBI) AND (MNDWI > SAVI) [AND (RedReflectance > 0.13)]
		
		# NDWI = Normalized Difference Water Index (Green-NIR)/(Green+NIR)		Water > 0
		# NDMI = Normalized Difference Moisture Index (NIR-MIR)/(NIR + MIR)		Water > 0
		
		# Water Ratio Index WRI = (Green+Red)/(NIR+RED)
		
		# to avoid divide by zero
		green_data[green_mask]	= 1
		mir_data[mir_mask]		= 1
		nir_data[nir_mask]		= 1
		red_data[red_mask]		= 1

		if verbose:
			print "compute indices"

		#
		# MNDWI
		#
		mndwi 					=  (green_data-mir_data)/(green_data+mir_data)
		ls_mndwi 				= self.linear_stretch(mndwi)
		ls_mndwi[green_mask] 	= 0
		ls_mndwi[mir_mask] 		= 0
		
		self.write_data( ls_mndwi, "mndwi.tif", None)
		
		if verbose:
			print 'MNDWI', numpy.min(mndwi), numpy.mean(mndwi), numpy.max(mndwi)

		#
		# SAVI
		#
		savi 				=  (1.0+L)*(nir_data-red_data)/(nir_data+red_data+L)
		
		ls_savi 			= self.linear_stretch(savi)
		ls_savi[nir_mask] 	= 0
		ls_savi[red_mask] 	= 0
		
		self.write_data( ls_savi, "savi.tif", None)
		if verbose:
			print 'SAVI', numpy.min(savi), numpy.mean(savi), numpy.max(savi)
			
		data 		= ls_mndwi.flatten()	#mndwi	
		hist, bins 	= numpy.histogram(data, bins=256, range=(0,255))
		threshold 	= self.otsu(hist,len(data))
		if verbose:
			print "compute threshold using otsu method", threshold, len(data), numpy.min(data), numpy.mean(data), numpy.max(data)
		
		mask 		= (ls_mndwi > threshold)
			
		ls_mndwi[mask] 			= 1
		ls_mndwi[green_mask] 	= 0
		ls_mndwi[mir_mask] 		= 0

		self.write_data( ls_mndwi, "watermap.tif", self.ct)

		if verbose:
			print "Done"
		
# eo1_watermap.py --scene EO1A0090462012344110KF
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
	
	outdir		= os.path.join(config.EO1_DIR,scene)	
	
	app 		= EO1_ALI(outdir, scene)
	
	app.getMetaData()
	app.getTOAParams()
	
	app.generate_color_table()
	app.process()

