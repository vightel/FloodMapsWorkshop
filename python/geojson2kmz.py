#!/usr/bin/env python
#
# Created on 7/5/2013 Pat Cappelaere - Vightel Corporation
# 

import sys, os, inspect
import argparse
import json
from lxml import etree
import pykml
from pykml.factory import KML_ElementMaker as KML
from pykml.helpers import set_max_decimal_places
import zipfile

if __name__ == '__main__':
	parser = argparse.ArgumentParser(description='GEOJSON OSM Processing')
	
	apg_input = parser.add_argument_group('Input')
	apg_input.add_argument("-f", "--force", action='store_true', help="forces new water image to be generated")
	apg_input.add_argument("-v", "--verbose", action='store_true', help="Verbose Flag")
	apg_input.add_argument("-i", "--input", help="input file", required='true')
	apg_input.add_argument("-s", "--scene", help="scene", required='true')
	
	options 	= parser.parse_args()

	force		= options.force
	verbose		= options.verbose
	inputf		= options.input
	scene		= options.scene
	
	kml_output		= inputf.replace(".json",".kml")
	kmz_output		= inputf.replace(".json",".kmz")
	
	if verbose:
		print "Processing ", inputf
	
	doc = KML.kml(
			KML.Document(
				KML.Folder( 
					KML.name(scene),
					KML.description("Radarsat2 Surface Water"),
					KML.Style(
						KML.LineStyle(
							KML.color("ff0000ff")
						),
						KML.PolyStyle(
							KML.fill('0')
						),
			            id="SurfaceWater"
					)
				)
			)
		)
		
	with open(inputf) as data_file:    
		data 		= json.load(data_file)
		features 	= data['features']
		
		if verbose:
			print "found", len(features), " features"
		
		for feature in features:
			coordinates = feature['geometry']['coordinates'][0]
			coords = ""
			for c in coordinates:
				lon = c[0]
				lat = c[1]
				coords += "%f,%f " % (lon,lat)
						
			pm = KML.Placemark(
					KML.styleUrl("#SurfaceWater"),
					KML.Polygon(
						KML.outerBoundaryIs(
							KML.LinearRing(
								KML.coordinates( coords )
							)
						)
					)
				)
			doc.Document.Folder.append(pm)

		outfile = file(kml_output,'w')
		outfile.write("<?xml version='1.0' encoding='UTF-8'?>\n")
		outfile.write(etree.tostring(doc, pretty_print=True))
		outfile = None

		if verbose:
			print("zipping kml...")
			
		zf = zipfile.ZipFile(kmz_output, mode='w')
		try:
		    zf.write(kml_output)
		finally:
			if verbose:
				print('closing')
			zf.close()
		
		if verbose:
			print "Done"
			