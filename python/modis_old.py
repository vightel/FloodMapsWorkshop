#!/usr/bin/env python
#
# Created on 6/28/2013 Pat Cappelaere - Vightel Corporation
# 
# Requirements:
#	gdal...
#
# MODIS Processing
#
#	Assuming that MWP products are in directory structure as follows
#		inpath/year/day/MWP_YYYYDDD_TILE_XDXOT.tif
#
import os, inspect
import argparse

import sys, urllib, httplib
from datetime import datetime
from pprint import pprint

import math
import numpy
import mapnik
import config

from osgeo import gdal
from osgeo import osr
from osgeo import ogr

class MODIS:
	def __init__( self, inpath, year, day, product, tile, force, verbose ):
		self.inpath		= inpath
		self.year		= year		
		self.day		= day
		self.tile		= tile
		self.product	= product
		self.force		= force
		self.verbose	= verbose

		fname 			= str.format("MWP_{0}{1}_{2}_{3}D{3}OT.tif", year, day, tile, product)
		swp				= str.format("SWP_{0}{1}_{2}_{3}D{3}OT.tif", year, day, tile, product)
		pnm 			= str.format("SWP_{0}{1}_{2}_{3}D{3}OT.pnm", year, day, tile, product)
		pgm 			= str.format("SWP_{0}{1}_{2}_{3}D{3}OT.pgm", year, day, tile, product)
		geojson 		= str.format("SWP_{0}{1}_{2}_{3}D{3}OT.geojson", year, day, tile, product)
		topojson 		= str.format("SWP_{0}{1}_{2}_{3}D{3}OT.topojson", year, day, tile, product)
		tgz		 		= str.format("SWP_{0}{1}_{2}_{3}D{3}OT.topojson.tgz", year, day, tile, product)
		svg		 		= str.format("SWP_{0}{1}_{2}_{3}D{3}OT.svg", year, day, tile, product)
		png		 		= str.format("SWP_{0}{1}_{2}_{3}D{3}OT.png", year, day, tile, product)
	
		self.infile 	= os.path.join( inpath, year, day, fname )
		self.swp		= os.path.join( inpath, year, day, swp )
		self.pnm		= os.path.join( inpath, year, day, pnm )
		self.pgm		= os.path.join( inpath, year, day, pgm )
		self.geojson	= os.path.join( inpath, year, day, geojson )
		self.topojson	= os.path.join( inpath, year, day, topojson )
		self.tgz		= os.path.join( inpath, year, day, tgz )
		self.svg		= os.path.join( inpath, year, day, svg )
		self.png		= os.path.join( inpath, year, day, png )
		
		if self.verbose:
			print self.infile

	# Delete all product
	def clear(self):
	 	all = os.path.join( self.inpath, self.year, self.day, "SWP_*" )
		cmd = str.format("rm -f {0}", all );
		if self.verbose:
			print(cmd)
		os.system(cmd)
		
	def open_geotiff(self):
		ds = gdal.Open( self.infile )
		if ds is None:
			print('ERROR: could not open MODIF Tif file:', self.insfile)
			sys.exit(-1)
		
		self.ds 			= ds	
		self.RasterXSize 	= ds.RasterXSize
		self.RasterYSize 	= ds.RasterYSize
		self.RasterCount 	= ds.RasterCount

		if self.verbose:
			print 'Size is ',ds.RasterXSize,'x',ds.RasterYSize, 'x',ds.RasterCount

		projection   = ds.GetProjection()
		if self.verbose:
			print 'Projection is ',projection
		
		geotransform = ds.GetGeoTransform()
		if not geotransform is None:
			if self.verbose:
				print 'Origin = (',geotransform[0], ',',geotransform[3],')'
				print 'Pixel Size = (',geotransform[1], ',',geotransform[5],')'
			
		self.xorg	= geotransform[0]
		self.yorg  	= geotransform[3]
		self.res	= geotransform[1]		
		self.xmax	= geotransform[0] + ds.RasterXSize * geotransform[1]
		self.ymax	= geotransform[3] + ds.RasterYSize * geotransform[5]
		
		if self.verbose:
			print self.xorg, self.xmax, self.yorg, self.ymax
			
	def process(self):
		# Surface Water
		band = self.ds.GetRasterBand(1)
		data = band.ReadAsArray(0, 0, self.ds.RasterXSize, self.ds.RasterYSize )
		data = (data >= 2)
		
		# Step 1
		# extract surface water from MWP product
		#
		driver 		= gdal.GetDriverByName( "GTIFF" )
		dst_ds 		= driver.Create( self.swp, self.RasterXSize, self.RasterYSize, 1, gdal.GDT_Byte, [ 'INTERLEAVE=PIXEL', 'COMPRESS=DEFLATE' ] )

		ct = gdal.ColorTable()
		for i in range(256):
			ct.SetColorEntry( i, (255, 255, 255, 255) )
			
		ct.SetColorEntry( 0, (0, 0, 0, 255) )
		ct.SetColorEntry( 1, (255, 255, 255, 255) )
		ct.SetColorEntry( 2, (255, 255, 255, 255) )
		ct.SetColorEntry( 3, (255, 255, 255, 255) )
		
		band = dst_ds.GetRasterBand(1)
		band.SetRasterColorTable(ct)
		band.WriteArray(data, 0, 0)
		band.SetNoDataValue(0)

		#dst_ds.SetGeoTransform( geotransform )
		#dst_ds.SetProjection( projection )

		dst_ds 		= None
		self.ds 	= None
		
		self.convert_to_pgm()
		#self.convert_to_svg()
		self.convert_to_geojson(self.res, self.xorg, self.yorg)
		self.convert_to_topojson()
		
		os.system("rm -f "+ self.pnm + ".aux.xml")
		
		
	def convert_to_pgm(self):
		# Step 2
		# output to .pgm using PNM driver
		# we may be able to skip that step and do it in step 1
		#cmd = "gdal_translate  -q " + self.swp + " -b 1 -of PNM -ot Byte "+self.pgm
		#print( cmd )
		#os.system(cmd)
		
		cmd = "convert " + self.swp + " "+self.pgm
		if self.verbose:
			print( cmd )
		os.system(cmd)
		
	def convert_to_pnm(self):
		# Step 2
		# output to .pgm using PNM driver
		# we may be able to skip that step and do it in step 1
		#cmd = "gdal_translate  -q " + self.swp + " -b 1 -of PNM -ot Byte "+self.pnm
		#cmd = "gdal_translate  " + self.swp + " -of PNM "+self.pnm
		#os.system(cmd)
		#print( cmd )
		
		
		cmd = "convert " + self.swp + " "+self.png
		if self.verbose:
			print( cmd )
		os.system(cmd)
		#os.system("rm -f "+ self.pnm + ".aux.xml")

		cmd = "convert " + self.png + " "+self.pnm
		if self.verbose:
			print( cmd )
		os.system(cmd)
		#os.system("rm -f "+ self.pnm + ".aux.xml")
		
	def convert_to_svg(self):
		# Debugging Step 3
		# create svg
		cmd = str.format("potrace -z black -a 1.5 -t 1 -i -s -o {0} {1}", self.svg, self.pgm ); 
		if self.verbose:
			print(cmd)
		os.system(cmd)
	
	def convert_to_geojson(self, res, xorg, yorg):
		# Step 3
		# create geojson
		ymax = int(yorg -10)
		cmd = str.format("potrace -z black -a 1.5 -t 1 -i -b geojson -o {0} {1} -x {2} -L {3} -B {4} ", self.geojson, self.pgm, res, xorg, ymax ); 
		if self.verbose:
			print(cmd)
		os.system(cmd)
		
	def convert_to_topojson(self):
		# Step 4
		# create topojson
		cmd = str.format("topojson {0} -o {1} ", self.geojson, self.topojson ); 
		if self.verbose:
			print(cmd)
		os.system(cmd)
		
		# Step 4
		# compress topojson
		cmd = str.format("tar -cvzf {0} {1} ", self.tgz, self.topojson ); 
		if self.verbose:
			print(cmd)
		os.system(cmd)
	
	def generate_image(self, filename, ll, dx, dy, res):
		print "generate_image", ll, dx,dy,res
		mapfile = "water.xml"
		latlon	= "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs"
		m 		= mapnik.Map(dx, dy)
		mapnik.load_map(m, mapfile)
		# Override projection defined in mapfile    
		m.srs 	= latlon
		# Calculate projected boundaries
		prj 	= mapnik.Projection(latlon)
		c0 		= prj.forward(mapnik.Coord(ll[0], ll[1]))
		c1 		= prj.forward(mapnik.Coord(ll[2], ll[3]))

 		# Apply bounding box
		bbox = mapnik.Envelope(c0.x, c0.y, c1.x, c1.y)
		m.zoom_to_box(bbox)

		# Render image
		im = mapnik.Image(dx, dy)
		mapnik.render(m, im)
		view = im.view(0, 0, dx, dy)

		view.save(filename, "png256")
		print "generated:", filename
		
	def reference_water(self):
		
		bbox 	= [self.xorg, self.ymax, self.xmax, self.yorg]
		
		dx		= self.RasterXSize
		dy		= self.RasterYSize
		res		= self.res
				
		osm_surface_water_img 			= os.path.join(self.inpath,self.year, self.day, "osm_reference_water_4326.png")
		osm_surface_water_pgm 			= os.path.join(self.inpath,self.year, self.day, "osm_reference_water.pgm")
		osm_surface_water_geojson		= os.path.join(self.inpath,self.year, self.day, "osm_reference_water.geojson")
		osm_surface_water_topojson		= os.path.join(self.inpath,self.year, self.day, "osm_reference_water.topojson")
		all_osm							= os.path.join(self.inpath,self.year, self.day, "osm_reference_*")
		
		#os.system("rm -f "+all_osm)
		
		if 1 or not os.path.exists(osm_surface_water_img):
			self.generate_image(osm_surface_water_img, bbox, dx, dy, res)

			# convert black to transparent
			cmd = "convert "+osm_surface_water_img+" "+osm_surface_water_pgm
			if self.verbose:
				print(cmd)
			os.system(cmd)
			
			cmd = str.format("potrace -z black -a 1.5 -t 1 -i -b geojson -o {0} {1} -x {2} -L {3} -B {4} ", osm_surface_water_geojson, osm_surface_water_pgm, self.res, self.xorg, self.ymax ); 
			if self.verbose:
				print(cmd)
			os.system(cmd)
			
			cmd = str.format("topojson {0} -o {1} ", osm_surface_water_geojson, osm_surface_water_topojson); 
			if self.verbose:
				print(cmd)
			os.system(cmd)
			
			
