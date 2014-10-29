#!/usr/bin/env python
# 
# From Eric Kabuchanga, kabuchanga@rcmrd.org
# RCMRD Nairobi, Kenya
#
# Here is the link where you can get the original hdfs and the resulting tif files 
# http://41.206.34.124/frostmaps/ 
#
# We do not have arcpy so we will do this manually (Pat Cappelaere)
#
import time
import datetime
import glob,os, fnmatch
from osgeo import gdal
import numpy
import config

one_day 	= datetime.timedelta(days=1)
#_today 	= datetime.date.today()- one_day

# PGC Debug
_today 		= datetime.date(2014,10,2)

_month 		= _today.month
_day 		= _today.day
_year 		= str(_today.year)
_yrDay 		= str(_today.timetuple()[7])

if len(_yrDay)==1:
	_yrDay = "00" + _yrDay
elif len(_yrDay)==2:
	_yrDay = "0" + _yrDay
else:
	_yrDay=_yrDay

BASE_DIR = config.FROST_DIR

srcPath = os.path.join(BASE_DIR, _year)
if not os.path.exists(srcPath):            
	os.makedirs(srcPath)

outPtDir = os.path.join(srcPath, _yrDay, 'output') 
if not os.path.exists(outPtDir):            
	os.makedirs(outPtDir)

subsetDir = os.path.join(srcPath, _yrDay, 'subset') 
if not os.path.exists(subsetDir):            
	os.makedirs(subsetDir)
	
#
minX = 24.0
maxX = 50.0
minY = -12.0
maxY = 15.0

# Kenya
minX = 34.0
maxX = 43.0
minY = -4.0
maxY = 5.0

pixSizeX = 1.0 / 111.32
pixSizeY = pixSizeX


# Create gdalwarp command
ofStr 			= ' -of GTiff '
bbStr 			= ' -te %s %s %s %s '%(minX, minY, maxX, maxY) 
resStr 			= ' -tr %s %s '%(pixSizeX, pixSizeY)
projectionStr 	= ' -t_srs EPSG:4326 '
overwriteStr 	= ' -overwrite ' # Overwrite output if it exists
additionalOptions = ' -co COMPRESS=DEFLATE ' # Additional options
warpOptions 	= ofStr + bbStr + resStr + projectionStr + overwriteStr + additionalOptions

frostFiles 		= []
verbose			= 1

def execute( cmd ):
	if verbose:
		print cmd
	os.system(cmd)
		
def RemoveEmptyFrostFiles():
	try:
    
		dirList=os.listdir(outPtDir)
	
		for fname in dirList:
			if fnmatch.fnmatch(fname, '*.tif'):
				fullName 	= os.path.join(outPtDir,fname)
				ds 			= gdal.Open( fullName )
				stats	 	= ds.GetRasterBand(1).GetStatistics(0,1)
				#print fullName, stats
				
				if stats[1] > 0:
					print "Non Null OutputFile:", fullName, stats
					frostFiles.append(fullName)
					
				ds 			= None
				
	except IOError as e:
		print "I/O error({0}): {1}".format(e.errno, e.strerror)
	

def SubsetOutputFiles():
	try:
    	
		for fname in frostFiles:
			print fname
			subsetFileName = fname.replace('output', 'subset')
			cmd 	= "gdalwarp "
			warpCMD = 'gdalwarp ' + warpOptions + fname + ' ' + subsetFileName
			print warpCMD
			err 	= os.system(warpCMD)
			
	except IOError as e:
		print "I/O error({0}): {1}".format(e.errno, e.strerror)

