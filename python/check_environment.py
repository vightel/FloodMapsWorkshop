#! /usr/bin/env python
#
# Check Environment
#

import os,sys,math,urllib2,urllib
import psycopg2
import ppygis
from which import *
from urlparse import urlparse
#from xml.dom import minidom
import xml.etree.ElementTree as ET

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

DATABASE_URL 	= os.environ["DATABASE_URL"]
assert( DATABASE_URL)
url 			= urlparse(DATABASE_URL)
dbhost			= url.hostname
dbport			= url.port
dbname			= url.path[1:]
user			= url.username
password		= url.password
		
str= "host=%s dbname=%s port=%s user=%s password=%s"% (dbhost,dbname,dbport,user,password)

print "Connect to", str
check_db(str)

# Check that Database ENVs match DATABASE_URL
if dbhost != os.environ["DBHOST"]:
	print "DBHOST does not match DATABASE_URL", dbhost, os.environ["DBHOST"], DATABASE_URL
	sys.exit(-1)

if dbport != int(os.environ["DBPORT"]):
	print "DBPORT does not match DATABASE_URL", dbport, os.environ["DBPORT"], DATABASE_URL
	sys.exit(-1)

if dbname != os.environ["DBNAME"]:
	print "DBNAME does not match DATABASE_URL", dbname, os.environ["DBNAME"], DATABASE_URL
	sys.exit(-1)

if user != os.environ["DBOWNER"]:
	print "DBOWNER does not match DATABASE_URL", user, os.environ["DBOWNER"], DATABASE_URL
	sys.exit(-1)

if password != os.environ["PGPASS"]:
	print "PGPASS does not match DATABASE_URL", password, os.environ["PGPASS"], DATABASE_URL
	sys.exit(-1)

#
# Check the Mapnik Configuration
#
print "Checking Mapnik Datasource Configuration..."
mapnik_datasource_file = "inc/datasource-settings.xml.inc"
xml = "<root>\n"+open(mapnik_datasource_file,'r').read()+"\n</root>"
tree = ET.fromstring(xml)
for child in tree:
	name 	= child.get('name')
	value	= child.text
	#print child.tag, child.attrib, name, value
	if name == 'host':
		if value != dbhost:
			print "host parameter does not match in inc/datasource-settings.xml.inc", value, dbhost
			sys.exit(-1)
	if name == 'password':
		if value != password:
			print "password parameter does not match in inc/datasource-settings.xml.inc", value, password
			sys.exit(-1)
	if name == 'port':
		if int(value) != dbport:
			print "port parameter does not match in inc/datasource-settings.xml.inc", value, dbport
			sys.exit(-1)
	if name == 'user':
		if value != user:
			print "user parameter does not match in inc/datasource-settings.xml.inc", value, user
			sys.exit(-1)
	if name == 'dbname':
		if value != dbname:
			print "dbname parameter does not match in inc/datasource-settings.xml.inc", value, dbname
			sys.exit(-1)
	
	
print "Checking Node Environment for Publisher"
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