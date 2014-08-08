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
import config

BASE_DIR     		= config.MODIS_DIR;
MAXZOOMLEVEL 		= 32

#	
# Code from gdal2tiles
#
tileSize 			= 256
initialResolution 	= 2 * math.pi * 6378137 / tileSize
# 156543.03392804062 for tileSize 256 pixels
originShift 		= 2 * math.pi * 6378137 / 2.0
# 20037508.342789244

verbose = 0

def execute( cmd ):
	if verbose:
		print cmd
	os.system(cmd)

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
	
	
def process(infile, coastlines, outfile):
	ds = gdal.Open( infile )
		
	# Surface Water
	band = ds.GetRasterBand(1)
	data = band.ReadAsArray(0, 0, ds.RasterXSize, ds.RasterYSize )
	data = (data >= 2)*255
	
	coastlines_ds	= gdal.Open(coastlines)
	coastal_band 	= coastlines_ds.GetRasterBand(1)
	#coastal_data 	= coastal_band.ReadAsArray(0, 0, coastlines_ds.RasterXSize, coastlines_ds.RasterYSize )
	coastal_data 	= coastal_band.ReadAsArray(0, 0, ds.RasterXSize, ds.RasterYSize )
	
	# Coastal Masking
	mask = coastal_data>0
	data[mask]= 0
	
	# Step 1
	# extract surface water from MWP product
	#
	driver 		= gdal.GetDriverByName( "GTIFF" )
	dst_ds 		= driver.Create( outfile, ds.RasterXSize, ds.RasterYSize, 4, gdal.GDT_Byte, [ 'INTERLEAVE=PIXEL', 'COMPRESS=DEFLATE' ] )

	#ct = gdal.ColorTable()
	#for i in range(256):
	#	ct.SetColorEntry( i, (255, 255, 255, 255) )
			
	#ct.SetColorEntry( 0, (0, 0, 0, 0) )
	#ct.SetColorEntry( 1, (255, 0, 0, 0) )
	#ct.SetColorEntry( 2, (255, 0, 0, 0) )
	#ct.SetColorEntry( 3, (255, 0, 0, 255) )
		
	band = dst_ds.GetRasterBand(1)
	#band.SetRasterColorTable(ct)
	band.WriteArray(data, 0, 0)
	band.SetNoDataValue(0)

	alphaband = dst_ds.GetRasterBand(4)
	alphaband.WriteArray(data, 0, 0)

	geotransform = ds.GetGeoTransform()
	projection   = ds.GetProjection()
	
	dst_ds.SetGeoTransform( geotransform )
	dst_ds.SetProjection( projection )

	dst_ds 			= None
	ds 				= None
	coastlines_ds	= None
	
#	
# Generates a browseimage
# browseimage.py -y 2013 -d 205 -t 020E010S -p 2 -v


if __name__ == '__main__':

	parser = argparse.ArgumentParser(description='Generate BrowseImage')
	apg_input = parser.add_argument_group('Input')
	apg_input.add_argument("-f", "--force", action='store_true', help="HydroSHEDS forces new water image to be generated")
	apg_input.add_argument("-v", "--verbose", action='store_true', help="Verbose on/off")
	apg_input.add_argument("-y", "--year", nargs=1, help="Year")
	apg_input.add_argument("-d", "--day", nargs=1, help="Julian Day")
	apg_input.add_argument("-p", "--product", nargs=1, help="Product Day")
	
	apg_input.add_argument("-t", "--tile", nargs=1, help="Tile")

	options 		= parser.parse_args()
	tile			= options.tile[0]
	year 			= options.year[0]
	day 			= options.day[0]
 	product 		= options.product[0]
	
	force			= options.force
	verbose			= options.verbose
 		  
	fname 			= str.format("MWP_{0}{1}_{2}_{3}D{3}OT.tif", year, day, tile, product)
	tifFile		    = os.path.join(BASE_DIR,year, day, fname)
	
	#surface_water_image		= os.path.join(inpath,"surface_water.png")
	#surface_water_image_tif	= os.path.join(inpath,"surface_water.tif")
	
	osm_bg_image	= os.path.join(BASE_DIR, year, day, str.format("OSM_{0}{1}_{2}.tif",year,day,tile))
	sw_osm_image	= os.path.join(BASE_DIR, year, day, str.format("OSM_SWP_{0}{1}_{2}.png",year,day,tile))
	MWP				= os.path.join(BASE_DIR, year, day, str.format("MWP_{0}{1}_{2}_{3}D{3}OT.tif", year, day, tile, product))
	SWP				= os.path.join(BASE_DIR, year, day, str.format("SWP_{0}{1}_{2}_{3}D{3}OT.tif", year, day, tile, product))
	SWP_RGB			= os.path.join(BASE_DIR, year, day, str.format("SWP_RGB_{0}{1}_{2}_{3}D{3}OT.tif", year, day, tile, product))
	SWPthn			= os.path.join(BASE_DIR, year, day, str.format("SWP_{0}{1}_{2}_{3}D{3}OT_thn.tif", year, day, tile, product))	
	coastlines		= os.path.join(BASE_DIR,  str.format("{0}_osm_coastal.tif", tile))	
	
	# Get Background Image 5% size
	indataset 		= gdal.Open( tifFile )	
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
	
	#rasterXSize		= int(rasterXSize * 0.05)
	#rasterYSize		= int(rasterYSize * 0.05)

	rasterXSize		= 910
	rasterYSize		= 910
	
	process( MWP, coastlines, SWP_RGB)
	
	zoom			= 11	# This should probably be computed using ZoomForPixelSize

	mxorg, myorg 	= LatLonToMeters( yorg, xorg )
	mxmax, mymax	= LatLonToMeters( ymax, xmax )
		
	meters			= myorg - mymax
	meters			= mxmax - mxorg
	
	delta			= meters / rasterXSize
	zoom 			= ZoomForPixelSize( delta )	+ 1# just to be sure we fit
	
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

	if force or not os.path.isfile(SWPthn):	
		cmd = str.format("gdal_translate -q -of PNG -projwin {0} {1} {2} {3} -outsize {4} {5} {6} {7}",
			ullon, ullat,lrlon,lrlat, rasterXSize, rasterYSize, SWP_RGB, SWPthn)
		execute(cmd)
	
	# superimpose the suface water over map background
	if force or not os.path.isfile(sw_osm_image):	
		cmd = str.format("composite -gravity center {0} {1} {2}", SWPthn, osm_bg_image, sw_osm_image)
		
		execute(cmd)

	cmd = "rm " + SWP_RGB
	execute(cmd)
	cmd = "rm " + SWPthn +".aux.xml"
	execute(cmd)
	cmd = "rm " + osm_bg_image
	execute(cmd)
	cmd = "rm " + SWPthn
	execute(cmd)

	