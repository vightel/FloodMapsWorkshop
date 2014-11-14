#!/usr/bin/env python
#
# VIIRS Flood Processing from NOAA Data and SanMei Li (George Mason)
#
import time
import datetime
import argparse

import glob,os, fnmatch
from osgeo import gdal
import numpy
import config

force 	= 0
verbose	= 0



class VIIRS_WATER:
	def __init__( self, outpath, scene ):	
		if verbose:
			print "Processing VIIRS", scene
		
		self.outpath			= outpath
		self.infile				= os.path.join(outdir, scene+".tif")	
		self.levelsDir			= os.path.join(outdir, "levels")
		self.geojsonDir			= os.path.join(outdir, "geojson")
		self.water_fractions 	= os.path.join(self.outpath, "water_fractions.tif")
		self.smoothedFileName	= os.path.join(self.outpath, "smoothed_water_fractions.tif")
		self.cloudFileName		= os.path.join(self.outpath, "clouds.tif")
		self.smoothedClouds		= os.path.join(self.outpath, "smoothed_clouds.tif")
			
		if not os.path.exists(self.levelsDir):            
			os.makedirs(self.levelsDir)
	
		if not os.path.exists(self.geojsonDir):            
			os.makedirs(self.geojsonDir)
	
	
	def execute( self, cmd ):
		if verbose:
			print cmd
		os.system(cmd)
		
	def process(self):
		ds 				= gdal.Open( self.infile	 )
		band	 		= ds.GetRasterBand(1)
		data			= band.ReadAsArray(0, 0, ds.RasterXSize, ds.RasterYSize )
		projection  	= ds.GetProjection()
		geotransform	= ds.GetGeoTransform()

		print numpy.min(data), numpy.max(data), numpy.mean(data)

		minX 			= geotransform[0]
		maxY 			= geotransform[3]
		self.pixSizeX 	= geotransform[1]
		self.pixSizeY 	= geotransform[5]

		# In the data, 17 represents clear-sky land, 199 is normal water, and flooding water fractions are from 200 to 300.
		# Cloud: 30, cloud shadow: 150, bareland: 16 ; vegetation land: 17, nodata: 1, snow: 20, ice: 27
		
		# cloud, cloud shadow, nodata mask
		cloud_mask			= (data == 30) 
		cloud_shadow		= (data == 150)
		no_data				= (data == 1)
		
		data[data<200] 		= 0
		
		data[data>290] 		= 3	# red
		data[data>260] 		= 2	# orange
		data[data>200] 		= 1	# yellow
		
		# we need to do that separately as it screws up the smoothing
		#data[cloud_shadow ]	= 4 # no data
		#data[cloud_mask ]		= 4 # no data
		#data[no_data ]			= 4 # no data
		
		if verbose:
			print "Creating:", self.water_fractions, self.pixSizeX, self.pixSizeY
		
		driver 				= gdal.GetDriverByName( "GTiff" )
		o_ds 				= driver.Create( self.water_fractions, ds.RasterXSize, ds.RasterYSize, 1, gdal.GDT_Byte, [ 'COMPRESS=DEFLATE' ] )
		
		o_band		 		= o_ds.GetRasterBand(1)
		
		ct = gdal.ColorTable()
		
		ct.SetColorEntry( 0, (255, 255, 255, 0) )
		ct.SetColorEntry( 1, (254, 232, 200, 255) )
		ct.SetColorEntry( 2, (253, 187, 132, 255) )
		ct.SetColorEntry( 3, (227, 74, 51, 255) )
		ct.SetColorEntry( 4, (240, 240, 240, 255) )
	
		o_band.SetRasterColorTable(ct)
		o_ds.SetGeoTransform( geotransform )
		o_ds.SetProjection( projection )
		o_band.WriteArray(data.astype('i1'), 0, 0)
		o_ds 	= None
		
		if verbose:
			print "Creating:", self.cloudFileName
		
		driver 				= gdal.GetDriverByName( "GTiff" )
		o_ds 				= driver.Create( self.cloudFileName, ds.RasterXSize, ds.RasterYSize, 1, gdal.GDT_Byte, [ 'COMPRESS=DEFLATE' ] )
		o_band		 		= o_ds.GetRasterBand(1)
		
		data[data>0]		= 0
		data[cloud_shadow ]	= 1 # no data
		data[cloud_mask ]	= 1 # no data
		data[no_data ]		= 1 # no data

		o_band.SetRasterColorTable(ct)
		o_ds.SetGeoTransform( geotransform )
		o_ds.SetProjection( projection )
		o_band.WriteArray(data.astype('i1'), 0, 0)
		o_ds 	= None
		
		ds 		= None
		data 	= None
		ds 		= None
		
		
	def smoothIt(self):	
		yres 	= self.pixSizeY/10
		xres 	= self.pixSizeX/10

		cmd 	= "gdalwarp -overwrite -r cubicspline -tr {0} {1} {2} {3}".format(xres, yres, self.water_fractions, self.smoothedFileName)
		self.execute(cmd)

		cmd 	= "gdalwarp -overwrite -r cubicspline -tr {0} {1} {2} {3}".format(xres, yres, self.cloudFileName, self.smoothedClouds)
		self.execute(cmd)
		
	def CreateTopojsonFile(self, fileName, src_ds, projection, geotransform, ct, data, pres, xorg, ymax, water ):
	
		driver 				= gdal.GetDriverByName( "GTiff" )
		dst_ds_dataset		= driver.Create( fileName, src_ds.RasterXSize, src_ds.RasterYSize, 1, gdal.GDT_Byte, [ 'COMPRESS=DEFLATE' ] )
		
		dst_ds_dataset.SetGeoTransform( geotransform )
		dst_ds_dataset.SetProjection( projection )

		o_band				= dst_ds_dataset.GetRasterBand(1)
	
		o_band.SetRasterColorTable(ct)
		o_band.WriteArray(data, 0, 0)

		dst_ds_dataset = None
		print "Created", fileName

		cmd = "gdal_translate -q -of PNM -expand gray " + fileName + " "+fileName+".bmp"
		self.execute(cmd)

		# -i  		invert before processing
		# -t 2  	suppress speckles of up to this many pixels. 
		# -a 1.5  	set the corner threshold parameter
		# -z black  specify how to resolve ambiguities in path decomposition. Must be one of black, white, right, left, minority, majority, or random. Default is minority
		# -x 		scaling factor
		# -L		left margin
		# -B		bottom margin

		cmd = str.format("potrace -i -z black -a 1.5 -t 3 -b geojson -o {0} {1} -x {2} -L {3} -B {4} ", fileName+".geojson", fileName+".bmp", pres, xorg, ymax ); 
		self.execute(cmd)
	
		cmd = str.format("topojson -o {0} --simplify-proportion 0.75 -p water={1} -- water={2}", fileName+".topojson", water, fileName+".geojson" ); 
		self.execute(cmd)
	
		# convert it back to json
		cmd = "topojson-geojson --precision 4 -o %s %s" % ( self.geojsonDir, fileName+".topojson" )
		self.execute(cmd)
	
		# rename file
		output_file = "water_level_%d.geojson" % water
		cmd = "mv %s %s" % (os.path.join(self.geojsonDir,"water.json"), os.path.join(self.geojsonDir, output_file))
		self.execute(cmd)
		
	def createLevels(self):
	
		level1FileName		= os.path.join(self.levelsDir, "Level_1_Water.tif")
		level2FileName		= os.path.join(self.levelsDir, "Level_2_Water.tif")
		level3FileName		= os.path.join(self.levelsDir, "Level_3_Water.tif")
		level4FileName		= os.path.join(self.levelsDir, "Level_4_Water.tif")
		
		driver 				= gdal.GetDriverByName( "GTiff" )
		src_ds 				= gdal.Open( self.smoothedFileName )
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
		ct.SetColorEntry( 0, (0, 0, 0, 255) )
		ct.SetColorEntry( 1, (255, 255, 255, 255) )
		ct.SetColorEntry( 2, (255, 255, 255, 255) )
		ct.SetColorEntry( 3, (255, 255, 255, 255) )
		ct.SetColorEntry( 4, (0, 0, 0, 255) )

		self.CreateTopojsonFile(level1FileName, src_ds, projection, geotransform, ct, data, pres, xorg, ymax, 1 )
	
		ct.SetColorEntry( 1, (0, 0, 0, 255) )
		self.CreateTopojsonFile(level2FileName, src_ds, projection, geotransform, ct, data, pres, xorg, ymax, 2 )
	
		ct.SetColorEntry( 2, (0, 0, 0, 255) )
		self.CreateTopojsonFile(level3FileName, src_ds, projection, geotransform, ct, data, pres, xorg, ymax, 3 )
		
		src_ds 	= None
		data	= None

		# create the topojson for the clouds
		src_ds 				= gdal.Open( self.smoothedClouds )
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
		ct.SetColorEntry( 0, (0, 0, 0, 255) )
		ct.SetColorEntry( 1, (255, 255, 255, 255) )
		ct.SetColorEntry( 2, (0, 0, 0, 255) )
		ct.SetColorEntry( 3, (0, 0, 0, 255) )
		ct.SetColorEntry( 4, (0, 0, 0, 255) )

		self.CreateTopojsonFile(level4FileName, src_ds, projection, geotransform, ct, data, pres, xorg, ymax, 4 )
		
#
# Main
#
if __name__ == '__main__':
	parser 		= argparse.ArgumentParser(description='Generate HAND')
	apg_input 	= parser.add_argument_group('Input')
	apg_input.add_argument("-f", "--force", action='store_true', help="Forces new product to be generated")
	apg_input.add_argument("-v", "--verbose", action='store_true', help="Verbose")
	apg_input.add_argument("-s", "--scene", nargs=1, help="VIIRS Scene")
	
	options 	= parser.parse_args()

	scene 		= options.scene[0]
	force		= options.force 
	verbose		= options.verbose 

	outdir		= os.path.join(config.VIIRS_DIR, scene)	
	app 		= VIIRS_WATER(outdir, scene )

	#app.process()
	#app.smoothIt()
	app.createLevels()