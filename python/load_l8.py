#!/usr/bin/env python
#
# Created on 07/11/2014 Pat Cappelaere - Vightel Corporation
#
# Input: Load L8 CSV from USGS into POSTGIS DB
#

import os, inspect, sys
import argparse
from urlparse import urlparse

import psycopg2
import ppygis
import csv

import config

force 	= 0
verbose	= 0
entity_id_index 		= -1
acquisition_date_index	= -1
cloud_cover_index		= -1

center_lat_index		= -1
center_lon_index		= -1

nwc_lat_index			= -1
nwc_lon_index			= -1

nec_lat_index			= -1
nec_lon_index			= -1

sec_lat_index			= -1
sec_lon_index			= -1

swc_lat_index			= -1
swc_lon_index			= -1
			
def readHeaders(line):	
	global entity_id_index,acquisition_date_index,  cloud_cover_index,center_lat_index, center_lon_index, nwc_lat_index, nwc_lon_index
	global  nec_lat_index, nec_lon_index, swc_lat_index, swc_lon_index, sec_lat_index, sec_lon_index
	index = 0
	print line
	for val in line:
		if val == 'Entity ID':
			entity_id_index = index
		if val == 'Landsat Scene Identifier':
			entity_id_index = index
		if val == 'Acquisition Date':
			acquisition_date_index = index
		if val == 'Date Acquired':
			acquisition_date_index = index
		if val == 'Cloud Cover':
			cloud_cover_index = index
		if val == 'Scene Cloud Cover':
			cloud_cover_index = index
		if val == 'Center Latitude dec':
			center_lat_index = index
		if val == 'Center Longitude dec':
			center_lon_index = index
		if val == 'NW Corner Lat dec':
			nwc_lat_index = index
		if val == 'NW Corner Long dec':
			nwc_lon_index = index
		if val == 'NE Corner Lat dec':
			nec_lat_index = index
		if val == 'NE Corner Long dec':
			nec_lon_index = index
		if val == 'SE Corner Lat dec':
			sec_lat_index = index
		if val == 'SE Corner Long dec':
			sec_lon_index = index
		if val == 'SW Corner Lat dec':
			swc_lat_index = index
		if val == 'SW Corner Long dec':
			swc_lon_index = index
	
		index += 1
	
	assert(entity_id_index>=0)
	assert(acquisition_date_index>=0)
	assert(cloud_cover_index>=0)
	assert(center_lat_index>=0)
	assert(center_lon_index>=0)
	assert(nwc_lat_index>=0)
	assert(nwc_lon_index>=0)
	assert(nec_lat_index>=0)
	assert(nec_lon_index>=0)
	assert(sec_lat_index>=0)
	assert(sec_lon_index>=0)
	assert(swc_lat_index>=0)
	assert(swc_lon_index>=0)

	print entity_id_index, acquisition_date_index, cloud_cover_index,center_lat_index,  center_lon_index,nwc_lat_index, nwc_lon_index,nec_lat_index, nec_lon_index, swc_lat_index, swc_lon_index, sec_lat_index, sec_lon_index
	
		
def load_csv(fileName, cursor):
	with open(fullName, 'rU') as csvfile:
		reader 	= csv.reader(csvfile)
		count 	= 0
		for val in reader:
			if count == 0:
				readHeaders(val)
			else:
				#print val
				scene 		= val[entity_id_index]
				date 		= val[acquisition_date_index]
				cloud		= val[cloud_cover_index]
			
				center_lat	= float(val[center_lat_index])
				center_lon	= float(val[center_lon_index])
		
				nwc_lat		= float(val[nwc_lat_index])
				nwc_lon		= float(val[nwc_lon_index])
		
				nec_lat		= float(val[nec_lat_index])
				nec_lon		= float(val[nec_lon_index])
		
				sec_lat		= float(val[sec_lat_index])
				sec_lon		= float(val[sec_lon_index])
		
				swc_lat		= float(val[swc_lat_index])
				swc_lon		= float(val[swc_lon_index])
			
				print scene, date, cloud, center_lat, center_lon, nwc_lat, nwc_lon, nec_lat, nec_lon, sec_lat, sec_lon, swc_lat, swc_lon     
				
				p1 	= "%f %f" % (float(nwc_lat), float(nwc_lon) )
				p2	= "%f %f" %(float(nec_lat),float(nec_lon) )
				p3	= "%f %f" %(float(sec_lat), float(sec_lon) )
				p4	= "%f %f" % (float(swc_lat), float(swc_lon))
		
				geometry = "Polygon(( %s, %s, %s, %s, %s))" % (p1,p2,p3,p4,p1)
				#print geometry
				
				cmd = "INSERT INTO l8 VALUES(%d, '%s', '%s', %f, %f, ST_GeomFromText('%s',4326))" % (count, scene, date, center_lat, center_lon, geometry )
				print cmd
			
				#if count == 10:
				#	break
					
				cursor.execute(cmd)
				
			count += 1
			
			
