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

from osgeo import gdal
from osgeo import osr
from osgeo import ogr

from which import *

import config

class MODIS:
	def execute( self, cmd ):
		if self.verbose:
			print cmd
		os.system(cmd)
	
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
		gz		 		= str.format("SWP_{0}{1}_{2}_{3}D{3}OT.topojson.gz", year, day, tile, product)
		svg		 		= str.format("SWP_{0}{1}_{2}_{3}D{3}OT.svg", year, day, tile, product)
		png		 		= str.format("SWP_{0}{1}_{2}_{3}D{3}OT.png", year, day, tile, product)
	
		self.infile 	= os.path.join( inpath, year, day, tile, fname )
		self.swp		= os.path.join( inpath, year, day, tile, swp )
		self.pnm		= os.path.join( inpath, year, day, tile, pnm )
		self.pgm		= os.path.join( inpath, year, day, tile, pgm )
		self.geojson	= os.path.join( inpath, year, day, tile, geojson )
		self.topojson	= os.path.join( inpath, year, day, tile, topojson )
		self.gz			= os.path.join( inpath, year, day, tile, gz )
		self.svg		= os.path.join( inpath, year, day, tile, svg )
		self.png		= os.path.join( inpath, year, day, tile, png )
		
		self.hand_dir			= config.HANDS_DIR
		self.hand_file			= os.path.join(inpath, "hand.tif")
		self.hand_output_file	= os.path.join(inpath, tile + ".hand.tif")

		self.coastlines = os.path.join( inpath,tile+"_osm_coastal.tif")
		
		if self.verbose:
			print self.infile

	# Delete all product
	def clear(self):
	 	all = os.path.join( self.inpath, self.year, self.day, "SWP_*" )
		cmd = str.format("rm -f {0}", all );
		self.execute(cmd)
		
	def open_geotiff(self):
		ds = gdal.Open( self.infile )
		if ds is None:
			url = str.format("http://oas.gsfc.nasa.gov/Products/{0}/MWP_{1}{2}_{0}_2D2OT.tif", 
						self.tile, self.year, self.day)
			print 'Could not open MODIF Tif file... trying to get', url
			# make working directory if necessary
			wdir = os.path.join(self.inpath,self.year, self.day, self.tile)
			if not os.path.exists(wdir):
				os.makedirs(wdir)		
			filename, headers = urllib.urlretrieve(url, self.infile )
			length = int(headers['Content-Length'])
			if length <= 250:
				print "Failed retrieving", url
				# let's try to retrieve older format
				url = str.format("http://oas.gsfc.nasa.gov/Products/{0}/MWP_{1}{2}_{0}_2D2ON.tif", 
						self.tile, self.year, self.day)
				print "Trying retrieving", url
				filename, headers = urllib.urlretrieve(url, self.infile )
				length = int(headers['Content-Length'])
				if length <= 250:
					print "Failed retrieving", url
				
					os.system("rm "+self.infile)
					sys.exit(-1)
				
			ds = gdal.Open( self.infile )
		
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

	#
	# Generate Hand file
	#
	def hand(self, regional_file):		
		base_img 	= self.infile

		in_img 		= os.path.join(self.hand_dir, regional_file)
		
		# Get a subset of HAND for particular tile
		if force or not os.path.isfile(self.hand_file):
			print "generate hand subset:"+self.hand_file +" from:"+in_img
			cmd = "subset.py "+ base_img + " " + in_img + " " + self.hand_file
			self.execute(cmd)			
			
			#self.save_hand_as_png()
		
		if verbose:
			print "hand done"

	def process(self):
		
		coastlines_ds	= gdal.Open(self.coastlines)
		coastal_band 	= coastlines_ds.GetRasterBand(1)
		
		# coastal_data 	= coastal_band.ReadAsArray(0, 0, coastlines_ds.RasterXSize, coastlines_ds.RasterYSize )
		coastal_data 	= coastal_band.ReadAsArray(0, 0, self.RasterXSize, self.RasterYSize )
		
		# Surface Water
		band = self.ds.GetRasterBand(1)
		data = band.ReadAsArray(0, 0, self.ds.RasterXSize, self.ds.RasterYSize )
		data = (data >= 2)

				
		hand_ds 			= gdal.Open(self.hand_file)
		hand_band 			= hand_ds.GetRasterBand(1)
		hand_data 			= hand_band.ReadAsArray(0, 0, hand_ds.RasterXSize, hand_ds.RasterYSize )

		# HAND Masking
		mask				= hand_data==0
		data[mask]			= 0
		
		# Oceans
		mask				= hand_data==255
		data[mask]			= 0		
		
		# Coastal Masking
		mask = coastal_data>0
		data[mask]= 0


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

		dst_ds 			= None
		self.ds 		= None
		coastlines_ds 	= None
		
		self.convert_to_pgm()
		#self.convert_to_svg()
		self.convert_to_geojson(self.res, self.xorg, self.yorg)
		self.convert_to_topojson()
		
		self.execute("rm -f "+ self.pnm + ".aux.xml")
		self.execute("rm -f "+ self.pgm )
		self.execute("rm -f "+ self.geojson )
		
		
	def convert_to_pgm(self):
		# Step 2
		# output to .pgm using PNM driver
		# we may be able to skip that step and do it in step 1
		#cmd = "gdal_translate  -q " + self.swp + " -b 1 -of PNM -ot Byte "+self.pgm
		#print( cmd )
		#execute(cmd)
		
		cmd = "convert " + self.swp + " "+self.pgm
		self.execute(cmd)
		
	def convert_to_pnm(self):
		# Step 2
		# output to .pgm using PNM driver
		# we may be able to skip that step and do it in step 1
		#cmd = "gdal_translate  -q " + self.swp + " -b 1 -of PNM -ot Byte "+self.pnm
		#cmd = "gdal_translate  " + self.swp + " -of PNM "+self.pnm
		#execute(cmd)
		#print( cmd )
		
		
		cmd = "convert " + self.swp + " "+self.png
		self.execute(cmd)
		#execute("rm -f "+ self.pnm + ".aux.xml")

		cmd = "convert " + self.png + " "+self.pnm
		self.execute(cmd)
		#execute("rm -f "+ self.pnm + ".aux.xml")
		
	def convert_to_svg(self):
		# Debugging Step 3
		# create svg
		cmd = str.format("potrace -z black -a 1.5 -t 1 -i -s -o {0} {1}", self.svg, self.pgm ); 
		self.execute(cmd)
	
	def convert_to_geojson(self, res, xorg, yorg):
		# Step 3
		# create geojson
		ymax = round(yorg,0)-10
		cmd = str.format("potrace -z black -a 1.5 -t 1 -i -b geojson -o {0} {1} -x {2} -L {3} -B {4} ", self.geojson, self.pgm, res, xorg, ymax ); 
		self.execute(cmd)
		
	def convert_to_topojson(self):
		# Step 4
		# create topojson
		cmd = str.format("topojson -o {0} -- surface_water={1} ", self.topojson, self.geojson ); 
		self.execute(cmd)
		
		# Step 4
		# compress topojson
		cmd = str.format("gzip {0} ",  self.topojson ); 
		self.execute(cmd)
	
	def generate_image(self, xml, filename, ext, ftype, ll, dx, dy, res, verbose, force):
		print "generate_image:", xml, filename
		mapfile 	= xml
	
		merc 		= "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs +over"
		latlon		= "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs"
	
		m 			= mapnik.Map(dx, dy)
	
		mapnik.load_map(m, mapfile)
	
		# Override projection defined in mapfile    
		m.srs 	= latlon
		#m.srs 	= merc
	
		# Calculate projected boundaries
		prj 	= mapnik.Projection(m.srs)
		c0 		= prj.forward(mapnik.Coord(ll[0], ll[1]))
		c1 		= prj.forward(mapnik.Coord(ll[2], ll[3]))

		# Apply bounding box
		bbox 	= mapnik.Envelope(c0.x, c0.y, c1.x, c1.y)
		m.zoom_to_box(bbox)

		# Render image
		im 		= mapnik.Image(dx, dy)
		mapnik.render(m, im)
	
		view 	= im.view(0, 0, dx, dy)

		png_file = filename + ext	#".png"
	
		if force or not os.path.isfile(png_file):
			if verbose:
				print( "saving "+ png_file)
			view.save(png_file, ftype)
		
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
		
		#execute("rm -f "+all_osm)
		
		if 1 or not os.path.exists(osm_surface_water_img):
			self.generate_image(osm_surface_water_img, bbox, dx, dy, res)

			# convert black to transparent
			cmd = "convert "+osm_surface_water_img+" "+osm_surface_water_pgm
			self.execute(cmd)
			
			cmd = str.format("potrace -z black -a 1.5 -t 1 -i -b geojson -o {0} {1} -x {2} -L {3} -B {4} ", osm_surface_water_geojson, osm_surface_water_pgm, self.res, self.xorg, self.ymax ); 
			self.execute(cmd)
			
			cmd = str.format("topojson -o {0} -- reference_water={1} ", osm_surface_water_topojson, osm_surface_water_geojson); 
			self.execute(cmd)
			
			cmd = "rm "+osm_surface_water_pgm
			self.execute(cmd)
			
