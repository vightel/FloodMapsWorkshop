#!/usr/bin/env python
#
# Created on 7/5/2013 Pat Cappelaere - Vightel Corporation
# 
# Requirements:
#	gdal...
#
# LandScan
#

import os, inspect
import argparse
import Image, ImageDraw, ImageFont
import textwrap

from osgeo import gdal
from osgeo import osr
from osgeo import ogr

class Landscan:
	def __init__( self, inpath, ls, force, bbox, target ):
		self.inpath			= inpath
		self.ls				= ls
		self.force			= force
		self.bbox			= bbox
		self.target			= target
		
		print "landscan target ", self.target
		
	def legend(self, heights):
		template		= os.path.join(self.inpath, "density.png")
		legend_img 		= os.path.join(self.target,"pop_density_legend.png")
	
		font_file   	= "./pilfonts/helvB14.pil"
		font 			= ImageFont.load(font_file)
		
		im 				= Image.open(template)
		draw 			= ImageDraw.Draw(im)
		
		text = ""
		X = 75
		Y = 90
		
		for h in heights:
			text = "%.1f\n" % (h)
			draw.text((X, Y), text, (0,0,0), font=font)
			Y += 47
		
		print "saved legend to ", legend_img
		im.save(legend_img)
		
	def density(self):
		# subset the oringal global file
		base_img 		= os.path.join(self.target, "outputfile_4326_hand.tif")
		in_img 			= os.path.join(self.inpath, self.ls)
		out_img			= os.path.join(self.target, "outputfile_4326_density.tif")
		dest_img		= os.path.join(self.target, "outputfile_4326_density_rgb.tif")
		legend			= os.path.join(self.target, "density_legend.png")
		
		if self.force or not os.path.isfile(out_img):
			cmd = "subset.py "+ base_img + " " + in_img + " " + out_img
			print cmd
			os.system(cmd)
		
		color_txt_file  = os.path.join(self.target, "pop_density.txt")
		ds = gdal.Open( out_img )
		if ds is None:
			print('ERROR: file no data:', src)
			sys.exit(-1)

		band 				= ds.GetRasterBand(1)
		self.RasterXSize 	= ds.RasterXSize
		self.RasterYSize 	= ds.RasterYSize
		
		(min,max,mean, stddev) = band.GetStatistics(1,1)
		print 'Min=%.3f, Max=%.3f Mean=%.3f Stdev=%.3f' % (min,max,mean,stddev)

		# generate the color_relief.txt file
		mid_lower 		= (min  + mean)/2
		mid_higher 		= (mean + max)/2

		mmid_lower 		= (min+mid_lower)/2
		mid_lower_m		= (mid_lower+mean)/2
		mmid_higher 	= (mean+mid_higher)/2
		mid_higher_m 	= (max+mid_higher)/2

		str =  "%.2f 255 255 229\n" % (min) 
		str += "%.2f 254 247 188\n" % (mmid_lower)
		str += "%.2f 254 227 145\n" % (mid_lower)
		str += "%.2f 254 196 79\n" % (mid_lower_m)
		str += "%.2f 254 153 41\n" % (mean)
		str += "%.2f 217 112 20\n" % (mmid_higher)
		str += "%.2f 204 76 2\n" % (mid_higher)
		str += "%.2f 153 52 4\n" % (mid_higher_m)
		str += "%.2f 102 37 6\n" % (max)
	
		if not os.path.isfile(color_txt_file) or self.force:
			f = open(color_txt_file, 'w')
			f.write(str)
			f.close()

		ds 		= None
		band 	= None

		if not os.path.isfile(dest_img) or self.force:
			cmd ="gdaldem color-relief -co COMPRESS=DEFLATE -nearest_color_entry " + out_img + " " + color_txt_file + " " + dest_img
			print cmd
			err = os.system(cmd)
			if err != 0:
				print('ERROR: color_relief file could not be generated:', err)
				sys.exit(-1)

		if not os.path.isfile(legend) or self.force:
			self.legend( [min, mmid_lower, mid_lower, mid_lower_m, mean, mmid_higher, mid_higher, mid_higher_m, max])
#
# Main
#
# landscan.py -f --year 2011 --bbox  21.35655 -18.47611  21.98187 -17.88733 --dir /shared/production/proddata/radarsat/l1g/files/RS2_OK37182_PK361606_DK319629_F1N_20130119_040305_HH_HV_SGF

if __name__ == '__main__':
	version_num = int(gdal.VersionInfo('VERSION_NUM'))
	if version_num < 1800: # because of GetGeoTransform(can_return_null)
		print('ERROR: Python bindings of GDAL 1.8.0 or later required')
		sys.exit(1)

	parser 		= argparse.ArgumentParser(description='Generate HAND')
	apg_input 	= parser.add_argument_group('Input')
	apg_input.add_argument("-f", "--force", action='store_true', help="forces new product to be generated")
	apg_input.add_argument("-b", "--bbox", nargs=4, type=float, metavar=('X1', 'Y1', 'X2', 'Y2'), help="generate DEM inside a bounding box")
	apg_input.add_argument("-d", "--dir",  nargs=1, help="Directory")
	apg_input.add_argument("-y", "--year",  nargs=1, help="2002 or 2011")

	options 	= parser.parse_args()

	force		= options.force
	bbox		= options.bbox
	year		= options.year[0]
	target_dir	= options.dir[0]

	# Landscan directory
	dir 	= "/Volumes/MacBay3/GeoData/ls"

	if year == '2002':
		ls 		= "LandScan-2002/landscan-02.tif"
	else:
		ls 		= "LandScan-2011/ArcGIS/Population/lspop2011.tif"
		
	
	app = Landscan(dir, ls, force, bbox, target_dir)
	app.density()