#!/usr/bin/env python
#
# Created on 3/23/2012 Pat Cappelaere - Vightel Corporation
# 

import os, inspect
import argparse
import requests
import xml.etree.ElementTree as ET
import email
import sys, urllib, urllib2, httplib, base64

connectid	= os.environ['DGCS_CONNECTID'] 	
username	= os.environ['DGCS_USERNAME'] 	
password	= os.environ['DGCS_PASSWORD']

wfs_url 	= "https://rdog.digitalglobe.com/catalogservice/wfsaccess?connectid=%s&version=1.1.0&service=WFS" % (connectid )
wcs_url 	= "https://rdog.digitalglobe.com/deliveryservice/wcsaccess?connectid=%s&version=1.1.1&service=WCS" % (connectid )

wfs2_url 	= "http://evwhs.digitalglobe.com/wfsservice/wfsaccess?SERVICE=WFS&VERSION=1.1.0&connectid=%s" % (connectid )
	
# minX, minY, maxX, maxY
# bbox 		= [-64.8, 32.3, -64.7, 32.4]
target		= [-72.36, 18.58 ]

def GetBBOX():
	delta	= 0.1
	lat 	= target[1]
	lon		= target[0]
	bbox 	= [lat-delta, lon-delta, lat+delta, lon+delta]
	return bbox
	
def WCSGetCapabilities():
	url 			= "%s&request=GetCapabilities" % (wcs_url)	
	request 		= urllib2.Request(url)
	base64string 	= base64.encodestring('%s:%s' % (username, password)).replace('\n', '')
	request.add_header("Authorization", "Basic %s" % base64string)   
	try:
		result = urllib2.urlopen(request).read()
		print result
	except urllib2.HTTPError:
		print 'WCS Server error'

	
def WCSGetCoverage():
	#url = "%s&request=GetCoverage&identifier=9fd17ad06e64ec88f8bcfa1bf799dcac&FORMAT=image/tiff&BoundingBox=31.988232000151683,-64.7509320001660632,32.5172,-64.56202199995319,urn:ogc:def:crs:EPSG::4326&GridBaseCRS=urn:ogc:def:crs:EPSG::4326&GridCS=urn:ogc:def:cs:OGC:0.0:Grid2dSquareCS&GridType=urn:ogc:def:method:WCS:1.1:2dGridIn2dCrs&GridOrigin=31.988234250151763,-64.56201974995311&GridOffsets=0.0005,0.0005" % (wcs_url)
	url="https://rdog.digitalglobe.com/deliveryservice/wcsaccess?connectid=%s&version=1.1.1&service=WCS&request=GetCoverage&identifier=53d1da68ce0e8b3dcdd7d6a16638c27c&FORMAT=image/geotiff&BoundingBox=18.274733999999288,-72.61284599974942,18.18456299996141,-72.45891900001115,urn:ogc:def:crs:EPSG::4326&GridBaseCRS=urn:ogc:def:crs:EPSG::4326&GridCS=urn:ogc:def:cs:OGC:0.0:Grid2dSquareCS&GridType=urn:ogc:def:method:WCS:1.1:2dGridIn2dCrs&GridOffsets=0.0005,0.0005" % (connectid)
	print url
	
	request 		= urllib2.Request(url)
	base64string 	= base64.encodestring('%s:%s' % (username, password)).replace('\n', '')
	request.add_header("Authorization", "Basic %s" % base64string)   
	try:
		fileName 	= 'result.tif'
		response 	= urllib2.urlopen(request)
		data 		= response.read()
		
		# we need to strip the first 21 lines and last line
		arr = data.split('\n')
		fp = open(fileName, 'wb')
		fp.write(arr[21])
		fp.close()
		response.close()

		
	except urllib2.HTTPError:
		print 'WFS Server error'

def WCSDescribeCoverage():
	url = "%s&request=DescribeCoverage&boundingBox=32.3,-64.8,32.4,-64.7&srsName=EPSG:4326&identifiers=9fd17ad06e64ec88f8bcfa1bf799dcac" % (wcs_url)
	print url
	
	request = urllib2.Request(url)
	base64string = base64.encodestring('%s:%s' % (username, password)).replace('\n', '')
	request.add_header("Authorization", "Basic %s" % base64string)   
	try:
		result = urllib2.urlopen(request).read()
		print result
	except urllib2.HTTPError:
		print 'WFS Server error'

