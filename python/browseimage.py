#!/usr/bin/env python
#
# Created on 3/18/2014 Pat Cappelaere - Vightel Corporation
#
# Generates a BrowseImage using an OSM Map Background and superimposing the product
#
import os, inspect
import sys, urllib, httplib
import math
import argparse
from osgeo import gdal
from osgeo import osr
from osgeo import ogr

MAXZOOMLEVEL 		= 32

#	
# Code from gdal2tiles
#
tileSize 			= 256
initialResolution 	= 2 * math.pi * 6378137 / tileSize
# 156543.03392804062 for tileSize 256 pixels
originShift 		= 2 * math.pi * 6378137 / 2.0
# 20037508.342789244

def Resolution(zoom):
	return initialResolution / (2**zoom)
	
def LatLonToMeters( lat, lon ):
	"Converts given lat/lon in WGS84 Datum to XY in Spherical Mercator EPSG:900913"

	mx = lon * originShift / 180.0
	my = math.log( math.tan((90 + lat) * math.pi / 360.0 )) / (math.pi / 180.0)

	my = my * originShift / 180.0
	return mx, my

def MetersToLatLon( mx, my ):
	"Converts XY point from Spherical Mercator EPSG:900913 to lat/lon in WGS84 Datum"

	lon = (mx / originShift) * 180.0
	lat = (my / originShift) * 180.0

	lat = 180 / math.pi * (2 * math.atan(math.exp(lat * math.pi / 180.0)) - math.pi / 2.0)
	return lat, lon

def PixelsToMeters( px, py, zoom):
	"Converts pixel coordinates in given zoom level of pyramid to EPSG:900913"

	res = Resolution(zoom)
	mx = px * res - originShift
	my = py * res - originShift
	return mx, my

def MetersToPixels( mx, my, zoom):
	"Converts EPSG:900913 to pyramid pixel coordinates in given zoom level"

	res = Resolution( zoom )
	px = (mx + originShift) / res
	py = (my + originShift) / res
	return px, py

def ZoomForPixelSize( pixelSize ):
	"Maximal scaledown zoom of the pyramid closest to the pixelSize."

	for i in range(MAXZOOMLEVEL):
		if pixelSize > Resolution(i):
			if i!=0:
				return i-1
			else:
				return 0 # We don't want to scale up
#
# end of gdal2tiles code

def deg2tilenum( lat_deg, lon_deg, zoom):
	lat_rad = math.radians(lat_deg)
	n = 2.0 ** zoom
	xtile = int((lon_deg + 180.0) / 360.0 * n)
	ytile = int((1.0 - math.log(math.tan(lat_rad) + (1 / math.cos(lat_rad))) / math.pi) / 2.0 * n)
	print "deg2tilenum:", lat_deg, lon_deg, zoom, xtile, ytile
	return (xtile, ytile)
	
def tilenum2deg(xtile, ytile, zoom):
	n = 2.0 ** zoom
	lon_deg = xtile / n * 360.0 - 180.0
	lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * ytile / n)))
	lat_deg = math.degrees(lat_rad)
	print "tilenum2deg:", xtile, ytile, zoom, lat_deg, lon_deg
	return (lat_deg, lon_deg)

#
# Various way to generate a background image
#

# Using Mabox
#
def mapbox_image(centerlat, centerlon, z, rasterXSize, rasterYSize, osm_bg_image):
	if verbose:
		print "outputbrowse_image", xorg, yorg, xmax, ymax, rasterXSize, rasterYSize, pres, centerlat, centerlon
	
	#if force or not os.path.isfile(app.osm_bg_image):	
	mapbox_url = str.format("https://api.tiles.mapbox.com/v3/cappelaere.map-1d8e1acq/{0},{1},{2}/{3}x{4}.png32",centerlon, centerlat, z, rasterXSize,rasterYSize)
	if verbose:
		print "wms url:" , mapbox_url
	
	urllib.urlretrieve(mapbox_url, osm_bg_image)
	if verbose:
		print "created:" , osm_bg_image


# Using Mapquest bbox... but does not seem to be accurate
#
def mapquest_image(ullat, ullon, lrlat, lrlon, zoom, width, heigth, osm_bg_image):
	url 		= "http://www.mapquestapi.com/staticmap/v4/getmap?key=Fmjtd%7Cluur2luy25%2C82%3Do5-9a7nq4"
	bestfit		= str.format("&bestfit={0},{1},{2},{3}", ullat, ullon, lrlat, lrlon)
	size		= str.format("&size={0},{1}", width, heigth)
	zoom		= str.format("&zoom={0}", zoom)
	margin		= str.format("&margin=1")
	imagetype 	= str.format("&imagetype=png")
	
	url += bestfit
	url += size
	url += zoom
	url += margin 
	url += imagetype
	
	if verbose:
		print "mapquest url:" , url
		
	urllib.urlretrieve(url, osm_bg_image)

	if verbose:
		print "created:" , osm_bg_image

# Using Mapquest static map center latlon and zoom level
#
def mapquest_center_image(lat, lon, zoom, width, heigth, osm_bg_image):
	url 		= "http://www.mapquestapi.com/staticmap/v4/getmap?key=Fmjtd%7Cluur2luy25%2C82%3Do5-9a7nq4"
	center		= str.format("&center={0},{1}", lat, lon )
	size		= str.format("&size={0},{1}", width, heigth)
	zoom		= str.format("&zoom={0}", zoom)
	margin		= str.format("&margin=0")
	imagetype 	= str.format("&imagetype=png")
	
	url += center
	url += size
	url += zoom
	# url += margin 
	url += imagetype
	
	if verbose:
		print "mapquest url:" , url
		
	urllib.urlretrieve(url, osm_bg_image)

	if verbose:
		print "created:" , osm_bg_image

