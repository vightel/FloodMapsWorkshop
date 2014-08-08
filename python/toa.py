#Steve Kochaver
#kochaver.python@gmail.com
#Version Date 2014-7-14

import sys, os, math, time 
import arcpy
from arcpy import env
from arcpy.sa import *

arcpy.CheckOutExtension("spatial")

#Metadata exists in one of two standard formats (finds the correct name for each field)
def acquireMetadata(metadata, band):
    
    band = str(band)
    metadatalist = []
    
    if ("RADIANCE_MAXIMUM_BAND_" + band) in metadata.keys(): 
        BANDFILE = "FILE_NAME_BAND_" + band
        LMAX = "RADIANCE_MAXIMUM_BAND_" + band
        LMIN = "RADIANCE_MINIMUM_BAND_" + band
        QCALMAX = "QUANTIZE_CAL_MAX_BAND_" + band
        QCALMIN = "QUANTIZE_CAL_MIN_BAND_" + band
        DATE = "DATE_ACQUIRED"
        metadatalist = [BANDFILE, LMAX, LMIN, QCALMAX, QCALMIN, DATE]

    elif ("LMAX_BAND" + band) in metadata.keys():
        BANDFILE = "BAND" + band + "_FILE_NAME"
        LMAX = "LMAX_BAND" + band
        LMIN = "LMIN_BAND" + band
        QCALMAX = "QCALMAX_BAND" + band
        QCALMIN = "QCALMIN_BAND" + band
        DATE ="ACQUISITION_DATE"
        metadatalist = [BANDFILE, LMAX, LMIN, QCALMAX, QCALMIN, DATE]

    else:
        arcpy.AddError('There was a problem reading the metadata for this file. Please make sure the _MTL.txt is in Level 1 data format')
        
    return metadatalist

#Calculate the radiance from metadata on band.
def calcRadiance (LMAX, LMIN, QCALMAX, QCALMIN, QCAL, band):
    
    LMAX = float(LMAX)
    LMIN = float(LMIN)
    QCALMAX = float(QCALMAX)
    QCALMIN = float(QCALMIN)
    offset = (LMAX - LMIN)/(QCALMAX-QCALMIN)
    inraster = Raster(QCAL)
    outname = 'RadianceB'+str(band)+'.tif'

    arcpy.AddMessage('Band'+str(band))
    arcpy.AddMessage('LMAX ='+str(LMAX))
    arcpy.AddMessage('LMIN ='+str(LMIN))
    arcpy.AddMessage('QCALMAX ='+str(QCALMAX))
    arcpy.AddMessage('QCALMIN ='+str(QCALMIN))
    arcpy.AddMessage('offset ='+str(offset))
    
    outraster = (offset * (inraster-QCALMIN)) + LMIN
    outraster.save(outname)
    
    return outname

def calcReflectance(solarDist, ESUN, solarElevation, radianceRaster, scaleFactor):
    
    #Value for solar zenith is 90 degrees minus solar elevation (angle from horizon to the center of the sun)
    #http://landsathandbook.gsfc.nasa.gov/data_properties/prog_sect6_3.html
    solarZenith = ((90.0 - (float(solarElevation)))*math.pi)/180 #Converted from degrees to radians
    solarDist = float(solarDist)
    ESUN = float(ESUN)
    radiance = Raster(radianceRaster)
    outname = 'ReflectanceB'+str(band)+'.tif'
    
    arcpy.AddMessage('Band'+str(band))
    arcpy.AddMessage('solarDist ='+str(solarDist))
    arcpy.AddMessage('solarDistSquared ='+str(math.pow(solarDist, 2)))
    arcpy.AddMessage('ESUN ='+str(ESUN))
    arcpy.AddMessage('solarZenith ='+str(solarZenith))

    outraster = (math.pi * radiance * math.pow(solarDist, 2)) / (ESUN * math.cos(solarZenith)) * scaleFactor
    outraster.save(outname)

    #outnull = SetNull(outraster, outraster, "Value > 0")
    #outnull.save('ReflectanceB'+str(band)+'null.tif')

    
    return outname

#Calculate the solar distance based on julian day    
def calcSolarDist (jday):

    #Values taken from d.csv file which is a formatted version of the d.xls file
    #associated with the Landsat7 handbook, representing the distance of the sun
    #for each julian day (1-366).
    #landsathandbook.gsfc.nasa.gov/excel_docs/d.xls (included in the parent folder)
    #this line keeps the relative path were this script is executing
    filepath = os.path.join(os.path.dirname(sys.argv[0]), 'd.csv')
    
    f = open(filepath, "r")
    lines = f.readlines()[2:]

    distances = []
    for x in range(len(lines)):
        distances.append(float(lines[x].strip().split(',')[1]))
    f.close()

    jday = int(jday)
    dist = distances[jday - 1]

    return dist 

def calcJDay (date):
    
    #Seperate date aspects into list (check for consistnecy in formatting of all
    #Landsat7 metatdata) YYYY-MM-DD
    dt = date.rsplit("-")

    #Cast each part of the date as a in integer in the 9 int tuple mktime
    t = time.mktime((int(dt[0]), int(dt[1]), int(dt[2]), 0, 0, 0, 0, 0, 0))

    #As part of the time package the 7th int in mktime is calulated as Julian Day
    #from the completion of other essential parts of the tuple
    jday = time.gmtime(t)[7]

    return jday