# Main
#  modis.py -y 2012 -d 234 -t 080W020N -p 2 -v
#  modis.py -y 2013 -d 205 -t 020E010S -p 2 -v
#  modis.py -y 2014 -d 038 -p 2 -t 070W010N -v
#
if __name__ == '__main__':
	version_num = int(gdal.VersionInfo('VERSION_NUM'))
	if version_num < 1800: # because of GetGeoTransform(can_return_null)
		print('ERROR: Python bindings of GDAL 1.8.0 or later required')
		sys.exit(1)

	parser = argparse.ArgumentParser(description='MODIS Processing')
	apg_input = parser.add_argument_group('Input')
	apg_input.add_argument("-f", "--force", action='store_true', help="HydroSHEDS forces new water image to be generated")
	apg_input.add_argument("-v", "--verbose", action='store_true', help="Verbose Flag")
	apg_input.add_argument("-y", "--year", nargs=1, help="Year")
	apg_input.add_argument("-d", "--day", nargs=1, help="Julian Day")
	apg_input.add_argument("-p", "--product", nargs=1, help="Product Day")
	apg_input.add_argument("-t", "--tile", nargs=1, help="Tile")
	
	options = parser.parse_args()

	year 		= options.year[0]
	day 		= options.day[0]
 	product 	= options.product[0]
	tile		= options.tile[0]
	force		= options.force
	verbose		= options.verbose

	dir = config.MODIS_DIR

	start = datetime.now()
	print str(start), "Starting processing of tile:"+tile

	app = MODIS(dir, year, day, product, tile, force, verbose)
	app.open_geotiff()
	app.clear()
	app.process()
	app.reference_water()
	
	end = datetime.now()
	print str(end), "Done.", end-start
