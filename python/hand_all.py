#!/usr/bin/env python
import sys, os
from datetime import datetime
import argparse
import config

if __name__ == '__main__':

	# Namibia Pilot Tiles
	namibia_tiles = [
	"AF/s20e015",
	"AF/s20e020",
	"AF/s20e025",
	"AF/s25e015",
	"AF/s25e020",
	"AF/s25e025"
	]
	
	# Haiti Pilot Tiles
	haiti_tiles = [
	"CA/n15w070",
	"CA/n15w075"
	]

	# Central America Pilot
	ca_tiles = [
	"CA/n10w065",
	"CA/n15w075"
	]
		
	parser = argparse.ArgumentParser(description='Generate HAND tiles')
	apg_input = parser.add_argument_group('Input')
	apg_input.add_argument("-f", "--force", action='store_true', help="HydroSHEDS forces new water image to be generated")
	apg_input.add_argument("-v", "--verbose", action='store_true', help="Verbose on/off")
	apg_input.add_argument("-vrt", "--vrt", action='store_true', help="build vrt only")
	
	options = parser.parse_args()
	
	vrt 		= options.vrt
	area		= config.HANDS_AREA
	force		= options.force
	verbose		= options.verbose
	
	hand_dir 	= config.HANDS_DIR 
	dir 		= config.HYDROSHEDS_DIR
	
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

			tile_dir = os.path.join(dir, zone, tile)
			if not os.path.exists(tile_dir):
				print('ERROR: dir file does not exist:', tile_dir)
				os.makedirs(tile_dir)
	
			## DIR
			bil_dir  = os.path.join(tile_dir, tile+"_dir_bil")
			if not os.path.exists(bil_dir):
				filename = tile+"_dir_bil.zip"
				cmd = "wget -O "+tile_dir+"/"+filename+" http://earlywarning.usgs.gov/hydrodata/sa_dir_3s_zip_bil/"+zone+"/"+filename
				print str(datetime.now()),cmd
				err = os.system(cmd)
	
				cmd = "unzip "+tile_dir+"/"+filename+" -d "+tile_dir+"/"+tile+"_dir_bil"
				print str(datetime.now()),cmd
				err = os.system(cmd)
	
			## DEM
			dem_dir  = os.path.join(tile_dir,tile+"_dem_bil")
			if not os.path.exists(dem_dir):
				filename = tile+"_dem_bil.zip"
				cmd = "wget -O "+tile_dir+"/"+filename+" http://earlywarning.usgs.gov/hydrodata/sa_dem_3s_bil/"+zone+"/"+filename
				print str(datetime.now()),cmd
				err = os.system(cmd)
	
				cmd = "unzip "+tile_dir+"/"+filename+" -d "+tile_dir+"/"+tile+"_dem_bil"
				print str(datetime.now()),cmd
				err = os.system(cmd)

			## CON conditioned elevation
			con_dir  = os.path.join(tile_dir,tile+"_con_bil")
			if not os.path.exists(con_dir):
				filename = tile+"_con_bil.zip"
				cmd = "wget -O "+tile_dir+"/"+filename+" http://earlywarning.usgs.gov/hydrodata/sa_con_3s_bil/"+zone+"/"+filename
				print str(datetime.now()),cmd
				err = os.system(cmd)
	
				cmd = "unzip "+tile_dir+"/"+filename+" -d "+tile_dir+"/"+tile+"_con_bil"
				print str(datetime.now()),cmd
				err = os.system(cmd)

			cmd = "rm -f "+tile_dir+"/*.zip"
			#print str(datetime.now()), cmd
			err = os.system(cmd)

			hand_file = os.path.join(hand_dir, zone, tile+"_hand.tif" )
			if not os.path.exists(hand_file):
				cmd = "hand.py -m "+ str(config.HANDS_HEIGHT) + " --zone " + zone + " --tile " + tile + " --proj 4326"
				
				if verbose:
					cmd += " -v"
					
				print str(datetime.now()), cmd
				err = os.system(cmd)
	# 
	# now merge results for hand
	#
	outfile = os.path.join(hand_dir, area + "_hand.vrt" )
	if force or not os.path.exists(outfile):
		cmd		= "gdalbuildvrt " + outfile
		files 	= " "
		for name in tile_list:
			ar = name.split('/')
			zone = ar[0]
			tile = ar[1]
			hand_file = os.path.join(hand_dir, zone, tile+"_hand.tif" )
			
			files += hand_file + " "
		
		cmd += files
		if verbose:
			print str(datetime.now()), cmd
		err = os.system(cmd)
		
		if verbose:
			print "Generated vrt:", outfile
	
	# 
	# now merge results for dem
	#
	outfile = os.path.join(hand_dir, area + "_dem.vrt" )
	if not os.path.exists(outfile):
		cmd = "gdalbuildvrt " + outfile
		files 	= " "
		for name in tile_list:
			ar = name.split('/')
			zone = ar[0]
			tile = ar[1]
			dem_file = os.path.join(dir, zone, tile, tile+"_dem_bil", tile+"_dem_4326.tif" )
	
			files += dem_file + " "
	
		cmd += files
		print str(datetime.now()), cmd
		err = os.system(cmd)
	
	# 
	# now merge results for dir
	#
	outfile = os.path.join(hand_dir, area + "_dir.vrt" )
	if not os.path.exists(outfile):
		cmd = "gdalbuildvrt " + outfile
		files 	= " "
		for name in tile_list:
			ar = name.split('/')
			zone = ar[0]
			tile = ar[1]
			dem_file = os.path.join(dir, zone, tile, tile+"_dir_bil", tile+"_dir_4326.tif" )
	
			files += dem_file + " "
	
		cmd += files
		print str(datetime.now()), cmd
		err = os.system(cmd)