#
# Processes Snow Water Equivalent from EF5 http://flash.ou.edu/pakistan/
# 0-300 mm
#

import os, inspect, sys, math, urllib
import argparse

from datetime import date
from dateutil.parser import parse
from osgeo import gdal
import numpy
import json

from boto.s3.connection import S3Connection
from boto.s3.key import Key

import config

verbose = 0
force 	= 0

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
	
def mapbox_image(centerlat, centerlon, z, rasterXSize, rasterYSize, osm_bg_image):
	
	#if force or not os.path.isfile(app.osm_bg_image):	
	mapbox_url = str.format("https://api.tiles.mapbox.com/v3/cappelaere.map-1d8e1acq/{0},{1},{2}/{3}x{4}.png32",centerlon, centerlat, z, rasterXSize,rasterYSize)
	if verbose:
		print "wms url:" , mapbox_url
	
	urllib.urlretrieve(mapbox_url, osm_bg_image)
	if verbose:
		print "created:" , osm_bg_image
		
def	MakeBrowseImage(src_ds, browse_filename, subset_filename, osm_bg_image, sw_osm_image):
	projection  		= src_ds.GetProjection()
	geotransform		= src_ds.GetGeoTransform()
	band				= src_ds.GetRasterBand(1)
	data				= band.ReadAsArray(0, 0, src_ds.RasterXSize, src_ds.RasterYSize )
	
	xorg				= geotransform[0]
	yorg  				= geotransform[3]
	pres				= geotransform[1]
	xmax				= xorg + geotransform[1]* src_ds.RasterXSize
	ymax				= yorg - geotransform[1]* src_ds.RasterYSize
	
	if verbose:
		print "original coords", xorg, xmax, yorg, ymax
		
	deltaX				= xmax - xorg
	deltaY				= ymax - yorg
	
	driver 				= gdal.GetDriverByName( "GTiff" )
	
	levels 				= [340, 210, 130, 80, 50, 30, 20, 10]

	if force or not os.path.isfile(browse_filename):	
		dst_ds_dataset		= driver.Create( browse_filename, src_ds.RasterXSize, src_ds.RasterYSize, 2, gdal.GDT_Byte, [ 'COMPRESS=DEFLATE', 'ALPHA=YES' ] )
		dst_ds_dataset.SetGeoTransform( geotransform )
		dst_ds_dataset.SetProjection( projection )

		data[data <= 0]									= 0
		data[numpy.logical_and(data>0, data<=10)]		= 1
		data[numpy.logical_and(data>10, data<=20)]		= 2
		data[numpy.logical_and(data>20 ,data<=30)]		= 3
		data[numpy.logical_and(data>30, data<=50)]		= 5
		data[numpy.logical_and(data>50, data<=80)]		= 8
		data[numpy.logical_and(data>80, data<=130)]		= 13
		data[numpy.logical_and(data>130, data<=210)]	= 21
		data[numpy.logical_and(data>210, data<=340)]	= 34
		data[data>340]									= 55
	
		dst_ds_dataset.SetGeoTransform( geotransform )
			
		dst_ds_dataset.SetProjection( projection )
		
		o_band		 		= dst_ds_dataset.GetRasterBand(1)
		o_band.WriteArray(data.astype('i1'), 0, 0)

		a_band		 		= dst_ds_dataset.GetRasterBand(2)
		data[data > 0]		= 255
		data[data < 0]		= 0
	
		a_band.WriteArray(data.astype('i1'), 0, 0)
		
		ct = gdal.ColorTable()
		ct = gdal.ColorTable()
		for i in range(256):
			ct.SetColorEntry( i, (0, 0, 0, 0) )
	
		# From http://colorbrewer2.org/
		ct.SetColorEntry( 0, (0, 0, 0, 0) )
		ct.SetColorEntry( 1, (247, 252, 240, 255) )	#f7fcf0
		ct.SetColorEntry( 2, (224, 243, 219, 255) )	#e0f3db
		ct.SetColorEntry( 3, (204, 235, 197, 255) )	#ccebc5
		ct.SetColorEntry( 5, (168, 221, 181, 255) )	#a8ddb5
		ct.SetColorEntry( 8, (123, 204, 196, 255) )	#7bccc4
		ct.SetColorEntry( 13, (78, 179, 211, 255) )	#4eb3d3
		ct.SetColorEntry( 21, (43, 140, 190, 255) ) #2b8cbe
		ct.SetColorEntry( 34, (8, 104, 172, 255) )	#0868ac
		ct.SetColorEntry( 55, (8, 64, 129, 255) )	#084081
	
		o_band.SetRasterColorTable(ct)
		band.SetNoDataValue(0)
		
		dst_ds_dataset 	= None
		print "Created Browse Image:", browse_filename

	
	# 
	centerlon		= (xorg + xmax)/2
	centerlat		= (yorg + ymax)/2
	zoom			= 4
	
	if verbose:
		print "center target", centerlon, centerlat, zoom
		
	# raster is too small so double the size
	rasterXSize = src_ds.RasterXSize*2
	rasterYSize = src_ds.RasterYSize*2
	
	if force or not os.path.isfile(osm_bg_image):	
		mapbox_image(centerlat, centerlon, zoom, rasterXSize, rasterYSize, osm_bg_image)

	ullon, ullat, lrlon, lrlat = bbox(centerlat, centerlon, zoom, rasterXSize, rasterYSize)
	if verbose:
		print "bbox coords", ullon, ullat, lrlon, lrlat
		
	if force or not os.path.isfile(subset_filename):	
		ofStr 				= ' -of GTiff '
		bbStr 				= ' -te %s %s %s %s '%(ullon, lrlat, lrlon, ullat) 
		#resStr 			= ' -tr %s %s '%(pres, pres)
		resStr = ' '
		projectionStr 		= ' -t_srs EPSG:4326 '
		overwriteStr 		= ' -overwrite ' # Overwrite output if it exists
		additionalOptions 	= ' -co COMPRESS=DEFLATE -setci  ' # Additional options
		wh 					= ' -ts %d %d  ' % ( rasterXSize, rasterYSize )

		warpOptions 	= ofStr + bbStr + projectionStr + resStr + overwriteStr + additionalOptions + wh
		warpCMD = 'gdalwarp ' + warpOptions + browse_filename + ' ' + subset_filename
		execute(warpCMD)
	
	
	# superimpose the suface water over map background
	#if force or not os.path.isfile(sw_osm_image):	
	if force or not os.path.isfile(sw_osm_image):	
		cmd = str.format("composite -gravity center {0} {1} {2}", subset_filename, osm_bg_image, sw_osm_image)
		execute(cmd)
		
