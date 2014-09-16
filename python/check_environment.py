#! /usr/bin/env python
#
# Check Environment
#

import os,sys,math,urllib2,urllib
import psycopg2
import ppygis
from which import *

import config
from osgeo import gdal
from osgeo import osr
from osgeo import ogr

import numpy
import scipy
import mapnik
from mapnik import DatasourceCache as datasourceCache;

version_num = int(gdal.VersionInfo('VERSION_NUM'))
if version_num < 1800: # because of GetGeoTransform(can_return_null)
	print('ERROR: Python bindings of GDAL 1.8.0 or later required')
	sys.exit(1)

err = which("convert")
if err == None:
	print "convert missing"
	sys.exit(-1)

err = which("bzip2")
if err == None:
	print "bzip2 missing"
	sys.exit(-1)

err = which("potrace")
if err == None:
	print "potrace missing"
	sys.exit(-1)

err = which("topojson")
if err == None:
	print "topojson missing"
	sys.exit(-1)

# make sure that mapnik has the gdal plugin
if not 'gdal' in datasourceCache.plugin_names():
	print "Missing 'gdal' input plugin in mapnik - brew install mapnik --with-gdal --with-postgresql --with-cairo"
	sys.exit(-1)
	
#
# Check Database Connection
#
def check_db(str):
	print "trying to connect to:", str
	
	connection 	= psycopg2.connect(str)
	cursor 		= connection.cursor()

	cmd = "SELECT version();"
	print cmd
	cursor.execute(cmd)
	result = cursor.fetchone()
	print result		
	connection.commit()
	cursor.close()
	connection.close()
	
envs = [
	"WORKSHOP_DIR",
	"DBHOST",
	"DBNAME",
	"DBOWNER",
	"DBPORT", 
	"PGPASS",
	"DATABASE_URL",
	"USGS_ACCOUNT",
	"USGS_PASSWORD"
]

node_envs = [
    "FACEBOOK_APP_SECRET",
    "FACEBOOK_APP_ID",
    "FACEBOOK_PROFILE_ID",
    "TWITTER_SITE",
    "TWITTER_SITE_ID",
    "TWITTER_CREATOR",
    "TWITTER_CREATOR_ID",
    "TWITTER_DOMAIN",
    "COOKIEHASH"
]

environment = {}
	
for e in envs:
	print "checking:", e
	environment[e] = os.environ[e]
	assert (environment[e]), "Missing environment variable:"+e
	
print "All required environment variables are set..."

#
# Database Check
#

str= "host=%s dbname=%s port=%s user=%s password=%s"% (environment["DBHOST"],environment["DBNAME"],environment["DBPORT"],environment["DBOWNER"], environment["PGPASS"])
check_db(str)

print "checking Node Environment for Publisher"
for e in node_envs:
	print "checking:", e
	environment[e] = os.environ[e]
	assert (environment[e]), "Missing environment variable:"+e

#
# Check Config Directories
#

config_dirs = [
	"DATA_DIR",
	"HANDS_DIR",
	"HYDROSHEDS_DIR",
	"LANDSAT8_DIR",
	"RADARSAT2_DIR",
	"MODIS_DIR",
	"EO1_DIR",
	"CSV_DIR",
	"DFO_DIR"
]

for d in config_dirs:
	mydir = eval('config.'+d)
	if not os.path.exists(mydir):
		print "Directory:", mydir, " does not exist... you may need to create it"
	else:
		print mydir, " does  exist.  Good."