def ComposeSubsets():
	try:
    
		dirList		= os.listdir(subsetDir)
		composite 	= None
		
		for fname in dirList:
			if fnmatch.fnmatch(fname, '*.tif'):
				fullName 		= os.path.join(subsetDir,fname)
				print "reading:", fullName
				ds 				= gdal.Open( fullName )
				band	 		= ds.GetRasterBand(1)
				data			= band.ReadAsArray(0, 0, ds.RasterXSize, ds.RasterYSize )
				invalid 		= (data<1)
				data[invalid] 	= 65535
		
				if composite == None:
					composite = data
				else:
					composite		= numpy.minimum(data, composite)

		projection  		= ds.GetProjection()
		geotransform		= ds.GetGeoTransform()

		mask		= (composite==65535)
		composite 	= composite.astype(float)
		composite 	*= 0.02
		
		# nodata 				0
		# very severe frost 	0-250
		# severe frost 			250-260
		# moderate frost		260-270
		# minor frost			270- 280
		# no frost				> 280
		
		composite[mask]				= 0	# no data
		print numpy.min(composite), numpy.max(composite), numpy.mean(composite)
		
		composite[composite>280]	= 1 # no frost
		composite[composite>270]	= 2 # minor frost
		composite[composite>260]	= 3 # moderate frost
		composite[composite>250]	= 4 # severe frost
		composite[composite>5]		= 5 # very severe frost
		
		compositeFileName	= os.path.join(srcPath, _yrDay, "Frost_"+str(_today)+".tif")
		
		print "Creating:", compositeFileName
		
		driver 				= gdal.GetDriverByName( "GTiff" )
		o_ds 				= driver.Create( compositeFileName, ds.RasterXSize, ds.RasterYSize, 1, gdal.GDT_Byte, [ 'COMPRESS=DEFLATE' ] )
		
		o_band		 		= o_ds.GetRasterBand(1)
		
		ct = gdal.ColorTable()
		ct.SetColorEntry( 0, (255, 255, 255, 255) )
		ct.SetColorEntry( 1, (0, 255, 0, 255) )
		ct.SetColorEntry( 2, (255, 154, 0, 255) )
		ct.SetColorEntry( 3, (255, 0, 0, 255) )
		ct.SetColorEntry( 4, (255, 153, 204, 255) )
		ct.SetColorEntry( 5, (204, 0, 204, 255) )
		o_band.SetRasterColorTable(ct)
		
		o_ds.SetGeoTransform( geotransform )
			
		o_ds.SetProjection( projection )
		
		o_band.WriteArray(composite.astype('i1'), 0, 0)

		o_ds 	= None
		ds 		= None
		
	except IOError as e:
		print "I/O error({0}): {1}".format(e.errno, e.strerror)
			
def SmoothIt():
	compositeFileName	= os.path.join(srcPath, _yrDay, "Frost_"+str(_today)+".tif")
	smoothedFileName	= os.path.join(srcPath, _yrDay, "Smoothed_Frost_"+str(_today)+".tif")
	
	yres 	= pixSizeY/10
	xres 	= pixSizeX/10
	
	cmd 	= "gdalwarp -r cubicspline -tr {0} {1} {2} {3}".format(xres, yres, compositeFileName, smoothedFileName)
	print cmd
	err 	= os.system(cmd)
	
	
def CreateTopojsonFile(fileName, src_ds, projection, geotransform, ct, data, pres, xorg, ymax, frost ):
	
	geojsonDir			= os.path.join(srcPath, _yrDay,"geojson")
	if not os.path.exists(geojsonDir):            
		os.makedirs(geojsonDir)

	driver 				= gdal.GetDriverByName( "GTiff" )
	dst_ds_dataset		= driver.Create( fileName, src_ds.RasterXSize, src_ds.RasterYSize, 1, gdal.GDT_Byte, [ 'COMPRESS=DEFLATE' ] )
	dst_ds_dataset.SetGeoTransform( geotransform )
	dst_ds_dataset.SetProjection( projection )

	o_band				= dst_ds_dataset.GetRasterBand(1)
	
	o_band.SetRasterColorTable(ct)
	o_band.WriteArray(data, 0, 0)

	dst_ds_dataset = None
	print "Created", fileName

	cmd = "gdal_translate -q -of PNM -expand gray " + fileName + " "+fileName+".pgm"
	execute(cmd)

	# -i  		invert before processing
	# -t 2  	suppress speckles of up to this many pixels. 
	# -a 1.5  	set the corner threshold parameter
	# -z black  specify how to resolve ambiguities in path decomposition. Must be one of black, white, right, left, minority, majority, or random. Default is minority
	# -x 		scaling factor
	# -L		left margin
	# -B		bottom margin

	cmd = str.format("potrace -z black -a 1.5 -t 3 -b geojson -o {0} {1} -x {2} -L {3} -B {4} ", fileName+".geojson", fileName+".pgm", pres, xorg, ymax ); 
	execute(cmd)

	#cmd = str.format("node set_geojson_property.js --file {0} --prop frost={1}", fileName+".geojson", frost)
	#execute(cmd)
	
	cmd = str.format("topojson -o {0} --simplify-proportion 0.75 -p frost={1} -- frost={2}", fileName+".topojson", frost, fileName+".geojson" ); 
	execute(cmd)
	
	# convert it back to json
	cmd = "topojson-geojson --precision 4 -o %s %s" % ( geojsonDir, fileName+".topojson" )
	execute(cmd)
	
	# rename file
	output_file = "frost_level_%d.geojson" % frost
	cmd = "mv %s %s" % (os.path.join(geojsonDir,"frost.json"), os.path.join(geojsonDir, output_file))
	execute(cmd)
	
