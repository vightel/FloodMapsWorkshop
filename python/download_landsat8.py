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
    return
 
#############################"pour des gros fichiers
 
def downloadChunks(url,rep,nom_fic):
  """Telecharge de gros fichiers par morceaux
     inspire de http://josh.gourneau.com
  """
 
  try:
    req = urllib2.urlopen(url)
    #taille du fichier
    if (req.info().gettype()=='text/html'):
      print "erreur : le fichier est au format html"
      lignes=req.read()
      if lignes.find('Download Not Found')>0 :
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
	sys.stdout.write(str(math.floor((float(downloaded) / total_size) * 100 )) +'%')
	sys.stdout.flush()
	if not chunk: break
	fp.write(chunk)
      print 'fini'
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
	print "example (scene): python %s -s scene -u usgs.txt"%sys.argv[0]
	sys.exit(-1)
else:
  usage = "usage: %prog [options] "
  parser = OptionParser(usage=usage)
	
  parser.add_option("-s", "--scene", dest="scene", action="store", type="string", help="coordonnees WRS2 de la scene (ex 198030)", default=None)
  parser.add_option("-u","--usgs_passwd", dest="usgs", action="store", type="string", help="USGS earthexplorer account and password file")
	
 
  (options, args) = parser.parse_args()
  parser.check_required("-u")

# read password files
try:
  f=file(options.usgs)
  (account,passwd)=f.readline().split(' ')
  print account,passwd
  if passwd.endswith('\n'):
    passwd=passwd[:-1]
  usgs={'account':account,'passwd':passwd}
  f.close()
except :
  print "error with usgs password file"
  sys.exit(-2)
  
rep='../data/landsat8'
if not os.path.exists(rep):
    os.mkdir(rep)
 
############Telechargement des produits par scene
repert = 4923  
url="http://earthexplorer.usgs.gov/download/%s/%s/STANDARD/EE"%(repert,options.scene)

if not(os.path.exists(rep_scene+'/'+nom_prod+'.tgz')):
  try:
    connect_earthexplorer_no_proxy(usgs)
    downloadChunks(url,"%s"%rep_scene,nom_prod+'.tgz')
  except TypeError:
    print '   produit %s non trouve'%nom_prod
  else :
    print '   produit %s deja telecharge'%nom_prod


#
# Let's start the processing
#
# Generate RGB Composite
cmd = "./landsat8_composite_toa.py --scene "+options.scene + " --red 4 --green 3 --blue 2"
print cmd
err = os.system(cmd)
if err:
	print "Error generating l8 composite"
	sys.exit(-1)


# Generate surface water
cmd = "./landsat8_toa_watermap.py --scene "+options.scene
print cmd
err = os.system(cmd)
if err:
	print "Error generating l8 surface water map"
	sys.exit(-1)

# Generate browse image
cmd = "./landsat8_to_topojson.py --scene "+options.scene
print cmd
err = os.system(cmd)
if err:
	print "Error generating l8 browseimage"
	sys.exit(-1)
	
# Generate browse image
cmd = "./landsat8_browseimage.py --scene "+options.scene
print cmd
err = os.system(cmd)
if err:
	print "Error generating l8 browseimage"
	sys.exit(-1)
