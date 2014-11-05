#!/usr/bin/env python
#
# Created on 07/11/2014 Pat Cappelaere - Vightel Corporation
#
# Output: Landsat 8 browse image
#

import os, inspect, sys
import argparse

import numpy
import scipy
import math

from scipy import ndimage

from osgeo import gdal
from osgeo import osr
from osgeo import ogr
from which import *

import config

force 	= 0
verbose	= 0

class Landsat8:
	def __init__( self, outpath, scene ):	
		self.scene			 	= scene
		self.composite_file		= os.path.join(outpath, scene + "_COMPOSITE_432_4326.tif")
		self.watermap_file		= os.path.join(outpath, scene + "_WATERMAP.tif.hand.tif")
		self.browse_file		= os.path.join(outpath, scene + "_watermap_browseimage.tif")
		self.thn_browse_file	= os.path.join(outpath, scene + "_watermap_browseimage.thn.png")
	#
	# execute with verbose option
	#
	def execute( self, cmd ):
		if verbose:
			print cmd
		os.system(cmd)
		
	def process(self):
		if not os.path.isfile(self.composite_file):
			cmd = str.format("landsat8_composite_toa.py --scene {0} --red 4 --green 3 --blue 2", self.scene)
			self.execute(cmd)
		
		if force or not os.path.isfile(self.browse_file):
			cmd = str.format("composite -gravity center {0} {1} {2}", self.watermap_file, self.composite_file, self.browse_file)
			self.execute(cmd)

		if force or not os.path.isfile(self.thn_browse_file):
			cmd = str.format("convert {0} -resize 10% {1}", self.browse_file, self.thn_browse_file)
			self.execute(cmd)

		if os.path.isfile(self.browse_file):
			cmd = str.format("rm {0}", self.browse_file)
			self.execute(cmd)
		
		
if __name__ == '__main__':

	parser = argparse.ArgumentParser(description='Generate Landsat8 Floodmap vectors')
	apg_input = parser.add_argument_group('Input')
	apg_input.add_argument("-f", "--force", 	action='store_true', help="Forces new product to be generated")
	apg_input.add_argument("-v", "--verbose", 	action='store_true', help="Verbose on/off")
	apg_input.add_argument("-s", "--scene", 	help="Landsat Scene")

	options 	= parser.parse_args()
	force		= options.force
	verbose		= options.verbose
	scene	 	= options.scene

	outdir		= os.path.join(config.LANDSAT8_DIR,scene)	

	app 		= Landsat8(outdir, scene)

	app.process()