# Main
#  modis.py -y 2013 -d 205 -t 020E010S -p 2 -v

if __name__ == '__main__':
	version_num = int(gdal.VersionInfo('VERSION_NUM'))
	if version_num < 1800: # because of GetGeoTransform(can_return_null)
		print('ERROR: Python bindings of GDAL 1.8.0 or later required')
		sys.exit(1)

	err = which("convert")
	if err == None:
		print "convert missing... brew install imagemagick --with-libtiff"
		sys.exit(-1)

	err = which("gdal_translate")
	if err == None:
		print "gdal_translate missing... install gdal"
		sys.exit(-1)

	err = which("potrace")
	if err == None:
		print "potrace missing"
		sys.exit(-1)

	err = which("node")
	if err == None:
		print "node.js missing..."
		sys.exit(-1)

	err = which("topojson")
	if err == None:
		print "topojson missing..."
		sys.exit(-1)

	parser = argparse.ArgumentParser(description='MODIS Processing')
	apg_input = parser.add_argument_group('Input')
	apg_input.add_argument("-f", "--force", action='store_true', help="forces new product to be generated")
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

	regional_hand	= config.HANDS_AREA + "_hand_merged_lzw.tif"

	dir 		= config.MODIS_DIR
	python_dir	= config.PYTHON_DIR
	 
	start = datetime.now()
	print str(start), "Starting processing of tile:"+tile

	app = MODIS(dir, year, day, product, tile, force, verbose)
	app.open_geotiff()

	osm_coastal_water = os.path.join(dir, tile+"_osm_coastal")		
	if not os.path.isfile(osm_coastal_water+".png"):
		ll 	=[app.xorg, app.ymax, app.xmax, app.yorg]
		res = app.res
		dx 	= app.RasterXSize
		dy 	= app.RasterYSize
		print ll, res, dx, dy
		#app.generate_image(	"water_coastal_only_4326.xml", osm_coastal_water, ".tif", "tif", ll, dx, dy, res, verbose, force)
		watershed_marshes_4326 = os.path.join(python_dir, "watershed_marshes_4326.xml")
		app.generate_image(	watershed_marshes_4326, osm_coastal_water, ".tif", "tif", ll, dx, dy, res, verbose, force)
			
	app.clear()
	app.hand(regional_hand)
	app.process()
	#app.reference_water()
	
	# execute the browseimage
	cmd = str.format(" python {0}/modis_browseimage.py --year {1} --day {2} --product {3} --tile {4}", python_dir, year, day, product, tile)
	if force: 
		cmd += " -f"
		
	if verbose:
		cmd += " -v"
		
	app.execute(cmd)
	 
	end = datetime.now()
	print str(end), "Done.", end-start
