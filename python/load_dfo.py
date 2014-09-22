#!/usr/bin/env python
#
# Created on 08/19/2014 Pat Cappelaere - Vightel Corporation
#
# Input: Load DFO scene into POSTGIS DB
#

import os, inspect, sys
import argparse
from urlparse import urlparse

import psycopg2
import ppygis
import pprint
from osgeo import gdal

import config

force 	= 0
verbose	= 0

# load_dfo.py --scene 2014Bangladesh4178

if __name__ == '__main__':

	parser = argparse.ArgumentParser(description='Load DFO scene')
	apg_input = parser.add_argument_group('Input')
	apg_input.add_argument("-f", "--force", 	action='store_true', help="Forces new product to be generated")
	apg_input.add_argument("-v", "--verbose", 	action='store_true', help="Verbose on/off")
	apg_input.add_argument("-s", "--scene", 	help="dfo scene")
	
	options 	= parser.parse_args()
	force		= options.force
	verbose		= options.verbose
	scene	 	= options.scene
	
	arr 		= scene.split("_")
	datestr		= arr[0]
	num			= arr[2]
	date		= datestr[0:4]+"-"+datestr[4:6]+"-"+datestr[6:8]
	if verbose:
		print "Date:", date
	
	
	fullName	= os.path.join(config.DFO_DIR,num, datestr, scene+".tif")
	
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
	
	DATABASE_URL 	= os.environ["DATABASE_URL"]
	assert( DATABASE_URL)
	url 			= urlparse(DATABASE_URL)
	dbhost			= url.hostname
	dbport			= url.port
	dbname			= url.path[1:]
	user			= url.username
	password		= url.password
	
	str= "host=%s dbname=%s port=%s user=%s password=%s"% (dbhost,dbname,dbport,user,password)
	if verbose:
		print "connect to", str
	
	connection	= psycopg2.connect(str)
	cursor 		= connection.cursor()
	
	# Check if scene already exists
	cmd = "SELECT * from dfo  WHERE scene = '%s'" % ( scene )
	cursor.execute(cmd)
	x = cursor.fetchone()
	if x == None:
		cmd 	= "INSERT INTO dfo (scene, date, center_lat, center_lon, geom) VALUES('%s', '%s', %f, %f, ST_GeomFromText('%s',4326))" % ( scene, date, centerlat, centerlon, geometry )
		res = cursor.execute(cmd)
		if verbose:
			print cmd, res
	else:
		print "Scene:", scene, " already inserted"
		
	connection.commit()
	cursor.close()
	connection.close()