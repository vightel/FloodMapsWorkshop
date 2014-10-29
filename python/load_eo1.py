#!/usr/bin/env python
#
# Created on 07/11/2014 Pat Cappelaere - Vightel Corporation
#
# Input: Load EO1 CSV from USGS into POSTGIS DB
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

def readcsv( fullName, cursor):
	print "reading csv", fullName

	with open(fullName, 'rU') as csvfile:
		reader 	= csv.reader(csvfile)
		count 	= 0
		for val in reader:
			if count > 1:
				#print val
				id			= int(val[0])
				scene 		= val[2]
				date 		= val[3]
				cloud		= val[4]
			
				center_lat	= float(val[28])
				center_lon	= float(val[29])
			
				nwc_lat		= float(val[30])
				nwc_lon		= float(val[31])
			
				nec_lat		= float(val[32])
				nec_lon		= float(val[33])
			
				sec_lat		= float(val[34])
				sec_lon		= float(val[35])
			
				swc_lat		= float(val[36])
				swc_lon		= float(val[37])
				
				print id, scene, date, cloud, center_lat, center_lon, nwc_lat, nwc_lon, nec_lat, nec_lon, sec_lat, sec_lon, swc_lat, swc_lon     
				
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
	
def readtxt( fullName, cursor):
	print "reading csv", fullName
	
	f = open(fullName)
	count = 0
	for line in f:
		if not line.strip() == "END":
			val 		= line.strip().split(',')
			if count > 0:
				id			= int(val[0])
				scene 		= val[1]
				date 		= val[6]
				cloud		= val[7]
				
				center_lat	= float(val[31])
				center_lon	= float(val[32])
			
				nwc_lat		= float(val[33])
				nwc_lon		= float(val[34])
			
				nec_lat		= float(val[35])
				nec_lon		= float(val[36])
			
				sec_lat		= float(val[37])
				sec_lon		= float(val[38])
			
				swc_lat		= float(val[39])
				swc_lon		= float(val[40])
			
				#print id, scene, date, center_lat, center_lon, nwc_lat, nwc_lon, nec_lat, nec_lon, sec_lat, sec_lon, swc_lat, swc_lon     

				p1 	= "%f %f" % (float(nwc_lat), float(nwc_lon) )
				p2	= "%f %f" %(float(nec_lat),float(nec_lon) )
				p3	= "%f %f" %(float(sec_lat), float(sec_lon) )
				p4	= "%f %f" % (float(swc_lat), float(swc_lon))
			
				geometry = "Polygon(( %s, %s, %s, %s, %s))" % (p1,p2,p3,p4,p1)
				#print geometry
				#cmd = "INSERT INTO eo1_ali VALUES(%d, '%s', '%s', %f, %f, ST_GeomFromText('%s',4326))" % (id, scene, date, center_lat, center_lon, geometry )
				#print cmd
				
				#cursor.execute(cmd)
			count = count+1
		else:
			count = count+1			
			break
	
if __name__ == '__main__':

	parser = argparse.ArgumentParser(description='Load EO1 CSV')
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
		
	ext = os.path.splitext(fullName)
	print ext[1]
	
	DATABASE_URL 	= os.environ["DATABASE_URL"]
	assert( DATABASE_URL)
	url 			= urlparse(DATABASE_URL)
	dbhost			= url.hostname
	dbport			= url.port
	dbname			= url.path[1:]
	user			= url.username
	password		= url.password
			
	str= "host=%s dbname=%s port=%s user=%s password=%s"% (dbhost,dbname,dbport,user,password)
	print "connect to", str
	
	connection = psycopg2.connect(str)
	cursor = connection.cursor()
	
	if ext[1] == ".csv":
		readcsv(fullName, cursor )
	else:
		readtxt(fullName, cursor )
      
	print "Commit and Close..."
	connection.commit()
	cursor.close()
	connection.close()