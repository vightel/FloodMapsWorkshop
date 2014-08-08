#!/usr/bin/env python
#
# Created on 07/11/2014 Pat Cappelaere - Vightel Corporation
#
# Input: Load L8 CSV from USGS into POSTGIS DB
#

import os, inspect, sys
import argparse

import psycopg2
import ppygis
import csv

import config

force 	= 0
verbose	= 0

def load_csv(fileName, cursor):
	with open(fullName, 'rU') as csvfile:
		reader 	= csv.reader(csvfile)
		count 	= 0
		for val in reader:
			if count > 1:
				#print val
				id			= int(val[0])
				scene 		= val[2]
				date 		= val[15]
				cloud		= val[19]
			
				center_lat	= float(val[35])
				center_lon	= float(val[36])
		
				nwc_lat		= float(val[37])
				nwc_lon		= float(val[38])
		
				nec_lat		= float(val[39])
				nec_lon		= float(val[40])
		
				sec_lat		= float(val[41])
				sec_lon		= float(val[42])
		
				swc_lat		= float(val[43])
				swc_lon		= float(val[44])
			
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
		
	dbhost 		= os.environ['DBHOST']
	dbname 		= os.environ['DBNAME']
	dbport 		= os.environ['DBPORT']
	user 		= os.environ['DBOWNER']
	password 	= os.environ['PGPASS']
	
	assert (dbhost),	"Set DBHOST"
	assert (dbname),	"Set DBNAME"
	assert (dbport),	"Set DBPORT"
	assert (user),		"Set DBOWNER"
	assert (password),	"Set PGPASS"
	
	print dbhost, dbname, dbport, user
		
	str= "host=%s dbname=%s port=%s user=%s password=%s"% (dbhost,dbname,dbport,user,password)
	print "connect to", str
	
	connection 	= psycopg2.connect(str)
	cursor 		= connection.cursor()
	
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