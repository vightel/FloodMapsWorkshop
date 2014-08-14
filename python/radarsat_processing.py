#!/usr/bin/env python
#
# Created on 3/23/2012 Pat Cappelaere - Vightel Corporation
# by taking help from
# http://benjamindeschamps.ca/blog/2009/11/12/processing-radarsat-2-imagery-reading-raw-data-and-saving-rgb-composites/
# and sat kumar tomer (http://civil.iisc.ernet.in/~satkumar/)
#
# Requirements:
#	gdal, numpy, scipy...

import os, inspect
import argparse

import sys, urllib, httplib, subprocess

import numpy
import math
import shutil
import zipfile

#NoneType = type(None)
import scipy.signal
from scipy import ndimage

import pprint
import mapnik
from mapnik import DatasourceCache as datasourceCache;

from osgeo import gdal
from osgeo import osr
from osgeo import ogr

import config
#import ogr2osm
from which import *

from xml.dom import minidom

from datetime import datetime
import config

BASE_DIR = config.RADARSAT2_DIR;
HAND_DIR = config.HANDS_DIR
HAND_VRT = config.HANDS_AREA + "_hand.vrt"

class Radarsat2:
	def execute( self, cmd ):
		if self.verbose:
			print cmd
		os.system(cmd)
		
	def tolatlon(self,x,y):
		adfGeoTransform = self.geotransform
		dfGeoX = adfGeoTransform[0] + adfGeoTransform[1] * x + adfGeoTransform[2] * y
		dfGeoY = adfGeoTransform[3] + adfGeoTransform[4] * x + adfGeoTransform[5] * y
		return dfGeoX, dfGeoY
		
	def __init__( self, cwd, inpath, verbose ):
		if verbose:
			print("Processing: %s" % inpath)
	
		self.inpath 					= inpath
		self.cwd						= cwd
		
		# get the scene out of inpath
		arr 							= map(str, inpath.split('/'))
		self.scene 						= arr[len(arr)-1]

		input_file						= "imagery_HH.tif"		
		output_copy						= "outputfile_raw.tif"	
		output_4326						= "outputfile_4326.tif"	
		output_4326_vrt					= "outputfile_4326.vrt"	
		output_4326_rgb					= "outputfile_4326_rgb.tif"	
		output_4326_hand				= "outputfile_4326_hand.tif"	
		
		output_3857						= "outputfile_3857.tif"	
		output_3857_vrt					= "outputfile_3857.vrt"	
		output_3857_rgb					= "outputfile_3857_rgb.tif"	
		output_3857_hand				= "outputfile_3857_hand.tif"	
		
		output_4326_shp					= "outputfile_4326.shp"	
		
		hand_3857						= "hand_3857.tif"
		hand_3857_vrt					= "hand_3857_vrt.tif"
		
		hand_4326						= "hand_4326.tif"
		hand_4326_vrt					= "hand_4326_vrt.tif"
		
		output_basename					= "outputfile_sigma.tif"	
		output_merc_basename			= "outputfile_sigma_mercator.tif"	
		
		output_basename_a				= "outputfile_sigma_alpha.tif"	
		output_merc_basename_a			= "outputfile_sigma_mercator_alpha.tif"	
		output_merc_vrt					= "outputfile_sigma_mercator_alpha_vrt.tif"	
		
		incidence_basename 				= "outputfile_ia.tif"
		osm_basename 					= "outputfile_osm.xml"
		water_mask 						= "water_mask.tif"
		osm_water						= "osm_water.png"
		dem 							= "dem.tif"
		hillshaded 						= "hillshaded.tif"
		color_relief					= "color-relief.tif"
		flood_elevation_model			= "flood-elevation-model.tif"
		color_composite					= "composite.tif"
		dem 							= "dem.tif"
		asterdem_watermask				= "asterdem_watermask.tif"
		dem_merc						= "dem_merc.tif"
		dem_clipped						= "dem_clipped.tif"
		browse_image					= "BrowseImage"
		outputbrowse_image				= "surface_water.png"
		osm_bg_image					= "osm_bg_image.png"
		sw_osm_image					= "surface_water_osm.png"
		
		coastlines						= "osm_coastal.tif"
		self.coastlines					= os.path.join(inpath, coastlines)

		self.hand_dir					= HAND_DIR
		
		self.input_file					= os.path.join(inpath, input_file)
		self.output_4326				= os.path.join(inpath, output_4326)
		self.output_4326_vrt			= os.path.join(inpath, output_4326_vrt)
		self.output_4326_rgb			= os.path.join(inpath, output_4326_rgb)
		self.output_4326_shp			= os.path.join(inpath, "shp", output_4326_shp)
		self.output_4326_hand			= os.path.join(inpath, output_4326_hand)
		
		self.osm_coastal				= os.path.join(inpath, "osm_coastal.tif")
		self.masked_output_4326_rgb		= os.path.join(inpath, "masked_"+output_4326_rgb)
		
		self.hand_3857					= os.path.join(inpath, hand_3857)
		self.hand_3857_vrt				= os.path.join(inpath, hand_3857_vrt)
		self.hand_4326					= os.path.join(inpath, hand_4326)
		self.hand_4326_vrt				= os.path.join(inpath, hand_4326_vrt)
		
		self.output_3857				= os.path.join(inpath, output_3857)
		self.output_3857_vrt			= os.path.join(inpath, output_3857_vrt)
		self.output_3857_rgb			= os.path.join(inpath, output_3857_rgb)
		self.output_3857_hand			= os.path.join(inpath, output_3857_hand)
		
		self.output_copy				= os.path.join(inpath, output_copy)
		self.output_full_name			= os.path.join(inpath, output_basename)
		self.output_merc_full_name		= os.path.join(inpath, output_merc_basename)

		self.output_full_name_a			= os.path.join(inpath, output_basename_a)
		self.output_merc_full_name_a	= os.path.join(inpath, output_merc_basename_a)
		self.output_merc_vrt			= os.path.join(inpath, output_merc_vrt)
		
		self.incidence_full_name		= os.path.join(inpath, incidence_basename)
		self.osm_basename				= os.path.join(inpath, osm_basename)
		self.water_mask					= os.path.join(inpath, self.scene, water_mask)
		self.osm_water					= os.path.join(inpath, osm_water)
		
		self.dem						= os.path.join(inpath, "mbtiles", dem)
		self.asterdem_watermask			= os.path.join(inpath, self.scene,dem)
		self.flood_elevation_model		= os.path.join(inpath, self.scene, flood_elevation_model)
		
		self.dem_clipped				= os.path.join(inpath, "mbtiles", dem_clipped)
		self.dem_merc					= os.path.join(inpath, "mbtiles", dem_merc)
		self.hillshaded					= os.path.join(inpath, "mbtiles", hillshaded)
		self.color_relief				= os.path.join(inpath, "mbtiles", color_relief)
		self.color_composite			= os.path.join(inpath, "mbtiles", color_composite)
		
		self.browse_image				= os.path.join(inpath,browse_image)
		self.outputbrowse_image			= os.path.join(inpath,outputbrowse_image)
		self.osm_bg_image				= os.path.join(inpath,osm_bg_image)
		self.sw_osm_image				= os.path.join(inpath,sw_osm_image)

	#
	# Apply Speckle filter
	#
	def speckle_filter(self, filter_name, ws):
		if app.verbose:
			print("filter it..")

		# we need to turn it to float
		self.data = 1.*self.data
		if filter_name == 'median':
			self.data = scipy.signal.medfilt2d(self.data, kernel_size=ws)
		elif filter_name == 'wiener':
			self.data = scipy.signal.wiener(self.data,mysize=(ws,ws),noise=None)

	#
	# Relative hard thresholding
	#
	def threshold( self ):
		mean = numpy.mean(self.data)
		if app.verbose:
			print( "thresholding - mean: %f threshold: %f" % (mean, mean/2))
		self.data = ( self.data < mean/2 )
		if app.verbose:
			print( "done.")

	#
	# Save processed data back in the file
	#
	def save_tiff(self):
		# save the copy after processing
		print "saving processed data..."

		band = self.input_dataset.GetRasterBand(1)

		band.WriteArray(self.data, 0, 0)
		band.SetNoDataValue(0)
		self.data			= None
		self.input_dataset 	= None
		# data has been saved back in same file as a bit mask (0..1)

	#
	# File was too large to be processed... process by subsets
	#
	def process_subsets(self):
		if app.verbose:
			print "Process all subsets..."
		# will need that for thresholding all files the same way
		mean = numpy.mean(self.data)
		#print "Mean:", mean

		divideBy 	= 2
		xmin		= 0
		ymin		= 0
		xinc		= self.rasterXSize/divideBy
		yinc		= self.rasterYSize/divideBy
		xmax		= xinc
		ymax		= yinc

		for j in range(0, divideBy):	
			for i in range(0, divideBy):
				if app.verbose:
					print "processing subset", ymin,":",ymax,",",xmin,":",xmax

				# one subset at at time
				subset = self.data[ymin:ymax,xmin:xmax]

				# Threshold it
				if app.verbose:
					print "Threshold it..."
				# and save it as float to despeckle it
				subset = ( subset < mean/2 )

				# Despeckle
				if app.verbose:
					print "Despeckle it..."

				subset = 1.0 * subset	# there might be a better way to keep it as Int8 but...not sure how to recast it
				subset = scipy.signal.medfilt2d(subset, kernel_size=3)
				subset = 1 * subset	# there might be a better way to keep it as Int8 but...not sure how to recast it

				#print "Save it..."
				#band.WriteArray(self.data, 0, 0)
				#use numpy slicing
				self.data[ymin:ymax,xmin:xmax] = subset
				xmin = xmin + xinc
				xmax = xmax + xinc

			ymin = ymin + yinc
			ymax = ymax + yinc
			xmin = 0
			xmax = xinc

		subset 			= None
		input_dataset 	= None

		band = self.input_dataset.GetRasterBand(1)
		band.WriteArray(self.data, 0, 0)
		self.data 			= None
		self.input_dataset 	= None

	#
	# Process raw data... thresholding, despecking...
	#
	def process_raw_data(self):
		if self.force or not os.path.isfile(self.output_copy):
			format = "GTiff"
			driver = gdal.GetDriverByName( format )

			#print "Copying ", self.input_file
			src_ds = gdal.Open( self.input_file )
			# will be open as writeable as well
			self.input_dataset = driver.CreateCopy( self.output_copy, src_ds, 0,
				[ 'COMPRESS=DEFLATE' ] )

			self.rasterXSize 	= self.input_dataset.RasterXSize
			self.rasterYSize 	= self.input_dataset.RasterYSize
			self.total 			= self.rasterXSize * self.rasterYSize * 4

			self.total /= 1024	#KB
			self.total /= 1024	#MB
			if app.verbose:
				print 'Total Size is: ', self.total, "MB"

			band 	= self.input_dataset.GetRasterBand(1)
			# get sinclair matrix
			if app.verbose:
				print "Read data..."
			self.data = band.ReadAsArray(0, 0, self.rasterXSize, self.rasterYSize )

			if self.total < 1024:			# from 1500
				self.threshold()
				self.speckle_filter('median', 3)
				self.save_tiff()		
			else:
				self.process_subsets()	

	#
	# Reproject with alpha mask
	#
	def reproject( self, epsg, out_file):
		# remove out_file if it already exists
		if os.path.isfile(out_file):
			os.remove(out_file)

		cmd = "gdalwarp -of GTiff -co COMPRESS=DEFLATE -t_srs "+ epsg +" -multi -dstalpha " + self.output_copy + " " + out_file
		self.execute(cmd)

	#
	# Generate Virtual File
	#
	def generate_vrt(self, out_file, out_vrt):
		# Generate VRT file
		cmd = "gdal_translate -q -of VRT " + out_file + " " + out_vrt
		self.execute(cmd)

	#
	# Add colortable to colorize file with gdal_translate -expand rgba
	#	
	def add_colortable_to_vrt( self, out_vrt):
		# We need to edit the virtual file to add a colortable
		dom = minidom.parse(out_vrt)
		cinterp = dom.getElementsByTagName('ColorInterp')[0]
		if cinterp.firstChild.nodeType != cinterp.TEXT_NODE:
			raise Exception("node does not contain text")

		cinterp.firstChild.replaceWholeText("Palette")
		cinterp.firstChild.replaceWholeText("Palette")

		xmlTag 	= dom.getElementsByTagName('VRTRasterBand')[0]
		ct 		= dom.createElement("ColorTable")

		e 		= dom.createElement("Entry")
		e.setAttribute('c1', '0')
		e.setAttribute('c2', '0')
		e.setAttribute('c3', '0')
		e.setAttribute('c4', '0')		# but does not seem to work
		ct.appendChild(e)

		e 		= dom.createElement("Entry")
		e.setAttribute('c1', '255')
		e.setAttribute('c2', '0')
		e.setAttribute('c3', '0')
		e.setAttribute('c4', '255')
		ct.appendChild(e)
		xmlTag.appendChild(ct)

		file = open(out_vrt, 'w')
		file.write(dom.toxml())
		file.close()
		print "vrt updated with color palette"

	#
	# Generate Subset HAND file
	def generate_hand_subset(self, base_img, in_img, out_img):
		if self.force or not os.path.isfile(out_img):
			cmd = os.path.join(self.cwd, "subset.py")+" "+ base_img + " " + in_img + " " + out_img
			self.execute(cmd)

	#
	# Height Above Nearest Drainage
	#
	def hand(self):
		base_img 		= self.output_4326

		in_img 			= os.path.join(self.hand_dir, HAND_VRT)
		out_img			= self.hand_4326

		# Get a subset of HAND for particular tile
		#if self.force or not os.path.isfile(out_img):
		#print "generate hand subset:"+out_img +" from:"+in_img
		self.generate_hand_subset(base_img, in_img, out_img)

		#if not os.path.isfile(self.hand_4326) and not self.force:
		#	cmd = "gdalwarp -of GTIFF "+ out_img + " " + self.hand_4326
		#	print cmd
		#	err = os.system(cmd)
		#	print "Generating HAND Tif error:", err
		#	#sys.exit(0)

		if os.path.isfile(self.output_4326_hand) and not self.force:
			return

		if verbose:
			print "Generating ", self.output_4326_hand

		src_ds 			= gdal.Open( self.output_4326_rgb )

		driver 			= gdal.GetDriverByName( "GTiff" )
		input_dataset	= driver.CreateCopy( self.output_4326_hand, src_ds, 0,	[ 'COMPRESS=DEFLATE' ] )

		input_band 		= input_dataset.GetRasterBand(1)
		input_data 		= input_band.ReadAsArray(0, 0, input_dataset.RasterXSize, input_dataset.RasterYSize )

		alpha_band		= input_dataset.GetRasterBand(4)
		alpha_data 		= alpha_band.ReadAsArray(0, 0, input_dataset.RasterXSize, input_dataset.RasterYSize )

		hand_ds 		= gdal.Open(out_img)
		hand_band 		= hand_ds.GetRasterBand(1)
		hand_data 		= hand_band.ReadAsArray(0, 0, hand_ds.RasterXSize, hand_ds.RasterYSize )

		coastlines_ds	= gdal.Open(self.coastlines)
		coastal_band 	= coastlines_ds.GetRasterBand(1)
		coastal_data 	= coastal_band.ReadAsArray(0, 0, coastlines_ds.RasterXSize, coastlines_ds.RasterYSize )
		
		if app.verbose:
			print "hand_data:", hand_data.min(), hand_data.max()

		# HAND Masking
		mask			= hand_data==0
		input_data[mask]= 0

		mask			= hand_data==255
		input_data[mask]= 0

		mask			= coastal_data>0
		input_data[mask]= 0

		#
		# Morphing to smooth and filter the data
		#
		octagon_2 =[[0, 1, 1, 1, 0],
					[1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1],
					[1, 1, 1, 1, 1],
					[0, 1, 1, 1, 0]]

		morphed = ndimage.grey_opening(input_data, size=(5,5), structure=octagon_2)

		input_band.WriteArray(morphed, 0, 0)
		input_band.SetNoDataValue(0)

		# set transparency
		alpha_data[morphed<255]=0
		alpha_data[morphed>=255]=255
		alpha_band.WriteArray(alpha_data, 0, 0)

		input_data 		= None
		morphed			= None
		input_dataset 	= None
		hand_band		= None
		hand_ds			= None
		src_ds			= None
		coastlines_ds	= None
		
		if app.verbose:
			print "Hand Morphed Done ", self.output_4326_hand
		
	# ======================================
	# Convert CSA BrowseImage tif to png to use this in browser easily
	#
	def convert_browse_image(self):
		cmd = str.format("convert {0}.tif {0}.png", self.browse_image ); 
		self.execute(cmd)
		

	# ======================================
	# Reproject to 4326 
	#
	def process_to_4326(self):

		if self.force or not os.path.isfile(self.output_4326):
			self.reproject("EPSG:4326", self.output_4326)

		if self.force or not os.path.isfile(self.output_4326_vrt):
			self.generate_vrt(self.output_4326, self.output_4326_vrt)
			self.add_colortable_to_vrt(self.output_4326_vrt)

		# Let's generate the rgb in that projection
		# generate the RGB file first
		if self.force or not os.path.isfile(self.output_4326_rgb):
			cmd = "gdal_translate -q -of GTiff -ot byte -expand rgba  -co COMPRESS=DEFLATE " + self.output_4326_vrt + " " + self.output_4326_rgb
			self.execute(cmd)

		# Before we go any further, we need our new projected bbox
		ds = gdal.Open( self.output_4326_rgb )
		if ds is None:
			print("Error opening: "+ self.output_4326_rgb)
			sys.exit(-1)

		if app.verbose:
			print 'Size is ', ds.RasterXSize,'x', ds.RasterYSize, 'x', ds.RasterCount
			print 'Projection is ', ds.GetProjection()

		self.metadata		= ds.GetDriver().GetMetadata()
		self.geotransform 	= ds.GetGeoTransform()

		self.north 		 	= self.geotransform[3]
		self.west		 	= self.geotransform[0]
		self.south		 	= self.north - self.geotransform[1]* ds.RasterYSize
		self.east		 	= self.west + self.geotransform[1]* ds.RasterXSize

		#print self.geotransform
		#print ds.RasterYSize, ds.RasterYSize
		if app.verbose:
			print("north: %9.5f south:%9.5f west:%9.5f east:%9.5f" % (self.north, self.south, self.west,self.east	))
			print("bbox:  %9.5f,%9.5f,%9.5f,%9.5f" % (self.west, self.south, self.east, self.north	))
		
		xorg		= self.geotransform[0]
		yorg  		= self.geotransform[3]
		pres		= self.geotransform[1]
		xmax		= xorg + self.geotransform[1]* ds.RasterXSize
		ymax		= yorg - self.geotransform[1]* ds.RasterYSize

		# Create reference water/watershed vectors as well
		# Needed for refining hand & remove coastal zones
		cmd = str.format(os.path.join(self.cwd, "geojson_osm.py")+" --dir {0} --bbox {1} {2} {3} {4} --img {5} {6} --res {7}",
			self.inpath, xorg, ymax, xmax, yorg, ds.RasterXSize, ds.RasterYSize, pres )
		self.execute(cmd)

		# Check Height Above Nearest Drainage to remove noise artifacts
		self.hand()
		
		self.bbox = str.format("BBOX={0},{1},{2},{3}", xorg, ymax, xmax, yorg)

	# ======================================
	# Generate flood vectors
	#
	def geojson_4326(self):
		infile 			= self.output_4326_hand
		
		self.geojson( infile )
		
	def geojson(self, infile):
		indataset 		= gdal.Open( infile )
		geomatrix 		= indataset.GetGeoTransform()
		rasterXSize 	= indataset.RasterXSize
		rasterYSize 	= indataset.RasterYSize

		xorg			= geomatrix[0]
		yorg  			= geomatrix[3]
		pres			= geomatrix[1]
		xmax			= xorg + geomatrix[1]* rasterXSize
		ymax			= yorg - geomatrix[1]* rasterYSize
		
		#print geomatrix
		#print rasterXSize, rasterYSize
		#print "geojson bbox:", xorg, ymax, xmax, yorg
		
		file = infile + ".pgm"

		if app.force or not os.path.exists(file+".topojson"):
			# subset it, convert red band (band 1) and output to .pgm using PNM driver
			cmd = "gdal_translate  -q -of PNM " + infile + " -b 1 -ot Byte "+file
			self.execute(cmd)
			
			cmd = "rm -f "+file+".aux.xml"
			self.execute(cmd)

		# -i  		invert before processing
		# -t 2  	suppress speckles of up to this many pixels. 
		# -a 1.5  	set the corner threshold parameter
		# -z black  specify how to resolve ambiguities in path decomposition. Must be one of black, white, right, left, minority, majority, or random. Default is minority
		# -x 		scaling factor
		# -L		left margin
		# -B		bottom margin

			cmd = str.format("potrace -z black -a 1.5 -t 2 -i -b geojson -o {0} {1} -x {2} -L {3} -B {4} ", file+".geojson", file, pres, xorg, ymax ); 
			self.execute(cmd)

			cmd = str.format("topojson -o {0} -- surface_water={1}", file+".topojson", file+".geojson" ); 
			self.execute(cmd)

		cmd = "rm -f "+file+".geojson"
		self.execute(cmd)
		
		cmd = "rm -f "+file
		self.execute(cmd)
		
		dir = os.path.dirname(file)
		surface_water_file = os.path.join(dir, "surface_water.json")
		if app.force or not os.path.exists(surface_water_file):
			cmd = "topojson-geojson -o %s --precision 5 --id-property surface_water -- %s" %(dir, file+".topojson")
			self.execute(cmd)
			
		cmd = "mv "+file+".topojson "+ os.path.join(dir,"surface_water.topojson")
		self.execute(cmd)
		
		# Transform to KMZ
		#cmd = os.path.join(self.cwd,"geojson2kmz.py")+" --input %s --scene %s" %(surface_water_file, self.scene)
		#self.execute(cmd)
		
		# Transform to OSM.bz2
		surface_water_osm_file = os.path.join(dir, "surface_water.osm")
		if app.force or not os.path.exists(surface_water_osm_file):
			data_source = "radarsat-2"
			cmd = str.format("node geojson2osm {0} {1} ", surface_water_file, data_source)
			self.execute(cmd)

			cmd = "bzip2 " + surface_water_osm_file
			self.execute(cmd)
		
		# Compress [geo]json
		surface_water_json_file = os.path.join(dir, "surface_water.json")
		surface_water_json_tgz_file = os.path.join(dir, "surface_water.json.gz")
		if app.force or not os.path.exists(surface_water_json_tgz_file):
			cmd = str.format("gzip {0} ", surface_water_json_file ); 
			self.execute(cmd)

		# Compress original json
		surface_water_topojson_file = os.path.join(dir, "surface_water.topojson")
		surface_water_topojson_tgz_file = os.path.join(dir, "surface_water.topojson.gz")
		if app.force or not os.path.exists(surface_water_topojson_tgz_file):
			cmd = str.format("gzip {0} ", surface_water_topojson_file ); 
			self.execute(cmd)
			
	
	def clear_all_artifacts(self, dir, scene):
		# Remove older artifacts
		os.system( "rm -f " + dir + "/output_*")
		os.system( "rm -f " + dir + "/*outputfile_*")
	
		os.system( "rm -rf " + dir + "/mapnik")
		os.system( "rm -rf " + dir + "/osm")
		os.system( "rm -rf " + dir + "/osm_tiles")
		os.system( "rm -rf " + dir + "/mb_tiles")
		os.system( "rm -rf " + dir + "/" + scene)
	
		os.system( "rm -f " + dir + "/" + scene + ".*")
		os.system( "rm -f " + dir + "/product.kmz")
		os.system( "rm -f " + dir + "/all.osm.tar.bz2")
		os.system( "rm -f " + dir + "/*_water*")
		os.system( "rm -f " + dir + "/osm*")
		os.system( "rm -f " + dir + "/hand*")
		os.system( "rm -f " + dir + "/pop_density*")
		
	
