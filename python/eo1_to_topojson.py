#!/usr/bin/env python
#
# Created on 06/26/2014 Pat Cappelaere - Vightel Corporation
#
# Input: EO1 Surface water identified by MNDI + Cloud mask
# Output: topojson vectors
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

import mapnik
from mapnik import DatasourceCache as datasourceCache;

import config

force 	= 0
verbose	= 0

class EO1_ALI_VECTORIZATION:
	def __init__( self, outpath, input_file ):	
		self.input_file 		= input_file
		
		baseFileName			=  os.path.basename(input_file)
		
		self.output_file		= os.path.join(outpath, baseFileName + ".png")
		
		self.hand_file			= os.path.join(outpath, "hand.tif")
		self.hand_rgb			= os.path.join(outpath, "hand_rgb.tif")
		
		self.hand_output_file	= os.path.join(outpath, baseFileName + ".hand.tif")

		self.output_4326_file	= os.path.join(outpath, baseFileName + ".4326.tif")
		self.surface_water_json	= os.path.join(outpath, "surface_water.json")
		self.surface_water_osm	= os.path.join(outpath, "surface_water.osm")

		coastlines				= "osm_marshes.tif"
		self.coastlines			= os.path.join(outpath, coastlines)
		
		self.outpath 			= outpath
		self.hand_dir			= config.HANDS_DIR

	#
	# execute with verbose option
	#
	def execute( self, cmd ):
		if verbose:
			print cmd
		os.system(cmd)
		
	#
	# Reproject
	#
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
	
	def save_hand_as_png(self):
		hand_ds = gdal.Open( self.hand_file )
		if hand_ds is None:
			print('ERROR: hand file no data:')
			sys.exit(-1)

		RasterXSize = hand_ds.RasterXSize
		RasterYSize = hand_ds.RasterYSize
		RasterCount = hand_ds.RasterCount
		
		print "Hand file", RasterXSize, RasterYSize, RasterCount
		
		driver 		= gdal.GetDriverByName( "GTiff" )
		dst_ds 		= driver.Create( self.hand_rgb, RasterXSize, RasterYSize, 1, gdal.GDT_Byte,
			[ 'INTERLEAVE=PIXEL', 'COMPRESS=DEFLATE' ] )

		ct = gdal.ColorTable()
		for i in range(256):
			ct.SetColorEntry( i, (255, 255, 255, 255) )

		# Colorbrewer, sequential, 7
		ct.SetColorEntry( 0, (0, 0, 0, 255) )
		ct.SetColorEntry( 1, (8, 48, 107, 255) )
		ct.SetColorEntry( 2, (8, 81, 156, 255) )
		ct.SetColorEntry( 3, (33, 113, 181, 255) )
		ct.SetColorEntry( 4, (66, 146, 198, 255) )
		ct.SetColorEntry( 5, (107, 174, 214, 255) )
		ct.SetColorEntry( 6, (158, 202, 225, 255) )
		ct.SetColorEntry( 7, (198, 219, 239, 255) )
		ct.SetColorEntry( 8, (222, 235, 2247, 255) )
		ct.SetColorEntry( 9, (247, 251, 255, 255) )

		# ocean
		ct.SetColorEntry( 255, (0, 0, 0, 0) )

		hand = hand_ds.GetRasterBand(1)
		data = hand.ReadAsArray(0, 0, RasterXSize, RasterYSize )
		
		band = dst_ds.GetRasterBand(1)
		band.SetRasterColorTable(ct)
		band.WriteArray(data, 0, 0)
		band.SetNoDataValue(0)
		
		# copy projection
		projection   = hand_ds.GetProjection()
		geotransform = hand_ds.GetGeoTransform()

		dst_ds.SetGeoTransform( geotransform )
		dst_ds.SetProjection( projection )

		dst_ds 		= None
		hand_ds 	= None
		
	#
	# Generate Hand file
	#
	def hand(self, regional_file):		
		base_img 	= self.input_file

		in_img 		= os.path.join(self.hand_dir, regional_file)
		
		# Get a subset of HAND for particular tile
		if force or not os.path.isfile(self.hand_file):
			print "generate hand subset:"+self.hand_file +" from:"+in_img
			cmd = "subset.py "+ base_img + " " + in_img + " " + self.hand_file
			self.execute(cmd)			
			
			#self.save_hand_as_png()
		
		if verbose:
			print "hand done"
	#	
	# Process binary file
	#
	def process(self):
		driver 				= gdal.GetDriverByName( "GTiff" )
		if force or not os.path.exists(self.hand_output_file):		
			if verbose:
				print "processing ", self.input_file
		
			src_ds 				= gdal.Open( self.input_file)
			band 				= src_ds.GetRasterBand(1)
			output_data 		= band.ReadAsArray(0, 0, src_ds.RasterXSize, src_ds.RasterYSize )
		
			self.metadata		= src_ds.GetDriver().GetMetadata()
			self.geotransform 	= src_ds.GetGeoTransform()
			self.projection 	= src_ds.GetProjection()

			self.north 		 	= self.geotransform[3]
			self.west		 	= self.geotransform[0]
			self.south		 	= self.north - self.geotransform[1] * src_ds.RasterYSize
			self.east		 	= self.west + self.geotransform[1] * src_ds.RasterXSize
		
			if verbose:
				print("north: %9.5f south:%9.5f west:%9.5f east:%9.5f" % (self.north, self.south, self.west,self.east	))
				print("bbox:  %9.5f,%9.5f,%9.5f,%9.5f" % (self.west, self.south, self.east, self.north	))
		
			xorg				= self.geotransform[0]
			yorg  				= self.geotransform[3]
			pres				= self.geotransform[1]
			xmax				= xorg + self.geotransform[1]* src_ds.RasterXSize
			ymax				= yorg - self.geotransform[1]* src_ds.RasterYSize
		
			# Create reference water/watershed vectors as well
			# Needed for refining hand & remove coastal zones
			cmd = str.format(os.path.join( "geojson_osm.py")+" --dir {0} --bbox {1} {2} {3} {4} --img {5} {6} --res {7}",	self.outpath, xorg, ymax, xmax, yorg, src_ds.RasterXSize, src_ds.RasterYSize, pres )
			self.execute(cmd)
	
			if verbose:
				print( "get HAND data:"+ self.hand_file)
			
			hand_ds 			= gdal.Open(self.hand_file)
			hand_band 			= hand_ds.GetRasterBand(1)
			hand_data 			= hand_band.ReadAsArray(0, 0, hand_ds.RasterXSize, hand_ds.RasterYSize )

			if verbose:
				print( "get coastlines data:"+ self.coastlines)
				
			coastlines_ds	= gdal.Open(self.coastlines)
			coastal_band 	= coastlines_ds.GetRasterBand(1)
			coastal_data 	= coastal_band.ReadAsArray(0, 0, coastlines_ds.RasterXSize, coastlines_ds.RasterYSize )

			print( "create hand corrected output file:"+ self.hand_output_file)
			hand_output_dataset	= driver.Create( self.hand_output_file, src_ds.RasterXSize, src_ds.RasterYSize, 2, gdal.GDT_Byte,	[ 'COMPRESS=DEFLATE' ] )
			hand_output_band 	= hand_output_dataset.GetRasterBand(1)

			# Add Alpha band
 			#hand_output_dataset.AddBand(gdal.GDT_Byte);
 
			alpha_band			= hand_output_dataset.GetRasterBand(2)
			alpha_data 			= alpha_band.ReadAsArray(0, 0, hand_output_dataset.RasterXSize, hand_output_dataset.RasterYSize )

			# Detected Surface Water
			#mask				= output_data<1
			#output_data[mask]	= 0

			#mask				= output_data>=1
			#output_data[mask]	= 255

			if verbose:
				print "Non Zero Pixels before any masking:",  numpy.count_nonzero(output_data)
		
			# Removed for non-coastal areas... decide if you want to mask watersheds...!!!
			#
			# mask				= (coastal_data==1)
			# output_data[mask]	= 0
		
			# if verbose:
			#	print "Non Zero Pixels After Coastal/Watershed Masking:",  numpy.count_nonzero(output_data)
		
			# Now apply HAND Filter
		
			# Mask HAND
			mask				= hand_data==0
			output_data[mask]	= 0
		
			mask				= hand_data==255
			output_data[mask]	= 0

			if verbose:
				print "Non Zero Pixels after HAND:",  numpy.count_nonzero(output_data)

			#
			# Morphing to smooth and filter the data
			#
			octagon_2 =[[0, 1, 1, 1, 0],
						[1, 1, 1, 1, 1],
						[1, 1, 1, 1, 1],
						[1, 1, 1, 1, 1],
						[0, 1, 1, 1, 0]]
			octagon_2_size = (5,5)
		
			octagon_1 =[[0, 1, 0],
						[1, 1, 1],
						[0, 1, 0]]
			octagon_1_size = (3,3)

			#morphed = ndimage.grey_opening(output_data, size=octagon_1_size, structure=octagon_1)

			ct = gdal.ColorTable()
			ct.SetColorEntry( 0, (0, 0, 0, 0) )
			ct.SetColorEntry( 1, (255, 0, 0, 255) )
			hand_output_band.SetRasterColorTable(ct)

			hand_output_band.WriteArray(output_data, 0, 0)
			hand_output_band.SetNoDataValue(0)

			# set transparency
			alpha_data[output_data<1]=0
			alpha_data[output_data>=1]=255
			alpha_band.WriteArray(alpha_data, 0, 0)
		
			# Copy projection
			hand_output_dataset.SetGeoTransform( self.geotransform )
			hand_output_dataset.SetProjection( self.projection )
		
			src_ds				= None
			hand_band			= None
			hand_data			= None
			hand_output_dataset = None
			coastal_data		= None
			coastlines_ds		= None
		
			if verbose:
				print ("done")
			
	def geojson(self):
		infile		= self.hand_output_file		# use hand corrected file
		indataset 	= gdal.Open( infile )
		geomatrix 	= indataset.GetGeoTransform()
		rasterXSize = indataset.RasterXSize
		rasterYSize = indataset.RasterYSize

		xorg		= geomatrix[0]
		yorg  		= geomatrix[3]
		pres		= geomatrix[1]
		xmax		= xorg + geomatrix[1]* rasterXSize
		ymax		= yorg - geomatrix[1]* rasterYSize

		#print geomatrix
		#print rasterXSize, rasterYSize
		if verbose:
			print "geojson bbox:", xorg, yorg, xmax, ymax

		file = infile + ".png"

		if force or not os.path.exists(file):
			# subset it, convert red band (band 1) and output to .pgm using PNM driver
			cmd = "gdal_translate  -q " + infile + " -b 1 -of PNG -ot Byte "+file
			self.execute(cmd)
			self.execute("rm -f "+file+".aux.xml")

		file = infile + ".pgm"

		if force or not os.path.exists(file):
			# subset it, convert red band (band 1) and output to .pgm using PNM driver
			cmd = "gdal_translate  -q -scale 0 1 0 65535 " + infile + " -b 1 -of PNM -ot Byte "+file
			self.execute( cmd )
			self.execute("rm -f "+file+".aux.xml")

		# -i  		invert before processing
		# -t 2  	suppress speckles of up to this many pixels. 
		# -a 1.5  	set the corner threshold parameter
		# -z black  specify how to resolve ambiguities in path decomposition. Must be one of black, white, right, left, minority, majority, or random. Default is minority
		# -x 		scaling factor
		# -L		left margin
		# -B		bottom margin

		if force or not os.path.exists(file+".geojson"):
			cmd = str.format("potrace -z black -a 1.5 -t 2 -i -b geojson -o {0} {1} -x {2} -L {3} -B {4} ", file+".geojson", file, pres, xorg, ymax ); 
			self.execute(cmd)

		if force or not os.path.exists(file+".topojson.gz"):
			cmd = str.format("topojson -o {0} --simplify-proportion 0.5 -- surface_water={1}", file+".topojson", file+".geojson"); 
			self.execute(cmd)

			# convert back to geojson now that it has been simplified
			cmd = str.format("topojson-geojson --precision 5 -o {0} {1}", self.outpath, file+".topojson" ); 
			self.execute(cmd)

		# convert it to OSM to visualize in JOSM and update reference water
		if force or not os.path.exists(self.surface_water_osm):
			data_source = "eo-1"
			cmd = str.format("node geojson2osm {0} {1}", self.surface_water_json, data_source ); 
			self.execute(cmd)
			
			# gzip it
			cmd = str.format("gzip {0} ", file+".topojson" ); 
			self.execute(cmd)
			
			# compress it			
			cmd = "bzip2 " + self.surface_water_osm
			self.execute(cmd)
	
			cmd = str.format("gzip {0} ", self.surface_water_json ); 
			self.execute(cmd)
	