def execute( cmd ):
	if verbose:
		print cmd
	os.system(cmd)
	
def CopyToS3( s3_folder, file_list ):
	aws_access_key 			= os.environ.get('AWS_ACCESSKEYID')
	aws_secret_access_key 	= os.environ.get('AWS_SECRETACCESSKEY')
	
	conn 		= S3Connection(aws_access_key, aws_secret_access_key)
	
	mybucket 	= conn.get_bucket(config.BUCKET)
	k 			= Key(mybucket)

	for f in file_list:
		fname	= os.path.basename(f)
		k.key 	= os.path.join(s3_folder, fname)
	
		# Check if it already exists
		possible_key = mybucket.get_key(k.key)
	
		if force or not possible_key:
			if verbose:
				print "storing to s3:", mybucket, k.key
	
			k.set_contents_from_filename(f)
			mybucket.set_acl('public-read', k.key )
			

def CreateLevel(l, geojsonDir, fileName, src_ds):
	projection  		= src_ds.GetProjection()
	geotransform		= src_ds.GetGeoTransform()
	band				= src_ds.GetRasterBand(1)
	data				= band.ReadAsArray(0, 0, src_ds.RasterXSize, src_ds.RasterYSize )

	xorg				= geotransform[0]
	yorg  				= geotransform[3]
	pres				= geotransform[1]
	xmax				= xorg + geotransform[1]* src_ds.RasterXSize
	ymax				= yorg - geotransform[1]* src_ds.RasterYSize


	if os.path.exists(fileName):
		return
		
	driver 				= gdal.GetDriverByName( "GTiff" )

	dst_ds_dataset		= driver.Create( fileName, src_ds.RasterXSize, src_ds.RasterYSize, 1, gdal.GDT_Byte, [ 'COMPRESS=DEFLATE' ] )
	dst_ds_dataset.SetGeoTransform( geotransform )
	dst_ds_dataset.SetProjection( projection )
	
	data[data>=l] 	= 255
	data[data<l]	= 0

	count = (data >= l).sum()
	print "level", l, " count:", count
	
	if count > 0 :
		o_band		 		= dst_ds_dataset.GetRasterBand(1)

		dst_ds_dataset.SetGeoTransform( geotransform )
			
		dst_ds_dataset.SetProjection( projection )
		
		o_band.WriteArray(data.astype('i1'), 0, 0)
		
		ct = gdal.ColorTable()
		ct.SetColorEntry( 0, (255, 255, 255, 255) )
		ct.SetColorEntry( 255, (255, 0, 0, 255) )
		o_band.SetRasterColorTable(ct)
		
		dst_ds_dataset 	= None
		print "Created", fileName

		cmd = "gdal_translate -q -of PNM " + fileName + " "+fileName+".pgm"
		execute(cmd)

		# -i  		invert before processing
		# -t 2  	suppress speckles of up to this many pixels. 
		# -a 1.5  	set the corner threshold parameter
		# -z black  specify how to resolve ambiguities in path decomposition. Must be one of black, white, right, left, minority, majority, or random. Default is minority
		# -x 		scaling factor
		# -L		left margin
		# -B		bottom margin

		cmd = str.format("potrace -i -z black -a 1.5 -t 3 -b geojson -o {0} {1} -x {2} -L {3} -B {4} ", fileName+".geojson", fileName+".pgm", pres, xorg, ymax ); 
		execute(cmd)

		#cmd = str.format("node set_geojson_property.js --file {0} --prop frost={1}", fileName+".geojson", frost)
		#execute(cmd)
	
		cmd = str.format("topojson -o {0} --simplify-proportion 0.5 -p swe={1} -- swe={2}", fileName+".topojson", l, fileName+".geojson" ); 
		execute(cmd)
	
		# convert it back to json
		cmd = "topojson-geojson --precision 4 -o %s %s" % ( geojsonDir, fileName+".topojson" )
		execute(cmd)
	
		# rename file
		output_file = "swe_level_%d.geojson" % l
		cmd = "mv %s %s" % (os.path.join(geojsonDir,"swe.json"), os.path.join(geojsonDir, output_file))
		execute(cmd)

