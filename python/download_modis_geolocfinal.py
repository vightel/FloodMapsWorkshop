#!/usr/bin/env python
# 
# From Eric Kabuchanga, kabuchanga@rcmrd.org
# RCMRD Nairobi, Kenya
# Minor teaks for MacOSX Pat Cappelaere - Vightel Corporation
#
import ftplib, os
import time
import datetime
import glob, fnmatch
import config

urs_login 		= os.environ["URS_LOGIN"]
urs_password	= os.environ["URS_PASSWORD"]

ftp 		= ftplib.FTP("nrt1.modaps.eosdis.nasa.gov")
one_day 	= datetime.timedelta(days=1)
_actDate 	= datetime.date.today()

# PGC Debug
_actDate 	= datetime.date(2014,10,3)

workingDate = _actDate - one_day
_month 		= workingDate.month
_day 		= workingDate.day
_year 		= str(workingDate.year)
_yrDay 		= str(workingDate.timetuple()[7])

if len(_yrDay)==1:
    _yrDay = "00" + _yrDay
elif len(_yrDay)==2:
    _yrDay = "0" + _yrDay


files = []

downloadFileNames = []
downloadFiles = []
#print str(workingDate)

def getSize(fname):
    st = os.stat(fname)
    return st.st_size
	
def _createLSTFile(_time):

    global _yrDay, _year
       
    lstfname='MYD11_L2.A'
    
    try:
        
        if len(_yrDay) == 2:
            _yrDay = "0" + _yrDay            
            #print _yrDay

        lstfname= lstfname +_year + _yrDay  + "." + _time +".005.NRT.hdf"

        #print lstfname
        
    except IOError as e:

        print e
        

    return lstfname

def _createGeolocationFile(_time):

    global _yrDay, _year
       
    lstfname='MYD03.A'
    
    try:
        
        if len(_yrDay) == 2:
            _yrDay = "0" + _yrDay            
            #print _yrDay

        geoLocfname= lstfname +_year + _yrDay  + "."+ _time +".005.NRT.hdf"

        #print geoLocfname
        
    except IOError as e:

        print e
        

    return geoLocfname



def _createDownloadList():
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

            if _hr > 21:

                #_theMain(_thhr)
            
                downloadFileNames.append( _createGeolocationFile(_thhr))
                metFile =  _createGeolocationFile(_thhr) + ".met"
                downloadFileNames.append(metFile)
                #print _createLSTFile(_thhr)

                #print _createGeolocationFile(_thhr)
            
            _min=_min+5
            
        _hr = _hr+1

        
_createDownloadList()

downloadIsNotComplete=True

BASE_DIR = config.FROST_DIR

while downloadIsNotComplete:
    try:
        ftp.login(urs_login, urs_password)

        print "Login Successful"
        
        ftp.cwd("/allData/1/MYD03/" + _year + "/" + _yrDay)
		
        lclDir = os.path.join(BASE_DIR,_year,_yrDay, "geo")
		
        if not os.path.exists(lclDir):            
            os.makedirs(lclDir)
        else:
            print lclDir +" Dir exists"
        
        localDir = lclDir

        localFiles =[]

        excludeFiles =[]

        def addFile(filename):
            files.append(filename)

        def handleDownload(block):
            wfile.write(block)
            
        ftp.retrlines("NLST", addFile)

        for fName in files:
            #print fName
            for dFname in downloadFileNames:

                if dFname == fName:
                    print dFname
                    downloadFiles.append(fName)              
        
        k = 0
        
        print str((files))
        print str((downloadFileNames))
        print str(len(downloadFiles))
        for theFile in downloadFiles:

            try:
                print theFile
                
                filePath = os.path.join(localDir,theFile)

                wfile = open(filePath, 'wb')

                fileSize = ftp.size(theFile)
                
                if (fileSize < 0):
                    print "file does not exist"
                else:

                    ftp.retrbinary('RETR ' + theFile, handleDownload)

                    print theFile + " Downloaded Successfully. " + str(k)        
                
                    k = k+1
            except IOError as e:

                print str(e)

        #if k==len(files):
        #    downloadIsNotComplete=False

		downloadIsNotComplete=False
        print "Completed downloading " + str(k) + " files"
        ftp.quit()
    except IOError as e:
        print "I/O error({0}): {1}".format(e.errno, e.strerror)
        ftp.quit()
    