#
# Example: eo1_to_topojson.py --scene EO1A0090472014197110P0_SG1_01 -v
#

if __name__ == '__main__':
	print "Starting..."
	version_num = int(gdal.VersionInfo('VERSION_NUM'))
	if version_num < 1800: # because of GetGeoTransform(can_return_null)
		print('ERROR: Python bindings of GDAL 1.8.0 or later required')
		sys.exit(1)

	err = which("convert")
	if err == None:
		print "convert missing"
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
		
	parser = argparse.ArgumentParser(description='Generate EO-1 Floodmap vectors')
	apg_input = parser.add_argument_group('Input')
	apg_input.add_argument("-f", "--force", 	action='store_true', help="Forces new product to be generated")
	apg_input.add_argument("-v", "--verbose", 	action='store_true', help="Verbose on/off")
	#apg_input.add_argument("-i", "--input",  	help="Input File")
	#apg_input.add_argument("-d", "--dir",  	help="Output Directory")
	#apg_input.add_argument("-t", "--vrt", 		help="Hand VRT to use")
	apg_input.add_argument("-s", "--scene", 	help="Landsat Scene")

	options 	= parser.parse_args()
	force		= options.force
	verbose		= options.verbose
	
	regional_hand	= config.HANDS_AREA + "_hand_merged_lzw.tif"
	
	scene	 	= options.scene.split("_")[0]
	
	outdir		= os.path.join(config.EO1_DIR,options.scene)	
	infile 		= os.path.join(outdir, scene+"_WATERMAP.tif")
	
	# make sure the input file exists
	if not os.path.exists(infile):
		print "Input file does not exists", infile
		sys.exit(-1)

	app 		= EO1_ALI_VECTORIZATION(outdir, infile)
	
	# app.reproject("EPSG:4326", app.input_file, app.output_4326_file )
	
	app.hand(regional_hand)
	app.process()
	app.geojson()

