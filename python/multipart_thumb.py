#!/usr/bin/env python
# Converts Multipart/related to PNG Thumbnail file for Digiglobe
#
import os
import sys
import mimetypes
import argparse
import config

import email
from email.Parser import Parser as EmailParser
from email import encoders
from email.message import Message
from email.mime.audio import MIMEAudio
from email.mime.base import MIMEBase
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

verbose = 0
force	= 0

class Digiglobe:

	def __init__( self, outpath, scene ):	
		self.input_file			= os.path.join(outpath, scene + "_thn.tif")
		self.output_file		= os.path.join(outpath, scene + "_thn.tiff")
		self.thumbnail_file		= os.path.join(outpath, scene + "_thn.png")
		
	def execute( self, cmd ):
		if verbose:
			print cmd
		os.system(cmd)
		
	def process(self):
		if verbose:
			print "process", self.input_file
			
		fp 		= open(self.input_file, 'r+')
		data	= fp.read()
		#msg 	= email.message_from_file(fp)

		message_text = "Content-Type: Multipart/Related;"
		message_text += "boundary=\"wcs_digitalglobe_coverage_boundary\"\n"
		message_text += data

		message = email.message_from_string(message_text)

		counter = 1
		for part in message.walk(): 
			part_type = part.get_content_type()
			if part_type == "image/geotiff":
				data = part.get_payload();
				ofp = open(self.output_file, 'wb')
				ofp.write(data)
				ofp.close()
				
				if verbose:
					print "written", self.output_file
						
				cmd = "gdal_translate -of PNG %s %s" % (self.output_file, self.thumbnail_file)
				self.execute(cmd)
				
		fp.close()

if __name__ == '__main__':

	parser = argparse.ArgumentParser(description='Generate Digiglobe Thumbnail File from multipart/related')
	apg_input = parser.add_argument_group('Input')
	apg_input.add_argument("-s", "--scene", 	help="Digiglobe Scene")
	apg_input.add_argument("-f", "--force", 	action='store_true', help="Forces new product to be generated")
	apg_input.add_argument("-v", "--verbose", 	action='store_true', help="Verbose on/off")

	options 	= parser.parse_args()
	force		= options.force
	verbose		= options.verbose
	scene	 	= options.scene

	outdir		= os.path.join(config.DIGIGLOBE_DIR,scene)	
	app 		= Digiglobe(outdir, scene)
	app.process()

