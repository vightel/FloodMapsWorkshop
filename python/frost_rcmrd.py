#!/usr/bin/env python
# 
# From Eric Kabuchanga, kabuchanga@rcmrd.org
# RCMRD Nairobi, Kenya
# Minor teaks for MacOSX Pat Cappelaere - Vightel Corporation
#
# Here is the link where you can get the original hdfs and the resulting tif files 
# http://41.206.34.124/frostmaps/ 
# http://41.206.34.124/frostmaps/

import time
import datetime
import glob,os, fnmatch
#import arcpy
#import smtplib
#from email.MIMEMultipart import MIMEMultipart
#from email.MIMEBase import MIMEBase
#from email.MIMEText import MIMEText
#from email.Utils import COMMASPACE, formatdate
#from email import Encoders
#import shutil
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

outPtDir = os.path.join(BASE_DIR, _year, _yrDay, 'output') 
if not os.path.exists(outPtDir):            
    os.makedirs(outPtDir)
    
srcPath = os.path.join(BASE_DIR, _year)
if not os.path.exists(srcPath):            
    os.makedirs(srcPath)

resources			= os.path.join(BASE_DIR, 'resources') 
templateMXD			= os.path.join(resources, 'Frost2.mxd') 	#"H:\\Frost\\_resources\\Frost2.mxd"
targetMXD			= os.path.join(resources, 'Frost3.mxd') 	#"H:\\Frost\\_resources\\Frost3.mxd"
symbologyLayerFile	= os.path.join(resources, 'LST2.lyr')	 	#"H:\\Frost\\_resources\\LST2.lyr"

frostMapTitle 		= "Estimated Frost Occurrences on " + str(_today + one_day)

#ouputMapFileName 	= "H:\\Frost\\_workingDir\\maps\\Frost_" + str(_today + one_day)
ouputMapFileName 	= os.path.join(BASE_DIR, _year, _yrDay, "Frost_" + str(_today + one_day))

print (_today)

#......................................................................................................................................................................

def send_mail(send_from, send_to, subject, text, files=[], server="192.168.0.243"):
	assert type(send_to)==list
	assert type(files)==list

	msg = MIMEMultipart()
	msg['From'] = send_from
	msg['To'] = COMMASPACE.join(send_to)
	msg['Date'] = formatdate(localtime=True)
	msg['Subject'] = subject

	msg.attach( MIMEText(text) )

	for f in files:
		part = MIMEBase('application', "octet-stream")
		part.set_payload( open(f,"rb").read() )
		Encoders.encode_base64(part)
		part.add_header('Content-Disposition', 'attachment; filename="%s"' % os.path.basename(f))
		msg.attach(part)
	
	smtp = smtplib.SMTP(server)
	
	smtp.set_debuglevel(1) 
	smtp.ehlo() 
	smtp.starttls() 
	#smtp.ehlo() 
	smtp.login('servir', 'servir2013') 	
	smtp.sendmail(send_from, send_to, msg.as_string())
	smtp.close()
#..............................................................................................................................
def _getFrostFiles(tifPath):

    frostFiles =[]

    
    

    try:
        
        dirList=os.listdir(tifPath)
                 
        for fname in dirList:

            if fnmatch.fnmatch(fname, '*.tif'):
         
                #Process: Build Pyramids And Statistics for the TIF file           
                arcpy.BuildPyramidsandStatistics_management(srcPath + _yrDay + "\\output\\" + fname, "INCLUDE_SUBDIRECTORIES", "BUILD_PYRAMIDS", "CALCULATE_STATISTICS", "NONE")
                
                #Process: Get Raster Properties and determine the maxmum cell value
                #maxCellValue = arcpy.GetRasterProperties_management(srcPath + "\\" + fname, "MAXIMUM")
                rst = arcpy.Raster(srcPath + _yrDay + "\\output\\"  + fname)
                maxCellValue = rst.maximum
                
                if str(maxCellValue) == "0.0":
                    
                    print str(maxCellValue) + "T"
                    
                else:

                    print str(maxCellValue) + "F"

                    frostFiles.append(fname)    
                
    except IOError as e:
                 
        print "I/O error({0}): {1}".format(e.errno, e.strerror)


    return frostFiles

#print _getFrostFiles(srcPath)[0]