def CreateLevels():
	levelsDir			= os.path.join(srcPath, _yrDay,"levels")
	if not os.path.exists(levelsDir):            
		os.makedirs(levelsDir)

	geojsonDir			= os.path.join(srcPath, _yrDay,"geojson")
	if not os.path.exists(geojsonDir):            
		os.makedirs(geojsonDir)
	
	smoothedFileName	= os.path.join(srcPath, _yrDay, "Smoothed_Frost_"+str(_today)+".tif")
	
	level1FileName		= os.path.join(levelsDir, "Level_1_Frost_"+str(_today)+".tif")
	level2FileName		= os.path.join(levelsDir, "Level_2_Frost_"+str(_today)+".tif")
	level3FileName		= os.path.join(levelsDir, "Level_3_Frost_"+str(_today)+".tif")
	level4FileName		= os.path.join(levelsDir, "Level_4_Frost_"+str(_today)+".tif")
	level5FileName		= os.path.join(levelsDir, "Level_5_Frost_"+str(_today)+".tif")
	
	topojsonFileName	= os.path.join(srcPath, _yrDay, "Smoothed_Frost_"+str(_today)+".topojson")
	
	driver 				= gdal.GetDriverByName( "GTiff" )
	src_ds 				= gdal.Open( smoothedFileName )
	projection  		= src_ds.GetProjection()
	geotransform		= src_ds.GetGeoTransform()
	band				= src_ds.GetRasterBand(1)
	data				= band.ReadAsArray(0, 0, src_ds.RasterXSize, src_ds.RasterYSize )
	
	xorg				= geotransform[0]
	yorg  				= geotransform[3]
	pres				= geotransform[1]
	xmax				= xorg + geotransform[1]* src_ds.RasterXSize
	ymax				= yorg - geotransform[1]* src_ds.RasterYSize
	
	ct = gdal.ColorTable()
	ct.SetColorEntry( 0, (255, 255, 255, 255) )
	ct.SetColorEntry( 1, (0, 0, 0, 255) )
	ct.SetColorEntry( 2, (0, 0, 0, 255) )
	ct.SetColorEntry( 3, (0, 0, 0, 255) )
	ct.SetColorEntry( 4, (0, 0, 0, 255) )
	ct.SetColorEntry( 5, (0, 0, 0, 255) )

	CreateTopojsonFile(level1FileName, src_ds, projection, geotransform, ct, data, pres, xorg, ymax, 1 )
	
	ct.SetColorEntry( 1, (255, 255, 255, 255) )
	CreateTopojsonFile(level2FileName, src_ds, projection, geotransform, ct, data, pres, xorg, ymax, 2 )
	
	ct.SetColorEntry( 2, (255, 255, 255, 255) )
	CreateTopojsonFile(level3FileName, src_ds, projection, geotransform, ct, data, pres, xorg, ymax, 3 )
	
	ct.SetColorEntry( 3, (255, 255, 255, 255) )
	CreateTopojsonFile(level4FileName, src_ds, projection, geotransform, ct, data, pres, xorg, ymax, 4 )
	
	ct.SetColorEntry( 4, (255, 255, 255, 255) )
	CreateTopojsonFile(level5FileName, src_ds, projection, geotransform, ct, data, pres, xorg, ymax, 5 )

	
RemoveEmptyFrostFiles()
SubsetOutputFiles()
ComposeSubsets()
SmoothIt()
CreateLevels()
		
		