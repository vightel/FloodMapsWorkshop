#!/usr/bin/env python
import os, inspect, sys
import argparse

import numpy
import scipy
import math, time
from osgeo import gdal

import config

from eo1_ali_l1t import EO1_ALI_L1T

if __name__ == '__main__':

	parser = argparse.ArgumentParser(description='Generate EO-1 ALI Cloud Mask')
	apg_input = parser.add_argument_group('Input')
	apg_input.add_argument("-f", "--force", 	action='store_true', help="Forces new product to be generated")
	apg_input.add_argument("-v", "--verbose", 	action='store_true', help="Verbose on/off")
	apg_input.add_argument("-s", "--scene", 	help="EO-1 Scene")
	

	options 	= parser.parse_args()
	force		= options.force
	verbose		= options.verbose
	scene	 	= options.scene

	outdir		= os.path.join(config.EO1_DIR,scene)	
	scene	 	= options.scene.split("_")[0]
	
	app 		= EO1_ALI_L1T(outdir, scene )
	
	print "Loading band 2"
	
	dn 			= app.get_band_data(2)
	radiance 	= app.radiance(2, dn)
	toa 		= app.toa(2, radiance)
	toa[dn==0] 	= 0
	
	mult = 0.9
	
	output_file = "cum_toa_"+str(mult)+".tif"
	
	for i in range(3,10):
		print "Loading band", i
		dn_i 		= app.get_band_data(i)
		radiance_i 	= app.radiance(i, dn_i)
		toa_i 		= app.toa(i, radiance_i)
				
		toa	= mult * toa + (1 - mult) * toa_i
		toa[dn_i==0] = 0

	toa[dn==0] = 0
		
	app.write_data( app.linear_stretch(toa), output_file, gdal.GDT_Byte, 1, 0)
		
	print "Done"
	
	
	

