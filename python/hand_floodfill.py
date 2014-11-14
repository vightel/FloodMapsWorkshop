#!/usr/bin/env python
#
# Created on 6/28/2013 Pat Cappelaere - Vightel Corporation
# 
# Requirements:
#	gdal...
#
# HydroSHEDS
# OpenStreetMap data loaded in POSTGRES/POSTGIS
#
# 	HAND or Height Above Nearest Drainage Calculation using Floodfill algorithm
#
import os, inspect
import argparse

import sys, urllib, httplib
from datetime import datetime

import math
import numpy
import config
import numpy.ma as ma

from osgeo import gdal
from osgeo import osr
from osgeo import ogr

_processed 	= 0
_nozerowps	= 0
_debug		= 0

class HAND:

	def __init__( self, inpath, zone, tile, proj, maxheight, force, verbose ):
		self.inpath					= inpath
		self.hydroSHEDS_dir		 	= config.HYDROSHEDS_DIR	#os.path.join(inpath,'HydroSHEDS')		
		self.tile					= tile
		self.maxheight				= maxheight
		self.zone					= zone
		self.force					= force
		self.proj					= proj
		self.verbose				= verbose

		# pixels we set
		self.count					= 0
		
		# water pixels
		self.wp						= 0

	#
	# Get BIL dataset
	#
	def get_bil_data_set(self, name):
		fname 		= "%s_%d.tif" % (name,self.proj)
		bildir 		= os.path.join(self.hydroSHEDS_dir,self.zone, self.tile, name+"_bil")
		bil_proj 	= os.path.join(bildir, fname)

		if not os.path.isfile(bil_proj):
			bil 	= os.path.join(bildir,name+".bil")
			if not os.path.isfile(bil):
				print('ERROR: bil file does not exist:', bil)
				sys.exit(-1)

			self.reproject("EPSG:%d"%self.proj, bil, bil_proj)
			
		if self.verbose:
			print "get data from:", bil_proj
		
		bil_ds = gdal.Open( bil_proj )
		if bil_ds is None:
			print('ERROR: bil file no data:')
			sys.exit(-1)

		self.RasterXSize = bil_ds.RasterXSize
		self.RasterYSize = bil_ds.RasterYSize
		self.RasterCount = bil_ds.RasterCount

		if self.verbose:
			print 'Size is ',bil_ds.RasterXSize,'x',bil_ds.RasterYSize, 'x',bil_ds.RasterCount
			
		return bil_ds

	#
	#	Get BIL data
	#	
	def get_bil_data(self, dataset):
		band = dataset.GetRasterBand(1)
		#print 'Band Type=',gdal.GetDataTypeName(band.DataType)
		data = band.ReadAsArray(0, 0, dataset.RasterXSize, dataset.RasterYSize )

		return data

	#	
	# Convert from EPSG:3857 meters to EPSG:4326 latlng
	#
	def metersToLatLng(self,ds,X,Y):
		srs = osr.SpatialReference()
		srs.ImportFromWkt(ds.GetProjection())
		srsLatLong = srs.CloneGeogCS()
		ct = osr.CoordinateTransformation(srs,srsLatLong)
		return ct.TransformPoint(X,Y)

	#
	# Returns Height data (Conditioned DEM or VOID-filled from HydroSHEDS)
	#
	def get_height_data(self):
		dataset 	= self.get_bil_data_set(self.tile+"_dem")
		self.hds 	= dataset		# save dataset so we can createcopy and write file
		data		= self.get_bil_data(dataset)
		return data

	#
	# Generates a Water Reference File matching the current tile
	#
	def generate_water_reference_file(self, ds):
		osm_surface_water_img 		= os.path.join(self.hydroSHEDS_dir, self.zone, self.tile, self.tile + "_water_image.tif")
		osm_surface_water_gray_img 	= os.path.join(self.hydroSHEDS_dir, self.zone, self.tile, self.tile + "_water_image_gray.tif")

		geotransform	 			= ds.GetGeoTransform()
		
		dx = geotransform[1] * ds.RasterXSize
		dy = geotransform[5] * ds.RasterYSize
		
		X1 = geotransform[0]
		Y1 = geotransform[3] + dy
		X2 = geotransform[0] + dx
		Y2 = geotransform[3]
		
		#print "meters", X1,Y1,X2,Y2
		
		LLC = self.metersToLatLng(ds,X1,Y1)
		URC = self.metersToLatLng(ds,X2,Y2)
		
		if self.proj == 4326:
			mapfile = 'water_4326.xml'
		elif self.proj == 3857:
			mapfile = 'water_3857.xml'
		else:
			print "invalid projection: %d" % self.proj
			sys.exit(-1)
			
		if self.force or not os.path.isfile(osm_surface_water_img) :
			cmd = "python generate_image.py --mapfile %(map)s --name %(fname)s --bbox %(X1)f %(Y1)f %(X2)f %(Y2)f --img %(dx)d %(dy)d" % \
			{ 	'map': mapfile, 'fname':osm_surface_water_img, 
				'X1':LLC[0], 'Y1':LLC[1], 'X2':URC[0], 'Y2':URC[1], 
				'dx': ds.RasterXSize, 'dy': ds.RasterYSize 
			}
			if self.verbose:
				print(cmd)

			err = os.system(cmd)
			if err != 0:
				print('ERROR: water file could not be generated:', err)
				sys.exit(-1)
		
			# convert black to Gray scale
			cmd = "convert -colorspace Gray "+osm_surface_water_img+" "+osm_surface_water_gray_img
			if self.verbose:
				print(cmd)
			err = os.system(cmd)
			
	#
	# Get Reference Water DataSet
	#
	def get_reference_water_dataset(self):
		wtr_file 	= os.path.join(self.hydroSHEDS_dir, self.zone, self.tile, self.tile + "_water_image.tif")
		if not os.path.isfile(wtr_file) or self.force:
			self.generate_water_reference_file(self.hds)
			
		#print "get data from:", wtr_file
		ds = gdal.Open( wtr_file )
		if ds is None:
			print('ERROR: water file no data:')
			sys.exit(-1)

		#print 'Water Reference Size is ',ds.RasterXSize,'x', ds.RasterYSize, 'x',ds.RasterCount
		
		return ds

	#
	# Get Reference Water Data
	#
	def get_reference_water_data(self):
		ds = self.get_reference_water_dataset()
		
		band = ds.GetRasterBand(1)
		#print 'Band Type=',gdal.GetDataTypeName(band.DataType)

		#min = band.GetMinimum()
		#max = band.GetMaximum()
		#if min is None or max is None:
		#	(min,max) = band.ComputeRasterMinMax(1)
		#	print 'Min=%.3f, Max=%.3f' % (min,max)

		data = band.ReadAsArray(0, 0, ds.RasterXSize, ds.RasterYSize )
		# Read individual pixels using [yoff, xoff]
		# (math matrix notation is [row,col], not [x,y])
		
		return data
	
	def progressbar(self, complete = 0.0):
		gdal.TermProgress_nocb(complete)
		
	#
	# Save Data
	#
	def save_data(self):
		print str(datetime.now()), "Saving Hand data..."
		print "  water pix:", self.wp
		print "  processed:", self.count
		print "  total pixs:", self.RasterXSize * self.RasterYSize
		print "  Hand pixs:", numpy.count_nonzero(self.hand)
		
		hand_img 	= os.path.join(self.inpath, self.zone, self.tile + "_hand.tif")
		driver 		= gdal.GetDriverByName( "GTiff" )
		#dst_ds 		= driver.CreateCopy( hand_img, self.hds, 0, [ 'TILED=YES', 'COMPRESS=PACKBITS' ] )
		dst_ds 		= driver.Create( hand_img, self.RasterXSize, self.RasterYSize, 1, gdal.GDT_Byte,
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
		ct.SetColorEntry( 254, (255, 0, 0, 255) )

		# ocean
		ct.SetColorEntry( 255, (0, 0, 0, 0) )

		band = dst_ds.GetRasterBand(1)
		band.SetRasterColorTable(ct)
		band.WriteArray(self.hand, 0, 0)
		band.SetNoDataValue(0)
		
		# copy projection
		projection   = self.hds.GetProjection()
		geotransform = self.hds.GetGeoTransform()

		dst_ds.SetGeoTransform( geotransform )
		dst_ds.SetProjection( projection )

		dst_ds 		= None
		self.hds 	= None

	# One row up
	def north(self,wp): 
		row = wp[0]-1
		if row < 0:
			return None
		col = wp[1]
		return (row, col)
		
	# One row down
	def south(self,wp): 
		row = wp[0]+ 1
		if row > self.RasterYSize -1:
			return None
		col = wp[1]
		return (row, col)
		
	# One colum left
	def west(self,wp):  
		col = wp[1]- 1
		if col < 0:
			return None	
		row = wp[0]
		return (row, col)
	
	# One column right
	def east(self,wp):  
		col = wp[1] + 1
		if col > self.RasterXSize -1:
			return None
		row = wp[0]
		return (row, col)

	def north_east(self,wp):  
		col = wp[1] + 1
		if col > self.RasterXSize -1:
			return None
		row = wp[0] - 1
		if row < 0:
			return None
		
		return (row, col)

	def north_west(self,wp):  
		col = wp[1] - 1
		if col < 0:
			return None
		row = wp[0] - 1
		if row < 0:
			return None
		
		return (row, col)

	def south_east(self,wp):  
		col = wp[1] + 1
		if col > self.RasterXSize -1:
			return None
		row = wp[0] + 1
		if row > self.RasterYSize -1:
			return None
		
		return (row, col)

	def south_west(self,wp):  
		col = wp[1] - 1
		if col < 0:
			return None
		row = wp[0] + 1
		if row > self.RasterYSize -1:
			return None
		
		return (row, col)
		
	def floodfill(self, idx, wp, minheight):

		q = [wp]
		while len(q)>0:
			wp 		= q.pop(0)
			
			row 	= wp[0]
			col 	= wp[1]
			height 	= self.height_data[row,col]
			hand	= self.hand[row,col]

			relative_height = height - minheight + 1
		
			#print "ff", "r:",row, "c:",col, "h:", height, "hd:", hand, "min:", minheight, "r", relative_height

			if (hand > 0) and (self.id[row,col] == idx):
				continue

			if (hand > 0) and (self.id[row,col] != idx) and (hand < relative_height):
				continue
				
			#if (relative_height<1) or (relative_height > self.maxheight):  
			if  (relative_height > self.maxheight):  
			#if (height<minheight) or (height > target):
				#self.hand[row,col] = 255		# Tentative unless we can get there from another point
				#print 'bail', row, col, height, minheight, target
				continue  
			
			
			self.count += 1
			#if self.count > 100: 
			#	sys.exit(-1)
		
			if relative_height < 1:
				relative_height = 1
				
			#if (hand < relative_height):
			self.hand[row,col] 	= relative_height	# Set to relative height from where we started
			
			self.id[row,col]	= idx
				
			for x in [self.west(wp), self.east(wp), self.north(wp), self.south(wp), self.north_east(wp), self.north_west(wp), self.south_east(wp), self.south_west(wp)]:  
				if x:
					q.append(x)
				
		
		#print "Done", len(q)
		
	#
	# Generate HAND data
	#
	#	Start from Water Reference Map and go through all water pixels to find what drains into them
	#
	def process_data(self):
		
		# create hand array and set it to zero
		self.hand 	= numpy.zeros_like(app.water_data)
		self.id	 	= numpy.zeros_like(app.water_data)
		
		cols 		= app.RasterXSize
		rows 		= app.RasterYSize
		
		total 		= rows*cols
		ncount		= 0
		
		print "Rows", rows, "Cols", cols
		print "Total pixs", total
		print "Max height", numpy.max(app.height_data), self.maxheight, " meters"
		print "Shape", app.height_data.shape
		
		self.count	= 0
		
		
		num_wps = numpy.count_nonzero(app.water_data)
		wpi		= numpy.where(app.water_data>0)
		wph 	= numpy.empty((num_wps,), dtype=[('row',int),('col',int), ('height', int)])

		if self.verbose:
			print str(datetime.now()), "Processing data...", total, rows, cols, num_wps
		
		for i in range(num_wps):
			row 	= wpi[0][i]
			col		= wpi[1][i]
			height 	= app.height_data[row,col]
						
			self.hand[row,col] 	= 1		# water pixel 1m or less
			self.id[row,col]	= i		# track wp id
			self.wp += 1
			
			wph[i] = (row, col, height)
					
		wph.sort(order='height')
		
		#
		# Go through all water pixels in decreasing height and floodfill the scene
		#
				
		for i in range(num_wps):	#range(num_wps):
			#wpx 		= wph[num_wps-i-1]
			wpx		= wph[i]
			
			minheight	= wpx['height']
			target		= minheight + self.maxheight
			
			#minheight	= 929
			#wpx = (310,68,929)
			#target = 938
			#row 		= 309
			#col 		= 69
			#minheight 	= 929
			#target 		= minheight + self.maxheight
			
			#wpx = (row,col,minheight)
			#print "wp", i, wpx, numpy.count_nonzero(self.hand)
			
			for x in [self.west(wpx), self.east(wpx), self.north(wpx), self.south(wpx)]:  
				if x:
					self.floodfill(i, x, minheight)    

			#self.hand[row,col] = 254
			
			#break	
			self.progressbar( i / float(num_wps) )
		
		print ""
		
		
# ======
# Main
#
# hand.py --tile n10w065 -m 9 -z CA -p 4326 -v

if __name__ == '__main__':
	version_num = int(gdal.VersionInfo('VERSION_NUM'))
	if version_num < 1800: # because of GetGeoTransform(can_return_null)
		print('ERROR: Python bindings of GDAL 1.8.0 or later required')
		sys.exit(1)

	parser = argparse.ArgumentParser(description='Generate HAND')
	apg_input = parser.add_argument_group('Input')
	apg_input.add_argument("-f", "--force", action='store_true', help="HydroSHEDS forces new water image to be generated")
	apg_input.add_argument("-t", "--tile", nargs=1, help="HydroSHEDS tile number")
	apg_input.add_argument("-m", "--maxheight", nargs=1, help="HydroSHEDS maximum height above nearest drainage")
	apg_input.add_argument("-z", "--zone", nargs=1, help="HydroSHEDS zone")
	apg_input.add_argument("-p", "--proj", nargs=1, help="Projection 4326 or 3857")
	apg_input.add_argument("-v", "--verbose", action='store_true', help="Verbose on/off")
	
	options = parser.parse_args()

	tile 		= options.tile
	maxheight 	= int(options.maxheight[0])
	zone 		= options.zone
	force		= options.force
	proj		= int(options.proj[0])
	verbose		= options.verbose
	
	if maxheight > 30:
		print "MaxHeight limit", maxheight
		sys.exit(-1)
		
	dir = config.HANDS_DIR

	if verbose:
		print str(datetime.now()), "Starting processing of tile:"+tile[0] + " zone:"+zone[0]+ " force: %d" %(force) + " verbose: %d" % verbose + " proj: %d" % proj	

	app = HAND(dir, zone[0], tile[0], proj, maxheight, force, verbose)
	
	app.height_data  	= app.get_height_data();
	app.water_data		= app.get_reference_water_data()
	
	hand_img 	= os.path.join(dir, zone[0], tile[0] + "_hand.tif")
	if 1: #not os.path.isfile(hand_img) or force:
		app.process_data()
		app.save_data()

	if verbose:
		print ""
		print str(datetime.now()), "Done."	