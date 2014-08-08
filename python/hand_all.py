#!/usr/bin/env python
import sys, os
from datetime import datetime
import argparse
import config

if __name__ == '__main__':

	north_america_canada_tiles = [
	    "NA/n20w075",
	    "NA/n20w080",
	    "NA/n20w085",
	    "NA/n20w090",
	    "NA/n20w095",
	    "NA/n20w100",
	    "NA/n20w105",
	    "NA/n20w110",
	    "NA/n20w115",
	    "NA/n20w120",
	    "NA/n25w080",
	    "NA/n25w085",
	    "NA/n25w090",
	    "NA/n25w095",
	    "NA/n25w100",
	    "NA/n25w105",
	    "NA/n25w110",
	    "NA/n25w115",
	    "NA/n25w120",
	    "NA/n30w080",
	    "NA/n30w085",
	    "NA/n30w090",
	    "NA/n30w095",
	    "NA/n30w100",
	    "NA/n30w105",
	    "NA/n30w110",
	    "NA/n30w115",
	    "NA/n30w120",
	    "NA/n30w125",
	    "NA/n35w075",
	    "NA/n35w080",
	    "NA/n35w085",
	    "NA/n35w090",
	    "NA/n35w095",
	    "NA/n35w100",
	    "NA/n35w105",
	    "NA/n35w110",
	    "NA/n35w115",
	    "NA/n35w120",
	    "NA/n35w125",
	    "NA/n40w060",
	    "NA/n40w065",
	    "NA/n40w070",
	    "NA/n40w075",
	    "NA/n40w080",
	    "NA/n40w085",
	    "NA/n40w090",
	    "NA/n40w095",
	    "NA/n40w100",
	    "NA/n40w105",
	    "NA/n40w110",
	    "NA/n40w115",
	    "NA/n40w120",
	    "NA/n40w125",
	    "NA/n45w055",
	    "NA/n45w060",
	    "NA/n45w065",
	    "NA/n45w070",
	    "NA/n45w075",
	    "NA/n45w080",
	    "NA/n45w085",
	    "NA/n45w090",
	    "NA/n45w095",
	    "NA/n45w100",
	    "NA/n45w105",
	    "NA/n45w110",
	    "NA/n45w115",
	    "NA/n45w120",
	    "NA/n45w125",
	    "NA/n45w130",
	    "NA/n50w060",
	    "NA/n50w065",
	    "NA/n50w070",
	    "NA/n50w075",
	    "NA/n50w080",
	    "NA/n50w085",
	    "NA/n50w090",
	    "NA/n50w095",
	    "NA/n50w100",
	    "NA/n50w105",
	    "NA/n50w110",
	    "NA/n50w115",
	    "NA/n50w120",
	    "NA/n50w125",
	    "NA/n50w130",
	    "NA/n50w135",
	    "NA/n55w060",
	    "NA/n55w065",
	    "NA/n55w070",
	    "NA/n55w075",
	    "NA/n55w080",
	    "NA/n55w085",
	    "NA/n55w090",
	    "NA/n55w095",
	    "NA/n55w100",
	    "NA/n55w105",
	    "NA/n55w110",
	    "NA/n55w115",
	    "NA/n55w120",
	    "NA/n55w125",
	    "NA/n55w130",
	    "NA/n55w135",
	    "NA/n55w140",
	    "NA/n55w145"

	]
	# Europe
	europe_tiles = [
	"EU/n10e000",
	"EU/n10e005",
	"EU/n10e010",
	"EU/n10e015",
	"EU/n10e020",
	"EU/n10e025",
	"EU/n10e030",
	"EU/n10e035",
	"EU/n10e040",
	"EU/n10e045",
	"EU/n10e050",
	"EU/n10e070",
	"EU/n10w005",
	"EU/n10w010",
	"EU/n10w015",
	"EU/n10w020",
	"EU/n15e000",
	"EU/n15e005",
	"EU/n15e010",
	"EU/n15e015",
	"EU/n15e020",
	"EU/n15e025",
	"EU/n15e030",
	"EU/n15e035",
	"EU/n15e040",
	"EU/n15e045",
	"EU/n15e050",
	"EU/n15e055",
	"EU/n15w005",
	"EU/n15w010",
	"EU/n15w015",
	"EU/n15w020",
	"EU/n20e000",
	"EU/n20e005",
	"EU/n20e010",
	"EU/n20e015",
	"EU/n20e020",
	"EU/n20e025",
	"EU/n20e030",
	"EU/n20e035",
	"EU/n20e040",
	"EU/n20e045",
	"EU/n20e050",
	"EU/n20e055",
	"EU/n20e065",
	"EU/n20w005",
	"EU/n20w010",
	"EU/n20w015",
	"EU/n20w020",
	"EU/n25e000",
	"EU/n25e005",
	"EU/n25e010",
	"EU/n25e015",
	"EU/n25e020",
	"EU/n25e025",
	"EU/n25e030",
	"EU/n25e035",
	"EU/n25e040",
	"EU/n25e045",
	"EU/n25e050",
	"EU/n25e055",
	"EU/n25e060",
	"EU/n25e065",
	"EU/n25w005",
	"EU/n25w010",
	"EU/n25w015",
	"EU/n25w020",
	"EU/n30e000",
	"EU/n30e005",
	"EU/n30e010",
	"EU/n30e015",
	"EU/n30e020",
	"EU/n30e025",
	"EU/n30e030",
	"EU/n30e035",
	"EU/n30e040",
	"EU/n30e045",
	"EU/n30e050",
	"EU/n30e055",
	"EU/n30e060",
	"EU/n30e065",
	"EU/n30w005",
	"EU/n30w010",
	"EU/n30w020",
	"EU/n35e000",
	"EU/n35e005",
	"EU/n35e010",
	"EU/n35e015",
	"EU/n35e020",
	"EU/n35e025",
	"EU/n35e030",
	"EU/n35e035",
	"EU/n35e040",
	"EU/n35e045",
	"EU/n35e050",
	"EU/n35e055",
	"EU/n35e060",
	"EU/n35e065",
	"EU/n35w005",
	"EU/n35w010",
	"EU/n40e000",
	"EU/n40e005",
	"EU/n40e010",
	"EU/n40e015",
	"EU/n40e020",
	"EU/n40e025",
	"EU/n40e030",
	"EU/n40e035",
	"EU/n40e040",
	"EU/n40e045",
	"EU/n40e050",
	"EU/n40e055",
	"EU/n40e060",
	"EU/n40e065",
	"EU/n40w005",
	"EU/n40w010",
	"EU/n45e000",
	"EU/n45e005",
	"EU/n45e010",
	"EU/n45e015",
	"EU/n45e020",
	"EU/n45e025",
	"EU/n45e030",
	"EU/n45e035",
	"EU/n45e040",
	"EU/n45e045",
	"EU/n45e050",
	"EU/n45e055",
	"EU/n45e060",
	"EU/n45e065",
	"EU/n45w005",
	"EU/n45w010",
	"EU/n50e000",
	"EU/n50e005",
	"EU/n50e010",
	"EU/n50e015",
	"EU/n50e020",
	"EU/n50e025",
	"EU/n50e030",
	"EU/n50e035",
	"EU/n50e040",
	"EU/n50e045",
	"EU/n50e050",
	"EU/n50e055",
	"EU/n50e060",
	"EU/n50e065",
	"EU/n50w005",
	"EU/n50w010",
	"EU/n50w015",
	"EU/n55e000",
	"EU/n55e005",
	"EU/n55e010",
	"EU/n55e015",
	"EU/n55e020",
	"EU/n55e025",
	"EU/n55e030",
	"EU/n55e035",
	"EU/n55e040",
	"EU/n55e045",
	"EU/n55e050",
	"EU/n55e055",
	"EU/n55e060",
	"EU/n55e065",
	"EU/n55w005",
	"EU/n55w010",
	"EU/n55w015" ]

	# Pilot tiles
	
	all_tiles = [
	# Central America
	"CA/n05w060",
	"CA/n05w065",
	"CA/n05w070",
	"CA/n05w075",
	"CA/n05w080",
	"CA/n05w085",
	"CA/n05w090",
	"CA/n10w060",
	"CA/n10w065",
	"CA/n10w070",
	"CA/n10w075",
	"CA/n10w080",
	"CA/n10w085",
	"CA/n10w090",
	"CA/n10w095",
	"CA/n10w110",
	"CA/n15w065",
	"CA/n15w070",
	"CA/n15w075",
	"CA/n15w080",
	"CA/n15w085",
	"CA/n15w090",
	"CA/n15w095",
	"CA/n15w100",
	"CA/n15w110",
	"CA/n15w115",
	"CA/n20w075",
	"CA/n20w080",
	"CA/n20w085",
	"CA/n20w090",
	"CA/n20w095",
	"CA/n20w100",
	"CA/n20w110",
	"CA/n20w115",
	"CA/n20w120",
	"CA/n25w080",
	"CA/n25w085",
	"CA/n25w090",
	"CA/n25w095",
	"CA/n25w100",
	"CA/n25w110",
	"CA/n25w115",
	"CA/n25w120",
	"CA/n30w080",
	"CA/n30w085",
	"CA/n30w090",
	"CA/n30w095",
	"CA/n30w100",
	"CA/n30w110",
	"CA/n30w115",
	"CA/n30w120",
	"CA/n30w125",
	"CA/n35w075",
	"CA/n35w080",
	"CA/n35w085",
	"CA/n35w090",
	"CA/n35w095",
	"CA/n35w100",
	"CA/n35w110",
	"CA/n35w115",
	"CA/n35w120",
	"CA/n35w125",
	# Namibia pilot
	"AF/s20e015",
	"AF/s20e020"
	]

	namibia_tiles = [
	"AF/s20e015",
	"AF/s20e020"
	]
	
	haiti_tiles = [
	"CA/n15w070",
	"CA/n15w075"
	]

	test_tiles = [
	"CA/n10w065",
	"CA/n15w075"
	]
	
	parser = argparse.ArgumentParser(description='Generate HAND tiles')
	apg_input = parser.add_argument_group('Input')
	apg_input.add_argument("-f", "--force", action='store_true', help="HydroSHEDS forces new water image to be generated")
	apg_input.add_argument("-a", "--area", nargs=1, help="HydroSHEDS area")
	apg_input.add_argument("-v", "--verbose", action='store_true', help="Verbose on/off")
	apg_input.add_argument("-vrt", "--vrt", action='store_true', help="build vrt only")
	
	options = parser.parse_args()
	
	vrt 		= options.vrt
	area		= options.area[0] || config.HANDS_AREA
	force		= options.force
	verbose		= options.verbose
	
	hand_dir 	= config.HANDS_DIR			#"/shared/production/proddata"
	dir 		= config.HYDROSHEDS_DIR		#os.path.join(hand_dir, "HydroSHEDS" )
	
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
			# Not used anymore...
			#con_dir  = os.path.join(tile_dir,tile+"_con_bil")
			#if not os.path.exists(dem_dir):
				#filename = tile+"_con_bil.zip"
				#cmd = "wget -O "+tile_dir+"/"+filename+" http://earlywarning.usgs.gov/hydrodata/sa_con_3s_bil/"+zone+"/"+filename
				#print str(datetime.now()),cmd
				#err = os.system(cmd)
	
				#cmd = "unzip "+tile_dir+"/"+filename+" -d "+tile_dir+"/"+tile+"_con_bil"
				#print str(datetime.now()),cmd
				#err = os.system(cmd)

			cmd = "rm "+tile_dir+"/*.zip"
			#print str(datetime.now()), cmd
			err = os.system(cmd)

			hand_file = os.path.join(hand_dir, zone, tile+"_hand.tif" )
			if not os.path.exists(hand_file):
				cmd = "hand.py -m 9 --zone "+zone+" --tile "+tile+" --proj 4326"
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
	# now merge results for dem 3857
	#
	#outfile = os.path.join(hand_dir, "hand", "all_dem_3857.vrt" )
	#if not os.path.exists(outfile):
	#	#cmd 	= "gdal_merge.py "
	#	#cmd 	+= "-init 255 -n 0 -co COMPRESS=DEFLATE -o " + outfile
	#	cmd = "gdalbuildvrt " + outfile
	#	files 	= " "
	#	for name in tile_list:
	#		ar = name.split('/')
	#		zone = ar[0]
	#		tile = ar[1]
	#		dem_file = os.path.join(dir, zone, tile, tile+"_dem_bil", tile+"_dem_3857.tif" )
	#
	#		files += dem_file + " "
	#
	#	cmd += files
	#	print str(datetime.now()), cmd
	#	err = os.system(cmd)