#.....................................................................................................................................................................  

def _mapping(tmp_mxdPath, symbologyLayer, target_mxdPath, MapTitle, outPutFileName):

    try:
        mxd = arcpy.mapping.MapDocument(tmp_mxdPath) #("D:\\Modis_LST\\Frost\\Frost2.mxd")
        df = arcpy.mapping.ListDataFrames(mxd, "Layers")[0]
        #Add frost layers to the map document
        print "Adding frost layers"
        
        for tifFile in _getFrostFiles(srcPath + _yrDay + "\\output\\" ):
            print tifFile
            result = arcpy.MakeRasterLayer_management(srcPath + _yrDay + "\\output\\" + tifFile, tifFile + ".lyr")
            print result.getOutput(0)
            addLayer = result.getOutput(0)
            #addLayer = arcpy.mapping.Layer(srcPath +"\\" + tifFile)
            arcpy.mapping.AddLayer(df, addLayer, "BOTTOM")

        #Apply Frost symbology to the layers
        print "Applying symbology"        
        lryIndx = 0
        for lyr in arcpy.mapping.ListLayers(mxd, "", df):
            if lryIndx > 1:
                arcpy.ApplySymbologyFromLayer_management(lyr,symbologyLayer)
            lryIndx=lryIndx+1
                

        #Add new Map title
        print "Titling map"
        for elm in arcpy.mapping.ListLayoutElements(mxd, "TEXT_ELEMENT"):
            if elm.name == "map":        
                elm.text=MapTitle
                print elm.text
            if elm.name == "day":        
                elm.text="Map Reference no :- " + _yrDay
                print elm.text
        mxd.saveACopy(target_mxdPath) #("D:\\Modis_LST\\Frost\\Frost3.mxd")
        del mxd
        
        #Exprot to pdf and JPG
        print "Exporting maps"
        mappingMxd = arcpy.mapping.MapDocument(target_mxdPath)
        arcpy.mapping.ExportToPDF(mappingMxd, outPutFileName + ".pdf")
        arcpy.mapping.ExportToJPEG(mappingMxd, outPutFileName + ".jpg")
        #Email the maps
        

    except IOError as e:
                 
        print "I/O error({0}): {1}".format(e.errno, e.strerror)



#.......................................................................................................................................................................

def _getLSTFile(_time):

    global _yrDay, _year
       
    lstfname='MYD11_L2.A'
    
    try:
        
        if len(_yrDay) == 2:
            _yrDay = "0" + _yrDay            
            print _yrDay

        lstfname= os.path.join(_yrDay, "lst", lstfname +_year + _yrDay  + "." + _time +".005.NRT.hdf")

        print lstfname
        
    except IOError as e:

        print e
        

    return lstfname


#.......................................................................................................................................................................

def _getGeolocationFile(_time):

    global _yrDay, _year
       
    lstfname='MYD03.A'
    
    try:
        
        if len(_yrDay) == 2:
            _yrDay = "0" + _yrDay            
            print _yrDay

        lstfname= os.path.join(_yrDay, "geo", lstfname +_year + _yrDay  + "."+ _time +".005.NRT.hdf")

        print lstfname
        
    except IOError as e:

        print e
        

    return lstfname


#.......................................................................................................................................................................

def _getOutputFile(_time):

    global _yrDay, _year
       
    lstfname='Frost_'
    
    try:
        
        if len(_yrDay) == 2:
            _yrDay = "0" + _yrDay            
            print _yrDay

        lstfname= os.path.join(_yrDay, "output", lstfname +_year + _yrDay  + "."+ _time +".tif")

        print lstfname
        
    except IOError as e:

        print e
        

    return lstfname


#----------------------------------------------------------------------------------------------------------------------------------------------------------------------


