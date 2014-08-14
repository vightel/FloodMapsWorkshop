#!/usr/bin/env python
#
# Created on 07/11/2014 Pat Cappelaere - Vightel Corporation
#
# Input: Load Radarsat2 scene into POSTGIS DB
#

import os, inspect, sys
import argparse

import psycopg2
import ppygis
import pprint
from osgeo import gdal

import config

force 	= 0
verbose	= 0

# load_radarsat2.py --scene RS2_OK33065_PK325251_DK290050_F6F_20120825_230857_HH_SGF

if __name__ == '__main__':

	parser = argparse.ArgumentParser(description='Load Radarsat2 scene')
	apg_input = parser.add_argument_group('Input')
	apg_input.add_argument("-f", "--force", 	action='store_true', help="Forces new product to be generated")
	apg_input.add_argument("-v", "--verbose", 	action='store_true', help="Verbose on/off")
	apg_input.add_argument("-s", "--scene", 	help="radarsat2 scene")
	
	options 	= parser.parse_args()
	force		= options.force
	verbose		= options.verbose
	scene	 	= options.scene
	
	fullName	= os.path.join(config.RADARSAT2_DIR,scene, "outputfile_4326_hand.tif")
	
	# check if file exists
	if not os.path.isfile(fullName):
		print "Cannot find product file", fullName
		sys.exit(-1)

	ds 				= gdal.Open( fullName )
	geotransform 	= ds.GetGeoTransform()

	north 		 	= geotransform[3]
	west		 	= geotransform[0]
	south		 	= north - geotransform[1]* ds.RasterYSize
	east		 	= west + geotransform[1]* ds.RasterXSize

	centerlat		= (north+south)/2.0
	centerlon		= (west + east)/2.0

	p1 	= "%f %f" % (north, west )
	p2	= "%f %f" % (north, east )
	p3	= "%f %f" % (south, east )
	p4	= "%f %f" % (south, west )

	geometry = "Polygon(( %s, %s, %s, %s, %s))" % (p1,p2,p3,p4,p1)
	
	arr 	= scene.split("_")
	datestr	= arr[5]
	date	= datestr[0:4]+"-"+datestr[4:6]+"-"+datestr[6:8]
	print "Date:", date
	
	
	dbhost 			= os.environ['DBHOST']
	dbname 			= os.environ['DBNAME']
	dbport 			= os.environ['DBPORT']
	user 			= os.environ['DBOWNER']
	password 		= os.environ['PGPASS']
	
	assert (dbhost),	"Set DBHOST"
	assert (dbname),	"Set DBNAME"
	assert (dbport),	"Set DBPORT"
	assert (user),		"Set DBOWNER"
	assert (password),	"Set PGPASS"
	
	# scene, date, center_lat, center_lon, geometry
	# date 

	#print dbhost, dbname, dbport, user

	str= "host=%s dbname=%s port=%s user=%s password=%s"% (dbhost,dbname,dbport,user,password)
	print "connect to", str
	
	connection	= psycopg2.connect(str)
	cursor 		= connection.cursor()
	
	# Check if scene already exists
	cmd = "SELECT * from radarsat2  WHERE scene = '%s'" % ( scene )
	cursor.execute(cmd)
	x = cursor.fetchone()
	if x == None:
		cmd 	= "INSERT INTO radarsat2 (scene, date, center_lat, center_lon, geom) VALUES('%s', '%s', %f, %f, ST_GeomFromText('%s',4326))" % ( scene, date, centerlat, centerlon, geometry )
		res = cursor.execute(cmd)
		print cmd, res
	else:
		print "Scene:", scene, " already inserted"
	
	cursor.close()
	connection.close()