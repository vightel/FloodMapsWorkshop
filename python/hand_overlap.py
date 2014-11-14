#!/usr/bin/env python
import sys, os
from datetime import datetime
import argparse
import config


namibia_tiles = [
"AF/s20e015",
"AF/s20e020",
"AF/s20e025",
"AF/s25e015",
"AF/s25e020",
"AF/s25e025"
]
	
# Given these tiles we want to generate HAND for theses seams
seams = [
	[
		"AF/s25e019",
		[19, -25, 21, -15]
	],
	[	
		"AF/s25e024",
		[24, -25, 26, -15]
	],
	[
		"AF/s21e015",
		[15, -21, 30, -19]
	]
]


hand_dir 		= config.HANDS_DIR			#"/shared/production/proddata"
hydrosheds_dir	= config.HYDROSHEDS_DIR		#os.path.join(hand_dir, "HydroSHEDS" )
area			= config.HANDS_AREA

dem_vrt			= os.path.join(hand_dir, area + "_dem.vrt" )
dir_vrt			= os.path.join(hand_dir, area + "_dir.vrt" )

tile_list		= namibia_tiles
zone			= "AF"

# Make sure the vrts exist
if( not os.path.exists(dem_vrt)):
	print "vrt does not exist", dem_vrt
	cmd 	= "gdalbuildvrt " + dem_vrt
	files 	= " "
	for name in tile_list:
		ar = name.split('/')
		zone = ar[0]
		tile = ar[1]
		dir_file = os.path.join(hydrosheds_dir, zone, tile, tile+"_dem_bil", tile+"_dem_4326.tif" )

		files += dir_file + " "

	cmd += files
	print str(datetime.now()), cmd
	err = os.system(cmd)
	
if( not os.path.exists(dir_vrt)):
	print "vrt does not exist", dir_vrt
	cmd = "gdalbuildvrt " + dir_vrt
	files 	= " "
	for name in tile_list:
		ar = name.split('/')
		zone = ar[0]
		tile = ar[1]
		dir_file = os.path.join(hydrosheds_dir, zone, tile, tile+"_dir_bil", tile+"_dir_4326.tif" )

		files += dir_file + " "

	cmd += files
	print str(datetime.now()), cmd
	err = os.system(cmd)

for s in seams:
	tileName 	= s[0]
	tileBBox	= s[1]
	ar 			= tileName.split('/')
	zone 		= ar[0]
	tile 		= ar[1]

	folder			= os.path.join(hydrosheds_dir, zone, tile )
	if( not os.path.exists(folder)):
		os.mkdir(folder)

	dem_folder		= os.path.join(folder, tile+"_dem_bil" )
	if( not os.path.exists(dem_folder)):
		os.mkdir(dem_folder)

	dir_folder		= os.path.join(folder, tile+"_dir_bil" )
	if( not os.path.exists(dir_folder)):
		os.mkdir(dir_folder)
	
	tile_dem_data = os.path.join(dem_folder, tile+"_dem_4326.tif" )
	if( not os.path.exists(tile_dem_data)):
		cmd = "gdalwarp -te "+ " ".join(str(x) for x in tileBBox) + " " + dem_vrt + " " + tile_dem_data
		print cmd
		err = os.system(cmd)

	tile_dir_data = os.path.join(dir_folder, tile+"_dir_4326.tif" )
	if( not os.path.exists(tile_dir_data)):
		cmd = "gdalwarp -te "+  " ".join(str(x) for x in tileBBox) + " " + dir_vrt + " " + tile_dir_data
		print cmd
		err = os.system(cmd)

	hand_data = os.path.join(hand_dir, tile+"_hand.tif" )
	if( not os.path.exists(hand_data)):
		cmd = "hand.py -m " + str(config.HANDS_HEIGHT) + " --zone " + zone + " --tile " + tile + " --proj 4326 -v"
		print cmd
		err = os.system(cmd)

#
# Now we need to mosaic it back together
#
mergedFileName 		= os.path.join(hand_dir, config.HANDS_AREA + "_hand_merged.tif" )
mergedLZWFileName 	= os.path.join(hand_dir, config.HANDS_AREA + "_hand_merged_lzw.tif" )

cmd = "gdalwarp "
for name in tile_list:
	fullName = os.path.join(hand_dir, name+"_hand.tif" )
	cmd += fullName + " "
	
for s in seams:
	name = s[0]
	fullName = os.path.join(hand_dir, name+"_hand.tif" )
	cmd += fullName + " "
	
cmd += mergedFileName
print cmd
err = os.system(cmd)

cmd = "gdal_translate -co compress=lzw " + mergedFileName + " " + mergedLZWFileName
print cmd
err = os.system(cmd)

# Cleanup
cmd = "rm " + mergedFileName
print cmd
err = os.system(cmd)

	