def WFSGetCapabilities():
	url 			= "%s&request=GetCapabilities" % (wfs_url)	
	request 		= urllib2.Request(url)
	base64string 	= base64.encodestring('%s:%s' % (username, password)).replace('\n', '')
	request.add_header("Authorization", "Basic %s" % base64string)   
	try:
		result = urllib2.urlopen(request).read()
		print result
	except urllib2.HTTPError:
		print 'WFS Server error'
   
def FindCollectedFeatures(bbox):
	featureType = "CollectedContent"
	#featureType = "DigitalGlobe:FinishedFeature"	
		
	url = "%s&request=GetFeature&typeName=%s&srsName=EPSG:4326&bbox=%s" % (wfs2_url, featureType, ",".join(str(x) for x in bbox))
	print url
	
	request 		= urllib2.Request(url)
	base64string 	= base64.encodestring('%s:%s' % (username, password)).replace('\n', '')
	request.add_header("Authorization", "Basic %s" % base64string) 
	
	#ET._namespace_map["http://www.digitalglobe.com"] = 'DigitalGlobe'
	#ET._namespace_map["http://www.opengis.net/gml"] = 'gml'
	
	try:
		response 	= urllib2.urlopen(request)
		#print "Info:", response.info()
		
		result 		= response.read()
		
		print result
		
		#root 		= ET.fromstring(result)
		#for child in root:
		#	print child.tag, child.attrib
		#namespaces 	= {'gml': 'http://www.opengis.net/gml', 'DigitalGlobe': "http://www.digitalglobe.com"} # add more as needed
		
		#posList 	= root.find('gml:featureMembers/DigitalGlobe:FinishedFeature/DigitalGlobe:geometry/gml:Polygon/gml:exterior/gml:LinearRing/gml:posList', namespaces).text
		#print posList
		#arr			= posList.split(" ")
		#bbox		= [ float(arr[1]), float(arr[0]), float(arr[5]), float(arr[4])]
		#print bbox
		#return bbox
		
	except urllib2.HTTPError as e:
		print '*** WFS Server error', e.code(), e.read()
		
def FindFeature(identifier):
	featureType = "DigitalGlobe:FinishedFeature"	
	#url = "%s&request=GetFeature&typeName=%s&BBOX=-64.8,32.3,-64.7,32.4&srsName=EPSG:4326" % (wfs_url, featureType)
	#url = "%s&request=GetFeature&typeName=%s&BBOX=30.250383448012,-97.7684708569195,30.3119534076606,-97.7092977813448&WIDTH=3000&HEIGHT=3000&srsName=EPSG:4326" % (wfs_url, featureType)
	url = "%s&request=GetFeature&typeName=%s&srsName=EPSG:4326&CQL_Filter=featureId='%s'" % (wfs_url, featureType, identifier)
	#print url
	
	request 		= urllib2.Request(url)
	base64string 	= base64.encodestring('%s:%s' % (username, password)).replace('\n', '')
	request.add_header("Authorization", "Basic %s" % base64string) 
	
	#ET._namespace_map["http://www.digitalglobe.com"] = 'DigitalGlobe'
	#ET._namespace_map["http://www.opengis.net/gml"] = 'gml'
	
	try:
		response 	= urllib2.urlopen(request)
		#print "Info:", response.info()
		
		result 		= response.read()
		root 		= ET.fromstring(result)
		#for child in root:
		#	print child.tag, child.attrib
		namespaces 	= {'gml': 'http://www.opengis.net/gml', 'DigitalGlobe': "http://www.digitalglobe.com"} # add more as needed
		
		posList 	= root.find('gml:featureMembers/DigitalGlobe:FinishedFeature/DigitalGlobe:geometry/gml:Polygon/gml:exterior/gml:LinearRing/gml:posList', namespaces).text
		#print posList
		arr			= posList.split(" ")
		bbox		= [ float(arr[1]), float(arr[0]), float(arr[5]), float(arr[4])]
		#print bbox
		return bbox
		
	except urllib2.HTTPError as e:
		print '*** WFS Server error', e.code(), e.read()
		
