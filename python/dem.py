#!/usr/bin/env python
#
# Created on 7/5/2013 Pat Cappelaere - Vightel Corporation
# 
# Requirements:
#	gdal...
#
# DEM Manipulation and Visualization utilities for HydroSHEDS
#
# Inpiration from:
# http://blog.thematicmapping.org/2012/07/terrain-mapping-with-mapnik.html
#
#
import os, inspect
import argparse
import subprocess

import sys, urllib, httplib
from datetime import datetime

import math
import numpy

from osgeo import gdal
from osgeo import osr
from osgeo import ogr

from which import *

import mapnik
from mapnik import DatasourceCache as c;

import config

class DEM:
	
	def __init__( self, tile, zone, force, bbox, target, infile ):
		self.hydroSHEDS_dir		 	= config.HYDROSHEDS_DIR	
		self.HANDS_DIR		 		= config.HANDS_DIR	
		self.tile					= tile
		self.zone					= zone
		self.force					= force
		self.bbox					= bbox
		self.target					= target
		
		if zone and tile:
			self.dem_dir 			= os.path.join(self.hydroSHEDS_dir, zone, tile, tile+"_dem_bil")
			self.RasterXSize 		= 5855
			self.RasterYSize 		= 6142
			
		if bbox and target:
			self.dem_vrt 			= os.path.join(self.HANDS_DIR, config.HANDS_AREA+ "_dem.vrt")
			self.dem_dir 			= target
			self.tile				= "na"
			self.infile				= os.path.join(target, infile)
	
	def hillshade(self):
		src  = os.path.join(self.dem_dir, self.tile + "_dem_4326.tif")
		dest = os.path.join(self.dem_dir, self.tile + "_dem_hillshade_4326.tif")
		
		if not os.path.isfile(dest) or self.force:
			cmd = "gdaldem hillshade -co compress=lzw " + src + " " + dest
			print cmd
			err = os.system(cmd)
			if err != 0:
				print('ERROR: hillshade file could not be generated:', err)
				sys.exit(-1)
		
	def color_relief(self):	
		color_txt_file 	= "./dem_color_relief.txt"
		src  			= os.path.join(self.dem_dir, self.tile + "_dem_4326.tif")
		dest  			= os.path.join(self.dem_dir, self.tile + "_dem_color_relief_4326.tif")
		legend			= os.path.join(self.dem_dir, "na_dem_legend.png")
		
		ds = gdal.Open( src )
		if ds is None:
			print('ERROR: file no data:', src)
			sys.exit(-1)
	
		band 				= ds.GetRasterBand(1)
		self.RasterXSize 	= ds.RasterXSize
		self.RasterYSize 	= ds.RasterYSize
	
		(min,max,mean, stddev) = band.GetStatistics(1,1)
		print 'Min=%.3f, Max=%.3f Mean=%.3f Stdev=%.3f' % (min,max,mean,stddev)
    
		# generate the color_relief.txt file
		mid_lower 	= (min+mean)/2
		mid_higher 	= (max+mean)/2
	
		str =  "%.2f 110 220 110\n" % (min) 
		str += "%.2f 240 250 160\n" % (mid_lower)
		str += "%.2f 230 220 170\n" % (mean)
		str += "%.2f 220 220 220\n" % (mid_higher)
		str += "%.2f 250 250 250\n" % (max)
	
		if not os.path.isfile(color_txt_file) or self.force:
			f = open(color_txt_file, 'w')
			f.write(str)
			f.close()

		ds 		= None
		band 	= None
		
		if not os.path.isfile(dest) or self.force:
			cmd ="gdaldem color-relief " + src + " " + color_txt_file + " " + dest
			err = os.system(cmd)
			if err != 0:
				print('ERROR: color_relief file could not be generated:', err)
				sys.exit(-1)

		#if not os.path.isfile(legend) or self.force:
		#	if self.tile == "na":
		#		cmd ="hand_legend.py -l %.0f %.0f %.0f %0.f %0.f --dir %s " % (min, mid_lower, mean, mid_higher, max, self.target)
		#	else:
		#		cmd ="hand_legend.py -l %.0f %.0f %.0f %0.f %0.f -t %s -z %s" % (min, mid_lower, mean, mid_higher, max, self.tile, self.zone)

		#	print cmd
		#	err = os.system(cmd)
		#	if err != 0:
		#		print('ERROR: legend file could not be generated:', err)
		#		sys.exit(-1)

	def slopeshade(self):
		slope_txt_file 	= "./color_slope.txt"
		src  			= os.path.join(self.dem_dir, self.tile + "_dem_4326.tif")
		slope  			= os.path.join(self.dem_dir, self.tile + "_dem_slope_4326.tif")
		slopeshade		= os.path.join(self.dem_dir, self.tile + "_dem_slopeshade_4326.tif")

 		if not os.path.isfile(slope) or self.force:
			cmd = "gdaldem slope " + src + " " + slope 
			print cmd
			err = os.system(cmd)
			if err != 0:
				print('ERROR: slope file could not be generated:', err)
				sys.exit(-1)

 		if not os.path.isfile(slope_txt_file):
			print "Creating ", slope_txt_file
			str =  "0 255 255 255\n"
			str += "90 0 0 0"
			f = open(slope_txt_file, 'w')
			f.write(str)
			f.close()

		if not os.path.isfile(slopeshade) or self.force:
			cmd ="gdaldem color-relief " +  slope + " " + slope_txt_file + " " + slopeshade
			print cmd
			err = os.system(cmd)
			if err != 0:
				print('ERROR: slopeshade file could not be generated:', err)
				sys.exit(-1)
	
	def water_relief(self):
		xml_file 		= os.path.join(self.dem_dir, "na_terrain.xml")
		slopeshade		= os.path.join(self.dem_dir, self.tile + "_dem_slopeshade_4326.tif")
		hillshade		= os.path.join(self.dem_dir, self.tile + "_dem_hillshade_4326.tif")
		color_relief	= os.path.join(self.dem_dir, self.tile + "_dem_color_relief_4326.tif")
		relief			= os.path.join(self.dem_dir, self.tile + "_dem_relief_4326.tif")
		flood			= None
		
		print "water_relief", color_relief
		
		if( self.tile == 'na'):
			water			= os.path.join(self.dem_dir, self.tile+"_water_image_transp.tif")
			#flood			= os.path.join(self.dem_dir, "outputfile_4326_hand.tif")
		else:
			water			= os.path.join(self.hydroSHEDS_dir, self.zone, self.tile, self.tile+"_water_image_transp.tif")

 		if not os.path.isfile(relief) or self.force:
			self.compose_relief( xml_file, slopeshade, hillshade, color_relief, relief, flood, water)

	def hand_relief(self):
		xml_file 		= os.path.join(self.dem_dir, "na_terrain.xml")
		slopeshade		= os.path.join(self.dem_dir, self.tile + "_dem_slopeshade_4326.tif")
		hillshade		= os.path.join(self.dem_dir, self.tile + "_dem_hillshade_4326.tif")
		color_relief	= os.path.join(self.dem_dir, self.tile + "_dem_color_relief_4326.tif")
		relief			= os.path.join(self.dem_dir, self.tile + "_dem_hand_relief_4326.tif")
		flood			= None
		
		if self.tile == 'na':
			water			= os.path.join(self.dem_dir, "hand_4326_transp.tif")			
			flood			= os.path.join(self.dem_dir, "outputfile_4326_hand.tif")
		else:
			water			= os.path.join(self.HAND_DIR, self.zone, self.tile + "_hand_transp.tif")
		
 		if not os.path.isfile(relief) or self.force:
			self.compose_relief( xml_file, slopeshade, hillshade, color_relief, relief, flood, water)
		
	def compose_relief( self, xml_file, slopeshade, hillshade, color_relief, relief, flood, water):
		xml = "<Map srs='+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs'>\n"
		xml += "<Style name='color relief style'>\n"
		xml += "<Rule>\n"
		xml += "<RasterSymbolizer comp-op='src-over' />\n"
		xml += "</Rule>\n"
		xml += "</Style>\n"
		
		xml +=  "<Style name='slopeshade style'>\n"
		xml += "<Rule>\n"
		xml += "<RasterSymbolizer opacity='0.4' comp-op='multiply' />\n"
		xml += "</Rule>\n"
		xml += "</Style>\n"
		
		xml += "<Style name='hillshade style'>\n"
		xml += "<Rule>\n"
		xml += "<RasterSymbolizer opacity='0.6' comp-op='multiply' />\n"
		xml += "</Rule>\n"
		xml += "</Style>\n"

		xml += "<Style name='flood water'>\n"
		xml += "<Rule>\n"
		xml += "<RasterSymbolizer opacity='1'  />\n"
		xml += "</Rule>\n"
		xml += "</Style>\n"

		xml += "<Style name='water'>\n"
		xml += "<Rule>\n"
		xml += "<RasterSymbolizer opacity='1' comp-op='src-over'/>\n"
		xml += "</Rule>\n"
		xml += "</Style>\n"

		xml += "<Layer name='color relief'>\n"
		xml += "<StyleName>color relief style</StyleName>\n"
		xml += "<Datasource>\n"
		xml += "<Parameter name='type'>gdal</Parameter>\n"
		xml += "<Parameter name='file'>" + color_relief +"</Parameter>\n"
		xml += "<Parameter name='format'>tiff</Parameter>\n"
		xml += "</Datasource>\n"
		xml += "</Layer>\n"

		xml += "<Layer name='slopeshade'>\n"
		xml += "<StyleName>slopeshade style</StyleName>\n"
		xml += "<Datasource>\n"
		xml += "<Parameter name='type'>gdal</Parameter>\n"
		xml += "<Parameter name='file'>"+ slopeshade+"</Parameter>\n"
		xml += "<Parameter name='format'>tiff</Parameter>\n"
		xml += "</Datasource>\n"
		xml += "</Layer>\n"


		xml += "<Layer name='hillshade'>\n"
		xml += "<StyleName>hillshade style</StyleName>\n"
		xml += "<Datasource>\n"
		xml += "<Parameter name='type'>gdal</Parameter>\n"
		xml += "<Parameter name='file'>"+ hillshade+"</Parameter>\n"
		xml += "<Parameter name='format'>tiff</Parameter>\n"
		xml += "</Datasource>\n"
		xml += "</Layer>\n"

		if flood:
			xml += "<Layer name='flood water'>\n"
			xml += "<StyleName>flood water</StyleName>\n"
			xml += "<Datasource>\n"
			xml += "<Parameter name='type'>gdal</Parameter>\n"
			xml += "<Parameter name='file'>"+ flood +"</Parameter>\n"
			xml += "<Parameter name='format'>tiff</Parameter>\n"
			xml += "</Datasource>\n"
			xml += "</Layer>\n"
			
		xml += "<Layer name='water'>\n"
		xml += "<StyleName>water</StyleName>\n"
		xml += "<Datasource>\n"
		xml += "<Parameter name='type'>gdal</Parameter>\n"
		xml += "<Parameter name='file'>"+ water +"</Parameter>\n"
		xml += "<Parameter name='format'>tiff</Parameter>\n"
		xml += "</Datasource>\n"
		xml += "</Layer>\n"

		xml += "</Map>\n"
		f = open(xml_file, 'w')
		f.write(xml)
		f.close()
		
		print "Generating relief file:", color_relief, xml_file
		print self.RasterXSize, self.RasterYSize
		
		map = mapnik.Map(self.RasterXSize, self.RasterYSize)
		mapnik.load_map(map, xml_file)
		map.zoom_all() 
		mapnik.render_to_file(map, relief)

	def metersToLatLng(self,ds,X,Y):
		srs = osr.SpatialReference()
		srs.ImportFromWkt(ds.GetProjection())
		srsLatLong = srs.CloneGeogCS()
		ct = osr.CoordinateTransformation(srs,srsLatLong)
		return ct.TransformPoint(X,Y)
		
	# create matching osm water layer
	def create_osm_water_layer(self):
		dem_img							= os.path.join(self.dem_dir, "na_dem_4326.tif")
		osm_surface_water_img 			= os.path.join(self.dem_dir, "na_water_image.tif")
		osm_surface_water_img_tif 		= os.path.join(self.dem_dir, "na_water_image.tif")
		osm_surface_water_transp_img 	= os.path.join(self.dem_dir, "na_water_image_transp.tif")

		ds 								= gdal.Open( dem_img )

		geotransform	 				= ds.GetGeoTransform()
		
		dx = geotransform[1] * ds.RasterXSize
		dy = geotransform[5] * ds.RasterYSize
		
		X1 = geotransform[0]
		Y1 = geotransform[3] + dy
		X2 = geotransform[0] + dx
		Y2 = geotransform[3]
		
		#print "meters", X1,Y1,X2,Y2
		
		LLC = self.metersToLatLng(ds,X1,Y1)
		URC = self.metersToLatLng(ds,X2,Y2)
		
 		if not os.path.isfile(osm_surface_water_img) or self.force:
			cmd = "python generate_image.py --mapfile %(map)s --name %(fname)s --bbox %(X1)f %(Y1)f %(X2)f %(Y2)f --img %(dx)d %(dy)d" % \
			{ 	'map': 'water_4326.xml', 'fname':osm_surface_water_img, 
				'X1':LLC[0], 'Y1':LLC[1], 'X2':URC[0], 'Y2':URC[1], 
				'dx': ds.RasterXSize, 'dy': ds.RasterYSize 
			}
			print(cmd)

			err = os.system(cmd)
			if err != 0:
				print('ERROR: water file could not be generated:', err)
				sys.exit(-1)

 		self.transp_water_layer(dem_img, osm_surface_water_img_tif, osm_surface_water_transp_img)

		#print "Water done"
		ds = None

		
	def water_layer(self):
		water 			= os.path.join(self.hydroSHEDS_dir, self.zone, self.tile, self.tile+"_water_image.tif")
		water_transp	= os.path.join(self.hydroSHEDS_dir, self.zone, self.tile, self.tile+"_water_image_transp.tif")
		
		src  			= os.path.join(self.dem_dir, self.tile + "_dem_4326.tif")
		self.transp_water_layer(src, water, water_transp)
		
	def hand_layer(self):
		if self.tile == 'na':
			hand 			= os.path.join(self.dem_dir, "hand_4326.tif")
			hand_transp 	= os.path.join(self.dem_dir, "hand_4326_transp.tif")
		
		else:
			hand 			= os.path.join(self.HAND_DIR, self.zone, self.tile+"_hand.tif")
			hand_transp 	= os.path.join(self.HAND_DIR, self.zone, self.tile + "_hand_transp.tif")

		src  			= os.path.join(self.dem_dir, self.tile + "_dem_4326.tif")
		self.transp_water_layer(src, hand, hand_transp)

	# Convert to transparent and copy projection
	# Warning: this will fail if convert is not built with tiff delegate
	# PNG Driver will be used to create target tif file and gdalcopyproj will fail
	def transp_water_layer(self, src, water, water_transp):
		if self.force or not os.path.isfile(water_transp):
			cmd = "convert -transparent black " + water + " " + water_transp
			print cmd
			err = os.system(cmd)
			if err != 0:
				print('ERROR: water transparency file could not be generated:', err)
				sys.exit(-1)
		
			cmd = "gdalcopyproj.py "+ src + " " + water_transp
			print cmd
			err = os.system(cmd)
			if err != 0:
				print('ERROR: gdalcopyproj generated error:', err)
				sys.exit(-1)		
		
	#
	# Subset DEM to bbox area
	#
	def subset(self):
		base_img 		= self.infile	#os.path.join(self.dem_dir, "outputfile_4326.tif")
		in_img 			= self.dem_vrt
		out_img			= os.path.join(self.dem_dir, "na_dem_4326.tif")
		
		if self.force or not os.path.isfile(out_img):
			cmd = "subset.py "+ base_img + " " + in_img + " " + out_img
			print cmd
			os.system(cmd)
