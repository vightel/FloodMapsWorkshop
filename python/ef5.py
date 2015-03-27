import time
import datetime
import glob,os, fnmatch, urllib, math
from osgeo import gdal
import numpy
import argparse
import config
import json

force 		= 0
verbose 	= 0

BASE_DIR 	= config.EF5_DIR

def execute( cmd ):
	if verbose:
		print cmd
	os.system(cmd)
	
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
	
		cmd = str.format("topojson -o {0} --simplify-proportion 0.5 -p height={1} -- height={2}", fileName+".topojson", l, fileName+".geojson" ); 
		execute(cmd)
	
		# convert it back to json
		cmd = "topojson-geojson --precision 4 -o %s %s" % ( geojsonDir, fileName+".topojson" )
		execute(cmd)
	
		# rename file
		output_file = "height_level_%d.geojson" % l
		cmd = "mv %s %s" % (os.path.join(geojsonDir,"height.json"), os.path.join(geojsonDir, output_file))
		execute(cmd)

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
		
	deltaX				= xmax - xorg
	deltaY				= ymax - yorg
	
	driver 				= gdal.GetDriverByName( "GTiff" )

	if force or not os.path.isfile(browse_filename):	
		dst_ds_dataset		= driver.Create( browse_filename, src_ds.RasterXSize, src_ds.RasterYSize, 2, gdal.GDT_Byte, [ 'COMPRESS=DEFLATE', 'ALPHA=YES' ] )
		dst_ds_dataset.SetGeoTransform( geotransform )
		dst_ds_dataset.SetProjection( projection )

		data[data <= 0]								= 0
		data[numpy.logical_and(data>0, data<=1)]	= 1
		data[numpy.logical_and(data>1, data<=2)]	= 2
		data[numpy.logical_and(data>2 ,data<=3)]	= 3
		data[numpy.logical_and(data>3, data<=5)]	= 5
		data[numpy.logical_and(data>5, data<=8)]	= 8
		data[numpy.logical_and(data>8, data<=13)]	= 13
		data[data>13]								= 21
	
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
	
		ct.SetColorEntry( 0, (0, 0, 0, 0) )
		ct.SetColorEntry( 1, (254, 229, 217, 255) )
		ct.SetColorEntry( 2, (252, 187, 161, 255) )
		ct.SetColorEntry( 3, (252, 146, 114, 255) )
		ct.SetColorEntry( 5, (251, 106, 74, 255) )
		ct.SetColorEntry( 8, (239, 59, 44, 255) )
		ct.SetColorEntry( 13, (203, 24, 29, 255) )
		ct.SetColorEntry( 21, (153, 0, 13, 255) )
	
		o_band.SetRasterColorTable(ct)
		band.SetNoDataValue(0)
		
		dst_ds_dataset 	= None
		print "Created Browse Image:", browse_filename
	
	# subset it
	minX = xorg + deltaX/4
	maxX = xmax - deltaX/4
	minY = ymax - deltaY/2
	maxY = yorg

	# 
	centerlon		= (minX + maxX)/2
	centerlat		= (minY + maxY)/2
	zoom			= 8
	
	if force or not os.path.isfile(osm_bg_image):	
		mapbox_image(centerlat, centerlon, zoom, src_ds.RasterXSize/8, src_ds.RasterYSize/8, osm_bg_image)

	ullon, ullat, lrlon, lrlat = bbox(centerlat, centerlon, zoom, src_ds.RasterXSize/8, src_ds.RasterYSize/8)
	
	if force or not os.path.isfile(subset_filename):	
		ofStr 				= ' -of GTiff '
		bbStr 				= ' -te %s %s %s %s '%(ullon, lrlat, lrlon, ullat) 
		#resStr 			= ' -tr %s %s '%(pres, pres)
		resStr = ' '
		projectionStr 		= ' -t_srs EPSG:4326 '
		overwriteStr 		= ' -overwrite ' # Overwrite output if it exists
		additionalOptions 	= ' -co COMPRESS=DEFLATE -setci  ' # Additional options
		wh 					= ' -ts %d %d  ' % ( src_ds.RasterXSize/8, src_ds.RasterYSize/8)

		warpOptions 	= ofStr + bbStr + projectionStr + resStr + overwriteStr + additionalOptions + wh
		warpCMD = 'gdalwarp ' + warpOptions + browse_filename + ' ' + subset_filename
		execute(warpCMD)
	
	
	# superimpose the suface water over map background
	#if force or not os.path.isfile(sw_osm_image):	
	if force or not os.path.isfile(sw_osm_image):	
		cmd = str.format("composite -gravity center {0} {1} {2}", subset_filename, osm_bg_image, sw_osm_image)
		execute(cmd)
		
# ===============================
# Main
#
# ef5.py --scene 20100203_1200 -v

if __name__ == '__main__':

	parser = argparse.ArgumentParser(description='Generate EF5 flood map')
	apg_input = parser.add_argument_group('Input')
	apg_input.add_argument("-f", "--force", action='store_true', help="HydroSHEDS forces new water image to be generated")
	apg_input.add_argument("-v", "--verbose", action='store_true', help="Verbose on/off")
	apg_input.add_argument("-s", "--scene", nargs=1, help="scene")
	
	options 	= parser.parse_args()

	scene 		= options.scene[0]
	force		= options.force
	verbose		= options.verbose
	
	print scene, BASE_DIR
	
	inputDir = os.path.join(BASE_DIR, scene) 
	if not os.path.exists(inputDir):            
		print "Cannot find dir", inputDir
		sys.exit(-1)
		
	inputFile 			= os.path.join(inputDir, scene+".tif")
	if not os.path.exists(inputFile):            
		print "Cannot find file", inputFile
		sys.exit(-1)
		
	geojsonDir			= os.path.join(inputDir,"geojson")
	if not os.path.exists(geojsonDir):            
		os.makedirs(geojsonDir)

	levelsDir			= os.path.join(inputDir,"levels")
	if not os.path.exists(levelsDir):            
		os.makedirs(levelsDir)

	merge_filename 		= os.path.join(geojsonDir, "%s_levels.geojson" % scene)
	topojson_filename 	= os.path.join(geojsonDir, "..", "%s_levels.topojson" % scene)
	browse_filename 	= os.path.join(geojsonDir, "..", "browse_%s.tif" % scene)
	subset_filename 	= os.path.join(geojsonDir, "..", "small_browse_%s.tif" % scene)
	osm_bg_image		= os.path.join(geojsonDir, "..", "osm_bg.png")
	sw_osm_image		= os.path.join(geojsonDir, "..", "thn.png")
	
	ds 					= gdal.Open( inputFile )
		
	levels 				= [21, 13, 8, 5, 3, 2, 1]
	
	if not os.path.exists(topojson_filename+".gz"):
		for l in levels:
			fileName 		= os.path.join(levelsDir, scene+"_level_%d.tif"%l)
			CreateLevel(l, geojsonDir, fileName, ds)
	
		jsonDict = dict(type='FeatureCollection', features=[])
	
		for l in reversed(levels):
			fileName 		= os.path.join(geojsonDir, "height_level_%d.geojson"%l)
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

	MakeBrowseImage(ds, browse_filename, subset_filename, osm_bg_image, sw_osm_image)
		
	# we could remove geojsonDir and levelsDir
	#cmd 	= "rm -rf %s %s" %(geojsonDir, levelsDir)
	
	ds = None
	