def load_txt(fileName, cursor):
	f = open(fileName)
	count = 0
	for line in f:
		if not line.strip() == "END":
			val 		= line.strip().split(',')
			if count > 0:
				id			= int(val[0])
				scene 		= val[1]
				date 		= val[18]
				cloud		= val[22]
				
				center_lat	= float(val[38])
				center_lon	= float(val[39])
			
				nwc_lat		= float(val[40])
				nwc_lon		= float(val[41])
			
				nec_lat		= float(val[42])
				nec_lon		= float(val[43])
			
				sec_lat		= float(val[44])
				sec_lon		= float(val[45])
			
				swc_lat		= float(val[46])
				swc_lon		= float(val[47])
			
				#print id, scene, date, center_lat, center_lon, nwc_lat, nwc_lon, nec_lat, nec_lon, sec_lat, sec_lon, swc_lat, swc_lon     

				p1 	= "%f %f" % (float(nwc_lat), float(nwc_lon) )
				p2	= "%f %f" %(float(nec_lat),float(nec_lon) )
				p3	= "%f %f" %(float(sec_lat), float(sec_lon) )
				p4	= "%f %f" % (float(swc_lat), float(swc_lon))
			
				geometry = "Polygon(( %s, %s, %s, %s, %s))" % (p1,p2,p3,p4,p1)
				#print geometry
				cmd = "INSERT INTO l8 VALUES(%d, '%s', '%s', %f, %f, ST_GeomFromText('%s',4326))" % (id, scene, date, center_lat, center_lon, geometry )
				print cmd
				
				#cursor.execute(cmd)
			count = count+1
		else:
			count = count+1			
			break
			
# load_l8.py -i LANDSAT_8_32475.txt
if __name__ == '__main__':

	parser = argparse.ArgumentParser(description='Load L8 CSV')
	apg_input = parser.add_argument_group('Input')
	apg_input.add_argument("-f", "--force", 	action='store_true', help="Forces new product to be generated")
	apg_input.add_argument("-v", "--verbose", 	action='store_true', help="Verbose on/off")
	apg_input.add_argument("-i", "--input", 	help="csv file")
	
	options 	= parser.parse_args()
	force		= options.force
	verbose		= options.verbose
	baseName 	= options.input
	
	fullName	= os.path.join(config.CSV_DIR,baseName)
	
	# check if file exists
	if not os.path.isfile(fullName):
		print "Cannot find ", fullName
		sys.exit(-1)
		
	DATABASE_URL 	= os.environ["DATABASE_URL"]
	assert( DATABASE_URL)
	url 			= urlparse(DATABASE_URL)
	dbhost			= url.hostname
	dbport			= url.port
	dbname			= url.path[1:]
	user			= url.username
	password		= url.password
			
	str= "host=%s dbname=%s port=%s user=%s password=%s"% (dbhost,dbname,dbport,user,password)
	
	connection 	= psycopg2.connect(str)
	cursor 		= connection.cursor()
	
	# empty the table
	cmd = "TRUNCATE TABLE l8 "
	print cmd
	cursor.execute(cmd)
	
	if fullName.find('.csv'):
		load_csv(fullName, cursor)
	else:
		if fullName.find('.txt'):
			load_txt(fullName, cursor)
		else:
			print "Invalid file extension"
			sys.exit(-1)

	print "Commit and Close..."
	connection.commit()
	cursor.close()
	connection.close()