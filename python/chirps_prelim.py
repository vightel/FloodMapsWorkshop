#
# Processes CHIRPS 2.0 Preliminary Pentad Data for a specific region
#
# http://chg.geog.ucsb.edu/data/chirps/

import os, inspect, sys, math, urllib
import argparse

from datetime import date
from dateutil.parser import parse
from osgeo import gdal
import numpy
import json
from ftplib import FTP

import config

from browseimage import MakeBrowseImage 
from s3 import CopyToS3
from level import CreateLevel

verbose 	= 0
force 		= 0
ftp_site 	= "chg-ftpout.geog.ucsb.edu"


def execute( cmd ):
	if verbose:
		print cmd
	os.system(cmd)

def get_file(gis_file, mydir, year):
	
	if verbose:
		print("Checking "+ftp_site+"/" + filepath + " for latest file...")
	
	try:
		ftp = FTP(ftp_site)
	
		ftp.login()               					# user anonymous, passwd anonymous@
		ftp.cwd(filepath)
	
	except Exception as e:
		print "FTP login Error", sys.exc_info()[0], e
		print "Exception", e

	print "Trying to download", gis_file
	local_filename = os.path.join(mydir, gis_file)
	if not os.path.exists(local_filename):
		if verbose:
			print "Downloading it...", gis_file
		file = open(local_filename, 'wb')
		try:
			ftp.retrbinary("RETR " + gis_file, file.write)
			file.close()
		except Exception as e:
			print "FTP Error", sys.exc_info()[0], e					
			os.remove(local_filename)
			
			local_filename += ".gz"
			file = open(local_filename, 'wb')
			try:
				ftp.retrbinary("RETR " + gis_file, file.write)
				file.close()
			except Exception as e:
				print "FTP Error", sys.exc_info()[0], e					
				os.remove(local_filename)
				sys.exit(-1)
			
			ftp.close();
			sys.exit(-2)

	ftp.close()
			
def process(mydir, gis_file, regionName, region, subfolder, s3_bucket, s3_folder, ymd ):
	# subset the file for that region
	bbox		= region['bbox']
	subset_file	= os.path.join(mydir, "%s.%s.tif" % (subfolder, ymd))
	
	print "subset_file", subset_file
	
	if force or not os.path.exists(subset_file):
		cmd = "gdalwarp -overwrite -q -te %f %f %f %f %s %s" % (bbox[0], bbox[1], bbox[2], bbox[3], gis_file, subset_file)
		execute(cmd)

	geojsonDir	= os.path.join(mydir,"geojson")
	if not os.path.exists(geojsonDir):            
		os.makedirs(geojsonDir)

	levelsDir	= os.path.join(mydir,"levels")
	if not os.path.exists(levelsDir):            
		os.makedirs(levelsDir)

	merge_filename 		= os.path.join(geojsonDir, "%s.%s.geojson" % (subfolder, ymd))
	topojson_filename 	= os.path.join(geojsonDir, "..", "%s.%s.topojson" % (subfolder, ymd))
	browse_filename 	= os.path.join(geojsonDir, "..", "%s.%s_browse.tif" % (subfolder, ymd))
	subset_filename 	= os.path.join(geojsonDir, "..", "%s.%s_small_browse.tif" % (subfolder, ymd))
	osm_bg_image		= os.path.join(geojsonDir, "..", "osm_bg.png")
	sw_osm_image		= os.path.join(geojsonDir, "..", "%s.%s_thn.jpg" % (subfolder, ymd))

	ds 					= gdal.Open( subset_file )
	band				= ds.GetRasterBand(1)
	data				= band.ReadAsArray(0, 0, ds.RasterXSize, ds.RasterYSize )
	
	if force or not os.path.exists(topojson_filename+".gz"):
		for l in levels:
			fileName 		= os.path.join(levelsDir, ymd+"_level_%d.tif"%l)
			CreateLevel(l, geojsonDir, fileName, ds, data, "precip", force, verbose)
	
		jsonDict = dict(type='FeatureCollection', features=[])
	
		for l in reversed(levels):
			fileName 		= os.path.join(geojsonDir, "precip_level_%d.geojson"%l)
			if os.path.exists(fileName):
				print "merge", fileName
				with open(fileName) as data_file:    
					data = json.load(data_file)
		
				if 'features' in data:
					for f in data['features']:
						jsonDict['features'].append(f)
	

		with open(merge_filename, 'w') as outfile:
		    json.dump(jsonDict, outfile)	

		# Convert to topojson
		cmd 	= "topojson -p -o "+ topojson_filename + " " + merge_filename
		execute(cmd)

		cmd 	= "gzip --keep "+ topojson_filename
		execute(cmd)
		
	if force or not os.path.exists(sw_osm_image):	
		zoom = region['thn_zoom']	
		MakeBrowseImage(ds, browse_filename, subset_filename, osm_bg_image, sw_osm_image, levels, hexColors, force, verbose, zoom)
		
	ds = None
	
	file_list = [ sw_osm_image, topojson_filename, topojson_filename+".gz", subset_file ]
	
	CopyToS3( s3_bucket, s3_folder, file_list, force, verbose )
	