def process(swe_dir, scene, s3_folder):
	fullName = os.path.join(swe_dir, scene+".tif")
	if not os.path.exists(fullName):
		print "File does not exist", fullName
		sys.exit(-1)
	
	if verbose:
		print "Processing", fullName
		
	geojsonDir	= os.path.join(swe_dir,"geojson")
	if not os.path.exists(geojsonDir):            
		os.makedirs(geojsonDir)

	levelsDir	= os.path.join(swe_dir,"levels")
	if not os.path.exists(levelsDir):            
		os.makedirs(levelsDir)

	merge_filename 		= os.path.join(geojsonDir, "%s_levels.geojson" % scene)
	topojson_filename 	= os.path.join(geojsonDir, "..", "%s_levels.topojson" % scene)
	browse_filename 	= os.path.join(geojsonDir, "..", "%s_browse.tif" % scene)
	subset_filename 	= os.path.join(geojsonDir, "..", "%s_small_browse.tif" % scene)
	osm_bg_image		= os.path.join(geojsonDir, "..", "osm_bg.png")
	sw_osm_image		= os.path.join(geojsonDir, "..", "%s_thn.jpg" % scene)


	levels 				= [340, 210, 130, 80, 50, 30, 20, 10]
	ds 					= gdal.Open( fullName )
	
	if force or not os.path.exists(topojson_filename+".gz"):
		for l in levels:
			fileName 		= os.path.join(levelsDir, scene+"_level_%d.tif"%l)
			CreateLevel(l, geojsonDir, fileName, ds)
	
		jsonDict = dict(type='FeatureCollection', features=[])
	
		for l in reversed(levels):
			fileName 		= os.path.join(geojsonDir, "swe_level_%d.geojson"%l)
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
		MakeBrowseImage(ds, browse_filename, subset_filename, osm_bg_image, sw_osm_image)
		
	ds = None
	
	file_list = [ sw_osm_image, topojson_filename, topojson_filename+".gz", fullName ]
	
	CopyToS3( s3_folder, file_list )
	
# Main
#  maxswe.py --date 2015-03-20 -v -f

if __name__ == '__main__':
	parser 		= argparse.ArgumentParser(description='EF5 SWE Processing')
	apg_input 	= parser.add_argument_group('Input')
	
	apg_input.add_argument("-f", "--force", action='store_true', help="forces new product to be generated")
	apg_input.add_argument("-v", "--verbose", action='store_true', help="Verbose Flag")
	apg_input.add_argument("-d", "--date", help="Date 2015-03-20 or today if not defined")
	
	todaystr	= date.today().strftime("%Y-%m-%d")

	options 	= parser.parse_args()

	dt			= options.date or todaystr
	force		= options.force
	verbose		= options.verbose

	today		= parse(dt)
	year		= today.year
	month		= today.month
	day			= today.day
	doy			= today.strftime('%j')
	
	print 	config.MAXSWE_DIR,year,doy
	
	swe_dir		= os.path.join(config.MAXSWE_DIR,str(year),doy)
	
	
	fileName	= "maxswe.%d%02d%02d.120000" % (year,month,day)
	s3_folder	= os.path.join("maxswe", str(year), doy)
	process(swe_dir, fileName, s3_folder)