#
# Main
#
if __name__ == '__main__':
	version_num = int(gdal.VersionInfo('VERSION_NUM'))
	if version_num < 1800: # because of GetGeoTransform(can_return_null)
		print('ERROR: Python bindings of GDAL 1.8.0 or later required')
		sys.exit(1)

	# make sure we have ImageMagick convert 
	err = which("convert")
	if err == None:
		print "convert missing"
		sys.exit(-1)
	
	# make sure that mapnik as the gdal plugin
	if not 'gdal' in c.plugin_names():
		print "Missing 'gdal' input plugin in mapnik"
		sys.exit(-1)
			
	# make sure tiff delegate is present
	output = subprocess.check_output("convert --version | grep Delegates", shell=True)
	err = output.find('tiff')
	if err==-1:
		print "ImageMagick Convert does not have a tiff delegate... rebuild it!", output
		sys.exit(-1)
	
	parser 		= argparse.ArgumentParser(description='Generate DEM')
	apg_input 	= parser.add_argument_group('Input')
	apg_input.add_argument("-f", "--force", action='store_true', help="HydroSHEDS forces new water image to be generated")
	apg_input.add_argument("-v", "--verbose", action='store_true', help="Verbose")
	apg_input.add_argument("-t", "--tile", nargs=1, help="HydroSHEDS tile number")
	apg_input.add_argument("-z", "--zone", nargs=1, help="HydroSHEDS zone")
	apg_input.add_argument("-d", "--dir",  nargs=1, help="Directory")
	apg_input.add_argument("-b", "--bbox", nargs=4, type=float, metavar=('X1', 'Y1', 'X2', 'Y2'), help="generate DEM inside a bounding box")
	apg_input.add_argument("-i", "--infile", nargs=1, help="input file")
	
	options 	= parser.parse_args()

	tile 		= options.tile
	zone 		= options.zone
	force		= options.force
	verbose		= options.verbose 
	bbox		= options.bbox
	target_dir	= options.dir
	infile		= options.infile
	
	if tile and zone:
		print str(datetime.now()), "Starting processing of tile:"+tile[0]+" zone:"+zone[0]
		app = DEM( tile[0], zone[0], force, None, None, None)
		app.hillshade()
		app.color_relief()
		app.slopeshade()
		app.water_layer()
		app.water_relief()
		#app.hand_layer()
		#app.hand_relief()
				
	if bbox and target_dir and infile:
		print str(datetime.now()), "Starting DEM processing for:", bbox, target_dir[0], infile[0]
		app = DEM( None, None, force, bbox, target_dir[0], infile[0])
		app.subset()
		app.hillshade()
		app.color_relief()
		app.slopeshade()
		app.create_osm_water_layer()
		app.water_relief()
		#app.hand_layer()
		#app.hand_relief()


	
	print str(datetime.now()), "Done."	