if __name__ == '__main__':
	version_num = int(gdal.VersionInfo('VERSION_NUM'))
	if version_num < 1800: # because of GetGeoTransform(can_return_null)
		print('ERROR: Python bindings of GDAL 1.8.0 or later required')
		sys.exit(1)

	err = which("convert")
	if err == None:
		print "convert missing... brew install imagemagick --with-libtiff"
		sys.exit(-1)

	err = which("bzip2")
	if err == None:
		print "bzip2 missing"
		sys.exit(-1)

	err = which("potrace")
	if err == None:
		print "potrace missing"
		sys.exit(-1)

	err = which("topojson")
	if err == None:
		print "topojson missing"
		sys.exit(-1)

	# make sure that mapnik has the gdal plugin
	if not 'gdal' in datasourceCache.plugin_names():
		print "Missing 'gdal' input plugin in mapnik - brew install mapnik --with-gdal --with-postgresql --with-cairo"
		sys.exit(-1)
			
	cwd = os.path.dirname(sys.argv[0])
	#dir = BASE_DIR;

	parser = argparse.ArgumentParser(description='Process Radarsat2 scene')
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
		print "** Radarsat Processing start:", str(datetime.now())

	inpath 		= os.path.join(BASE_DIR, scene)
		
	app 		= Radarsat2(cwd, inpath, verbose)
	app.force 	= force
	app.verbose	= verbose
	
	if clean:
		app.clear_all_artifacts(inpath, scene)

	app.process_raw_data()

	# Just to make sure it is destroyed to save the memory
	app.input_dataset 	= None
	app.data			= None	

	# Convert BrowseImage.tif to BrowseImage.png so we can use it in Browser
	if app.force or not os.path.isfile(app.browse_image+".png"):
		app.convert_browse_image()

	app.process_to_4326()
	
	app.geojson_4326()

	cmd = os.path.join(cwd,"browseimage.py %s" % (app.inpath))
	if app.force:
		cmd += " -f "
	if verbose:
		print cmd
		
	os.system(cmd)
	
	if verbose:	
		print "**End:", str(datetime.now())

	sys.exit(1)