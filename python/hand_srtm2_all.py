#!/usr/bin/env python
import sys, os
from datetime import datetime
import argparse
import config
	
	
if __name__ == '__main__':

	# Namibia Pilot Tiles
	namibia_tiles = [
	"AF/s18_e019_1arc_v3.tif",
	"AF/s18_e020_1arc_v3.tif",
	"AF/s18_e023_1arc_v3.tif",
	"AF/s18_e024_1arc_v3.tif",
	"AF/s18_e025_1arc_v3.tif",
	"AF/s19_e019_1arc_v3.tif",
	"AF/s19_e020_1arc_v3.tif",
	"AF/s19_e021_1arc_v3.tif",
	"AF/s19_e022_1arc_v3.tif",
	"AF/s19_e024_1arc_v3.tif",
	"AF/s19_e025_1arc_v3.tif",
	]
	
	parser = argparse.ArgumentParser(description='Generate SRTM-2 tiles')
	apg_input = parser.add_argument_group('Input')
	apg_input.add_argument("-f", "--force", action='store_true', help="Forces new products to be generated")
	apg_input.add_argument("-v", "--verbose", action='store_true', help="Verbose on/off")
	apg_input.add_argument("-vrt", "--vrt", action='store_true', help="build vrt only")

	
	options = parser.parse_args()
	
	vrt 		= options.vrt
	area		= config.HANDS_AREA
	force		= options.force
	verbose		= options.verbose
	
	hand_dir 	= config.HANDS_DIR 
	dir 		= config.SRTM2_DIR
	
	
	tile_list	= eval(area+"_tiles")
	
	if verbose:
		print "area:", area
		print "vrt:", vrt
		print "tile list:", tile_list
		
	if not vrt:	# Build HydroSHEDS dir and HAND tif files
		for name in tile_list:
			ar = name.split('/')
			zone = ar[0]
			tile = ar[1]
			print str(datetime.now()),zone, tile
	
	# 
	# now merge results for dem
	#
	outfile = os.path.join(dir, area + "_dem.vrt" )
	if not os.path.exists(outfile):
		cmd = "gdalbuildvrt " + outfile
		files 	= " "
		for name in tile_list:
			ar = name.split('/')
			zone = ar[0]
			tile = ar[1]
			dem_file = os.path.join(dir, zone, tile )
	
			files += dem_file + " "
	
		cmd += files
		print str(datetime.now()), cmd
		err = os.system(cmd)