#! /usr/bin/env python

import os,sys,math,urllib2,urllib
import optparse
###########################################################################
class OptionParser (optparse.OptionParser):
    
    def check_required (self, opt):
      option = self.get_option(opt)
      
      # Assumes the option's 'default' is set to None!
      if getattr(self.values, option.dest) is None:
          self.error("%s option not supplied" % option)

#############################"Connection Earth explorer sans proxy

def connect_earthexplorer_no_proxy(usgs):
    opener = urllib2.build_opener(urllib2.HTTPCookieProcessor())
    urllib2.install_opener(opener)
    params = urllib.urlencode(dict(username=usgs['account'],password= usgs['passwd']))
    f = opener.open("https://earthexplorer.usgs.gov/login/", params)
    data = f.read()
    f.close()
    if data.find('You must sign in as a registered user to download data or place orders for USGS EROS products')>0 :
      print "Authentification failed"
      sys.exit(-1)
    else:
      print "Connected to USGS Earth Explorer"
    return

#############################"pour des gros fichiers

def downloadChunks(url,rep,nom_fic):
  """Telecharge de gros fichiers par morceaux
     inspire de http://josh.gourneau.com
  """
  print "downloadChunks:", url
  
  try:
    req = urllib2.urlopen(url)
    #taille du fichier
    if (req.info().gettype()=='text/html'):
      print "erreur : le fichier est au format html"
      lignes=req.read()
      if lignes.find('Download Not Found')>0 :
        print lignes
        raise TypeError
      else:
       print lignes
       print sys.exit(-1)
    total_size = int(req.info().getheader('Content-Length').strip())
    if (total_size<50000):
      print "erreur : le fichier est trop petit pour etre une image landsat"
      print url
      sys.exit(-1)
    print nom_fic,total_size
    downloaded = 0
    CHUNK = 1024 * 1024 *8
    with open(rep+'/'+nom_fic, 'wb') as fp:
      while True:
        chunk = req.read(CHUNK)
        downloaded += len(chunk)
        sys.stdout.write(str(math.floor((float(downloaded) / total_size) * 100 )) +'% ')
        sys.stdout.flush()
        if not chunk: break
        fp.write(chunk)
      print '.'
  except urllib2.HTTPError, e:
    print "HTTP Error:",e.code , url
    return False
  except urllib2.URLError, e:
    print "URL Error:",e.reason , url
    return False
  
  return rep,nom_fic

######################################################################################
###############""main
#################################################################################

################Lecture des arguments
if len(sys.argv) == 1:
  prog = os.path.basename(sys.argv[0])
  print '      '+sys.argv[0]+' [options]'
  print "     Aide : ", prog, " --help"
  print "        ou : ", prog, " -h"
  print "example (scene): python %s -s EO1XXX -u usgs.txt"%sys.argv[0]
  sys.exit(-1)
else:
  usage = "usage: %prog [options] "
  parser = OptionParser(usage=usage)
  parser.add_option("-s", "--scene", dest="scene", action="store", type="string", help="coordonnees WRS2 de la scene (ex 198030)", default=None)
  
  (options, args) = parser.parse_args()
  parser.check_required("-s")

rep='../data/eo1_ali'
if not os.path.exists(rep):
  os.mkdir(rep)

usgs_account 	= os.environ["USGS_ACCOUNT"]
usgs_password  	= os.environ["USGS_PASSWORD"]

assert (usgs_account), "USGS_ACCOUNT undefined"
assert (usgs_password), "USGS_PASSWORD undefined"

usgs={'account':usgs_account,'passwd':usgs_password}

repert = 1852  
url="http://earthexplorer.usgs.gov/download/%s/%s/L1T/EE"%(repert,options.scene)

tgz = rep+'/'+options.scene+'.tgz'
if not(os.path.exists(tgz)):
  try:
    connect_earthexplorer_no_proxy(usgs)
    downloadChunks(url,rep, options.scene+'.tgz')
  except TypeError:
    print '   produit %s non trouve'%options.scene
else :
  print '   produit %s deja telecharge'%options.scene+'.tgz'

  dir = rep+'/'+options.scene
  if not(os.path.exists(dir)):
    os.mkdir(dir)
    cmd = "tar xvfz "+tgz+" -C "+dir
    print cmd
    os.system(cmd)
  else:
    print "dir exists"

#
# Let's start the processing
#
# Generate RGB Composite
cmd = "./eo1_ali_composite.py --scene "+options.scene + " --red 5 --green 4 --blue 3"
print cmd
err = os.system(cmd)
if err:
	print "Error generating ali composite"
	sys.exit(-1)

# Generate cloud mask
cmd = "./eo1_ali_cloudmask.py --scene "+options.scene
print cmd
err = os.system(cmd)
if err:
	print "Error generating ali cloudmask"
	sys.exit(-1)

# Generate surface water
cmd = "./eo1_ali_watermap.py --scene "+options.scene
print cmd
err = os.system(cmd)
if err:
	print "Error generating ali surface water map"
	sys.exit(-1)
	
# Generate vectors
cmd = "./eo1_to_topojson.py --scene "+options.scene+" --vrt haiti_hand.vrt"
print cmd
err = os.system(cmd)
if err:
	print "Error generating ali vectors"
	sys.exit(-1)

# Generate browse image
cmd = "./eo1_ali_browseimage.py --scene "+options.scene
print cmd
err = os.system(cmd)
if err:
	print "Error generating ali browseimage"
	sys.exit(-1)