def GetFeaturesInBbox(bbox):
	#featureType = "DigitalGlobe:CollectedContent"	
	featureType = "DigitalGlobe:FinishedFeature"	
	url 		= "%s&request=GetFeature&typeName=%s&srsName=EPSG:4326&Bbox=%s" % (wfs2_url, featureType, ",".join(str(x) for x in bbox))
	print url
	
	request 		= urllib2.Request(url)
	base64string 	= base64.encodestring('%s:%s' % (username, password)).replace('\n', '')
	request.add_header("Authorization", "Basic %s" % base64string) 
	
	#ET._namespace_map["http://www.digitalglobe.com"] = 'DigitalGlobe'
	#ET._namespace_map["http://www.opengis.net/gml"] = 'gml'
	
	try:
		response 	= urllib2.urlopen(request)
		print "Info:", response.info()
		
		result 		= response.read()
		print result
		
		
	except urllib2.HTTPError as e:
		print '*** WFS Server error', e.code(), e.read()
		
def GetCoverage(identifier, bbox):
	#url="https://rdog.digitalglobe.com/deliveryservice/wcsaccess?connectid=%s&version=1.1.1&service=WCS&request=GetCoverage&identifier=53d1da68ce0e8b3dcdd7d6a16638c27c&FORMAT=image/geotiff&BoundingBox=18.274733999999288,-72.61284599974942,18.18456299996141,-72.45891900001115,urn:ogc:def:crs:EPSG::4326&GridBaseCRS=urn:ogc:def:crs:EPSG::4326&GridCS=urn:ogc:def:cs:OGC:0.0:Grid2dSquareCS&GridType=urn:ogc:def:method:WCS:1.1:2dGridIn2dCrs&GridOffsets=0.0005,0.0005" % (connectid)
	url = "%s&request=GetCoverage&identifier=%s&FORMAT=image/geotiff&BoundingBox=%s" % (wcs_url, identifier, ",".join(str(x) for x in bbox))
	url += ",urn:ogc:def:crs:EPSG::4326&GridBaseCRS=urn:ogc:def:crs:EPSG::4326&GridCS=urn:ogc:def:cs:OGC:0.0:Grid2dSquareCS&GridType=urn:ogc:def:method:WCS:1.1:2dGridIn2dCrs"
	url += "&GridOffsets=0.00028,0.00028"
	print "WCS url:", url
	
	request 		= urllib2.Request(url)
	base64string 	= base64.encodestring('%s:%s' % (username, password)).replace('\n', '')
	request.add_header("Authorization", "Basic %s" % base64string)   
	
	try:
		fileName 		= 'result.tif'
		response 		= urllib2.urlopen(request)
		info			= response.info()
		content_type	= info['Content-Type']
		data 			= response.read()
		
		print content_type
		
		if content_type == "application/xml":
			print data
			
		if content_type.index('multipart/related')>=0:
			fileName = identifier+".tiff"
	
			message_text = "Content-Type: Multipart/Related;"
			message_text += "boundary=\"wcs_digitalglobe_coverage_boundary\"\n"
			message_text += data
			
			msg = email.message_from_string(message_text)
			for part in msg.walk(): 
				part_type = part.get_content_type()
				if part_type == "image/geotiff":
					data = part.get_payload();
					fp = open(fileName, 'wb')
					fp.write(data)
					fp.close()
					print "written", fileName
		
	except urllib2.HTTPError as e:
		print '*** WFS Server error', e.code(), e.read()
	
def WFSGetFeature():
	# Crashed featureType = "DigitalGlobe:StandardFeature"	
	bbox = GetBBOX()
	featureType = "DigitalGlobe:FinishedFeature"	
	#url = "%s&request=GetFeature&typeName=%s&BBOX=-64.8,32.3,-64.7,32.4&srsName=EPSG:4326" % (wfs_url, featureType)
	#url = "%s&request=GetFeature&typeName=%s&BBOX=30.250383448012,-97.7684708569195,30.3119534076606,-97.7092977813448&WIDTH=3000&HEIGHT=3000&srsName=EPSG:4326" % (wfs_url, featureType)
	url = "%s&request=GetFeature&typeName=%s&BBOX=%s&srsName=EPSG:4326" % (wfs_url, featureType, ",".join(str(x) for x in bbox) )

	print url
	
	request = urllib2.Request(url)
	base64string = base64.encodestring('%s:%s' % (username, password)).replace('\n', '')
	request.add_header("Authorization", "Basic %s" % base64string)   
	try:
		response = urllib2.urlopen(request)
		print response.info()
		result = response.read()
		print result
	except urllib2.HTTPError as e:
		print '*** WFS Server error', e.code(), e.read()
	
	
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
	
	identifier 	= scene
	
	#FindCollectedFeatures( bbox)
	
	bbox 			= FindFeature(identifier)
	GetCoverage(identifier, bbox)
	
	#WCSGetCapabilities()	
	#WCSGetCoverage()
	