def getESUN(bandNum, SIType):
    SIType = SIType
    ESUN = {}
    #from NASA's Landsat7 User Handbook Table 11.3 http://landsathandbook.gsfc.nasa.gov/pdfs/Landsat7_Handbook.pdf
    #ETM+ Solar Spectral Irradiances(generated using the Thuillier solar spectrum)
    if SIType == 'ETM+ Thuillier':
        ESUN = {'b1':1997,'b2':1812,'b3':1533,'b4':1039,'b5':230.8,'b7':84.90,'b8':1362}

    #from NASA's Landsat7 User Handbook Table 11.3 http://landsathandbook.gsfc.nasa.gov/data_prod/prog_sect11_3.html
    #ETM+ Solar Spectral Irradiances (generated using the combined Chance-Kurucz Solar Spectrum within MODTRAN 5)
    if SIType == 'ETM+ ChKur':
        ESUN = {'b1':1970,'b2':1842,'b3':1547,'b4':1044,'b5':225.7,'b7':82.06,'b8':1369}

    #from NASA's Landsat7 User Handbook Table 9.1 http://landsathandbook.gsfc.nasa.gov/pdfs/Landsat7_Handbook.pdf
    #from the LPS ACCA algorith to correct for cloud cover
    if SIType == 'LPS ACAA Algorithm':
        ESUN = {'b1':1969,'b2':1840,'b3':1551,'b4':1044,'b5':225.7,'b7':82.06,'b8':1368}

    #from Revised Landsat-5 TM Radiometric Calibration Procedures and Postcalibration
    #Dynamic Ranges Gyanesh Chander and Brian Markham. Nov 2003. Table II. http://landsathandbook.gsfc.nasa.gov/pdfs/L5TMLUTIEEE2003.pdf
    #Landsat 4 ChKur
    if SIType == 'Landsat 5 ChKur':
        ESUN = {'b1':1957,'b2':1825,'b3':1557,'b4':1033,'b5':214.9,'b7':80.72}
    
    #from Revised Landsat-5 TM Radiometric Calibration Procedures and Postcalibration
    #Dynamic Ranges Gyanesh Chander and Brian Markham. Nov 2003. Table II. http://landsathandbook.gsfc.nasa.gov/pdfs/L5TMLUTIEEE2003.pdf
    #Landsat 4 ChKur
    if SIType == 'Landsat 4 ChKur':
        ESUN = {'b1':1957,'b2':1826,'b3':1554,'b4':1036,'b5':215,'b7':80.67} 

    bandNum = str(bandNum)
    
    return ESUN[bandNum]

def readMetadata(metadataFile):

    f = metadataFile
    
    #Create an empty dictionary with which to populate all the metadata fields.
    metadata = {}

    #Each item in the txt document is seperated by a space and each key is
    #equated with '='. This loop strips and seperates then fills the dictonary.

    for line in f:
        if not line.strip() == "END":
            val = line.strip().split('=')
            metadata [val[0].strip()] = val[1].strip().strip('"')      
        else:
            break

    return metadata

#Takes the unicode parameter input from Arc and turns it into a nice python list
def cleanList(bandList):
    
    bandList = list(bandList)
    
    for x in range(len(bandList)):
        bandList[x] = str(bandList[x])
        
    while ';' in bandList:
        bandList.remove(';')
        
    return bandList

#////////////////////////////////////MAIN LOOP///////////////////////////////////////

#Parameters from Arc
env.workspace = arcpy.GetParameterAsText(0)
metadataPath = arcpy.GetParameterAsText(1)
SIType = str(arcpy.GetParameterAsText(2))
keepRad = str(arcpy.GetParameterAsText(3))
scaleFactor = float(arcpy.GetParameterAsText(4))
arcpy.AddMessage(scaleFactor)
bandList = cleanList(arcpy.GetParameterAsText(5))
arcpy.env.overwriteOutput = True

metadataFile = open(metadataPath)
metadata = readMetadata(metadataFile)
metadataFile.close()

successful = []
failed = []
for band in bandList:
    
    band = str(band)
    metlist = acquireMetadata(metadata, band)
    BANDFILE = metlist[0]
    LMAX = metlist[1]
    LMIN = metlist[2]
    QCALMAX = metlist[3]
    QCALMIN = metlist[4]
    DATE = metlist[5]
    ESUNVAL = "b" + band


    try:
        radianceRaster = calcRadiance(metadata[LMAX], metadata[LMIN], metadata[QCALMAX], metadata[QCALMIN], metadata[BANDFILE], band)

        reflectanceRaster = calcReflectance(calcSolarDist(calcJDay(metadata[DATE])), getESUN(ESUNVAL, SIType), metadata['SUN_ELEVATION'], radianceRaster, scaleFactor)

        if keepRad != 'true':
            arcpy.Delete_management(radianceRaster)

        successful.append(BANDFILE)

    except Exception, e:
        failed.append(band)
        failed.append(str(e))

if successful:
    arcpy.AddWarning("The following files were converted successfully:")
    for x in successful:
        arcpy.AddWarning(metadata[x])

if failed:
    for x in range(0,len(failed),2):
        arcpy.AddError("Band" + str(failed[x]) + " failed to execute. Error: " + failed[x+1])
        if "object is not callable" in failed[x+1]:
            arcpy.AddError('This error catching is not 100%, it probably worked anyway')