# ===============================
# Main
#
# python chirps_prelim.py --region d03 --date 2015-04-07 -v -f

if __name__ == '__main__':

	aws_access_key 			= os.environ.get('AWS_ACCESSKEYID')
	aws_secret_access_key 	= os.environ.get('AWS_SECRETACCESSKEY')
	assert(aws_access_key)
	assert(aws_secret_access_key)
	
	parser = argparse.ArgumentParser(description='CHIRPS 2.0 Prelim Pentad Precipitation map')
	apg_input = parser.add_argument_group('Input')
	apg_input.add_argument("-f", "--force", action='store_true', help="forces new water image to be generated")
	apg_input.add_argument("-v", "--verbose", action='store_true', help="Verbose on/off")
	apg_input.add_argument("-d", "--date", help="Date 2015-03-20 or today if not defined")
	apg_input.add_argument("-p", "--period", help="monthly|dekad|pentad")

	apg_input.add_argument("-r", "--region", help="Region")

	todaystr	= date.today().strftime("%Y-%m-%d")

	options 	= parser.parse_args()

	dt			= options.date or todaystr
	force		= options.force
	verbose		= options.verbose
	regionName	= options.region
	period		= options.period
	today		= parse(dt)
	year		= today.year
	month		= today.month
	day			= today.day
	doy			= today.strftime('%j')
	pentad		= int(day / 5)				# current pentad is not likely, so try to get previous pentad
	dekad		= int(day/10)				# current pentad is not likely, so try to get previous dekad
	

	BASE_DIR 	= config.CHIRPS_PRELIM_DIR +"_"+period

	# 12 colors per CHIRPS data site
	hexColors = [	"#ffffff", "#F8ECE0", "33FF00", "33CC00", "339900", "33FFFF", "33CCFF", "3399FF", "FFFF33", "FFCC33", "FF3333", "990033"]
	
	if period == 'monthly':
		filepath	= "pub/org/chg/products/CHIRPS-2.0/prelim/global_monthly/tifs"
		levels 		= [600,500,400,300,250,200,150,100,50,25,10,0]
		month		-= 1
		if month == 0:
			month = 12
			year -= 1
			
		ymd 		= "%d.%02d" % (year, month)		
		gis_file	= "chirps-v2.0.%d.%02d.tif"%(year, month)
		
	elif period == 'dekad':
		filepath	= "pub/org/chg/products/CHIRPS-2.0/prelim/global_dekad/tifs"
		levels 		= [350,300,250,200,150,100,75,50,25,10,1,0]
		#dekad 		-= 1
		if dekad == 0:
			month -= 1
			dekad = 3
			
		ymd 		= "%d.%02d.%d" % (year, month, dekad)		
		gis_file	= "chirps-v2.0.%d.%02d.%d.tif"%(year, month, dekad)
		
	elif period == 'pentad':
		filepath	= "pub/org/chg/products/CHIRPS-2.0/prelim/global_pentad/tifs"
		levels 		= [60,50,40,35,30,25,20,15,10,5,1,0]
		
		pentad -= 1
		if pentad == 0:
			month -= 1
			pentad = 6
			
		ymd 		= "%d.%02d.%d" % (year, month, pentad)		
		gis_file	= "chirps-v2.0.%d.%02d.%d.tif"%(year, month, pentad)

	else:
		print "invalid period"
		sys.exit(-1)
		
	region		= config.regions[regionName]
	assert(region)
	
	subfolder	= "chirps_prelim"+"_"+period
	
	s3_folder	= os.path.join(subfolder, str(year), doy)
	s3_bucket	= region['bucket']
	

	mydir	= os.path.join(BASE_DIR, str(year))
	if not os.path.exists(mydir):
	    os.makedirs(mydir)
	
	if force or not os.path.exists(os.path.join(mydir, gis_file)):
		get_file(gis_file, mydir, year)

		gis_file 	= os.path.join(mydir,gis_file)
		mydir		= os.path.join(BASE_DIR, str(year), doy, regionName)
		if not os.path.exists(mydir):
			os.makedirs(mydir)
	
		process(mydir, gis_file, regionName, region, subfolder, s3_bucket, s3_folder, ymd)