# Using Google static maps
#	
def google_center_image(lat, lon, zoom, width, heigth, osm_bg_image):
	url 		= "https://maps.googleapis.com/maps/api/staticmap?"
	center		= str.format("&center={0},{1}", lat, lon )
	size		= str.format("&size={0}x{1}", width, heigth)
	zoom		= str.format("&zoom={0}", zoom)
	sensor		= str.format("&sensor=false")
	#margin		= str.format("&margin=0")
	#imagetype 	= str.format("&imagetype=png")
	
	url += center
	url += size
	url += zoom
	url += sensor
	#url += imagetype
	
	if verbose:
		print "google url:" , url
		
	urllib.urlretrieve(url, osm_bg_image)

	if verbose:
		print "created:" , osm_bg_image
		

#	
# Generate the BBOX for that center latlon and zoom level
#
def bbox(lat, lon, zoom, width, height):	
	mx, my 	= LatLonToMeters( lat, lon )
	
	px, py 	= MetersToPixels( mx, my, zoom)

	mx,my = PixelsToMeters( px - width/2, py + height/2, zoom)
	ullat, ullon = MetersToLatLon( mx, my )
	
	mx,my = PixelsToMeters( px + width/2, py - height/2, zoom)
	lrlat, lrlon = MetersToLatLon( mx, my )
		
	return ullon, ullat, lrlon, lrlat
	
	
if __name__ == '__main__':

	parser = argparse.ArgumentParser(description='Generate BrowseImage')
	apg_input = parser.add_argument_group('Input')
	apg_input.add_argument("scene", help="scene id")
	apg_input.add_argument("-f", "--force", action='store_true', help="forces new products to be generated")
	apg_input.add_argument("-v", "--verbose", action='store_true', help="Verbose on/off")

	options 		= parser.parse_args()
	
	scene 			= options.scene
	force			= options.force
	verbose			= options.verbose
 		  
	output_4326_hand	    = os.path.join(scene,"outputfile_4326_hand.tif")
	surface_water_image		= os.path.join(scene,"surface_water.png")
	surface_water_image_tif	= os.path.join(scene,"surface_water.tif")
	osm_bg_image			= os.path.join(scene,"osm_bg_image.png")
	sw_osm_image			= os.path.join(scene,"surface_water_osm.png")

	# Get Background Image 5% size
	indataset 		= gdal.Open( output_4326_hand )	
	geomatrix 		= indataset.GetGeoTransform()
	rasterXSize 	= indataset.RasterXSize
	rasterYSize 	= indataset.RasterYSize

	xorg			= geomatrix[0]
	yorg  			= geomatrix[3]
	pres			= geomatrix[1]
	xmax			= xorg + geomatrix[1]* rasterXSize
	ymax			= yorg - geomatrix[1]* rasterYSize

	centerlon		= (xorg + xmax) / 2
	centerlat		= (yorg + ymax) / 2
	rasterXSize		= int(rasterXSize * 0.05)
	rasterYSize		= int(rasterYSize * 0.05)

	zoom			= 11	# This should probably be computed using ZoomForPixelSize

	mxorg, myorg 	= LatLonToMeters( yorg, xorg )
	mxmax, mymax	= LatLonToMeters( ymax, xmax )
		
	meters			= myorg - mymax
	meters			= mxmax - mxorg
	
	delta			= meters / rasterXSize
	zoom 			= ZoomForPixelSize( delta ) + 1	# just to be sure we fit
	
	if verbose:
		print "Computed Zoomlevel:", zoom
	
	#print "centerlon, centerlat", centerlon, centerlat
	ullon, ullat, lrlon, lrlat = bbox(centerlat, centerlon, zoom, rasterXSize, rasterYSize)
	#sys.exit(-1)
	
	#if force or not os.path.isfile(osm_bg_image):
	#mapquest_image(yorg, xorg, ymax, xmax, zoom, rasterXSize, rasterYSize, osm_bg_image)
	#google_center_image(centerlat, centerlon, zoom, rasterXSize, rasterYSize, osm_bg_image)
	#mapquest_center_image(centerlat, centerlon, zoom, rasterXSize, rasterYSize, osm_bg_image)

	if force or not os.path.isfile(osm_bg_image):
		mapbox_image(centerlat, centerlon, zoom, rasterXSize, rasterYSize, osm_bg_image)
   
	# surface water browse image
	#if force or not os.path.isfile(app.outputbrowse_image):	
	#cmd = "gdal_translate -q -of PNG -outsize 5% 5% " + output_4326_hand + " " + surface_water_image
	#if verbose:
	#	print(cmd)
	#os.system(cmd)

	if force or not os.path.isfile(surface_water_image):	
		cmd = str.format("gdal_translate -q -of PNG -projwin {0} {1} {2} {3} -outsize {4} {5} {6} {7}",
			ullon, ullat,lrlon,lrlat, rasterXSize, rasterYSize, output_4326_hand, surface_water_image)
		if verbose:
			print(cmd)
		os.system(cmd)
	
	# superimpose the suface water over map background
	if force or not os.path.isfile(sw_osm_image):	
		cmd = str.format("composite -gravity center {0} {1} {2}", surface_water_image, osm_bg_image, sw_osm_image)
		if verbose:
			print cmd
		os.system(cmd)