def _mrtSwath2Gird( inPutLST, OutPuTIF, inPutGeoloc):
    try:
        #cmd1='swath2grid -if=D:\\Modis_LST\\2014\\027\\lst\\MYD11_L2.A2013027.0030.005.NRT.hdf -of=D:\\Modis_LST\\2014\\027\\output\\output1.tif -gf=D:\\Modis_LST\\2014\\027\\geo\\MYD03.A2013027.0030.005.NRT.hdf -off=GEOTIFF_FMT -sds=LST -kk=NN -oproj=GEO -oprm="0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0" -oul="33.0 5.5" -olr="42.0 -5.5" -osst=LAT_LONG -osp=8'
        #cmd='swath2grid -if='+ inPutLST + ' -of='+OutPuTIF+' -gf='+inPutGeoloc+' -off=GEOTIFF_FMT -sds=LST -kk=NN -oproj=GEO -oprm="0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0" -oul="33.0 5.5" -olr="42.0 -5.5" -osst=LAT_LONG -osp=8'
        cmd='swath2grid -if='+ inPutLST + ' -of='+OutPuTIF+' -gf='+inPutGeoloc+' -off=GEOTIFF_FMT -sds=LST -kk=NN -oproj=GEO -oprm="0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0" -oul="14.5 15.5" -olr="51.5 -13.5" -osst=LAT_LONG -osp=8'
        os.system(cmd)        
    except IOError as e:
        print "I/O error({0}): {1}".format(e.errno, e.strerror)


#-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

def _theMain(theTime):

    try:
        lstDir			= srcPath
        _lstFname 		= _getLSTFile(theTime)
        _geoLocFname 	= _getGeolocationFile(theTime)
        _outPuttif 		= _getOutputFile(theTime)

        inLst			= os.path.join(lstDir, _lstFname) 		#'D:\\Modis_LST\\2013\\027\\lst\\MYD11_L2.A2013027.0030.005.NRT.hdf'
        outTif			= os.path.join(lstDir, _outPuttif)  	#'D:\\Modis_LST\\2013\\027\\output\\output1.tif' 
        inGeoloc		= os.path.join(lstDir, _geoLocFname) 	#'D:\\Modis_LST\\2013\\027\\geo\\MYD03.A2013027.0030.005.NRT.hdf'

        if ( not os.path.isfile(inLst)) or ( not os.path.isfile(inGeoloc)):
            print("Error: %s file not found" % inLst )

            print("Or Error: %s file not found" % inGeoloc)
            
        else:
           
            _mrtSwath2Gird(inLst, outTif, inGeoloc)

    except IOError as e:
        print "I/O error({0}): {1}".format(e.errno, e.strerror)
        
 
#-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

_hr=0
while _hr < 24:
    
    _min=0

    hrStr=str(_hr)
    
    if len(str(_hr)) == 1:

            hrStr = "0" + str(_hr)
    
    while _min < 60:

        if len(str(_min)) == 1:

            minStr = "0" + str(_min)
            
        else:

            minStr=str(_min)
            
        _thhr = hrStr + minStr

        _theMain(_thhr)
        
        #print _thhr       
        
        _min=_min+5
        
    _hr = _hr+1

#_mapping(templateMXD, symbologyLayerFile, targetMXD, frostMapTitle,  ouputMapFileName)

#Send frost products to users
#filesToAttch = [ouputMapFileName +".pdf", ouputMapFileName +".jpg"]
#recp = ["jgitau@rcmrd.org", "kabuchanga@rcmrd.org", "ashutosh.limaye@nasa.gov"]
#recp = ["ayubshaka@ymail.com", "mungai_j@yahoo.com", "sakwa@meteo.go.ke", "ashulimaye@yahoo.com", "absaes@live.com", "kabuchanga@rcmrd.org", "ceresemarie@gmail.com" ]
#recp2 = ["Kabuchanga@yahoo.com", "james.kiguru@aon.co.ke",  "Leonard.Musao@aon.co.ke", "John.Gangla@aon.co.ke"]
#send_mail(send_from, send_to, subject, text, files=[], server="192.168.0.243"):
#send_mail("servir@rcmrd.org", recp, "Frost Map for " + str(_today + one_day), "Please find the attached Frost map for " + str(_today + one_day) + ". You can also find the same map on http://41.206.34.124/frostmaps/ This email was automatically send by Frost Monitoring System." , filesToAttch, "192.168.0.243:25")
#send_mail("servir@rcmrd.org", recp2, "Frost Map for " + str(_today + one_day), "Please find the attached Frost map for " + str(_today + one_day) + ". You can also find the same map on http://41.206.34.124/frostmaps/ This email was automatically send by Frost Monitoring System." , filesToAttch, "192.168.0.243:25")







