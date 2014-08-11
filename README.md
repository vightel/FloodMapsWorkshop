Flood Workshop Training
=======================

How to generate flood maps from  Radarsat-2, MODIS, EO-1 and Landsat-8 imagery...
WaterPedia for flood event mapping and validation
Global Flood Catalog for event recording
Open GeoSocial API for data distribution
GeoApp

Note: This is not authoritative but work in progress used for capacity building and examples... not operational software!

## Pre-requisites

* Register on GitHub.com for an account
  * You may have to send us your handle to become collaborator on this project

* Laptop with: 
  * phpAdmin or Navicat (prefered http://www.navicat.com/download/navicat-for-postgresql ) to configure database 
  * git
  * Editor (TextMate, XCode, Eclipse, VIM...)
 
* [OPTIONAL] download package onto your local machine or laptop to review scripts locally
  * git clone https://github.com/vightel/menatraining.git

* [Free] Account on Amazon AWS [you may need a credit card] http://aws.amazon.com/
 
## Steps

* Launch a Virtual Machine on Amazon Elastic Compute Cloud (EC2)
  * Select Region East
  * Linux AMI, General Purpose, m3.large, Note: we need ~ 100GiB storage check if this is still an m3.large otherwise will need to increase volume later
  * Create key/pair and store it in local DIR.  Restrict access to key.pem (chmod 600 key.pem)
  * Remember Instance ID and Public DNS (Check your Management Console if necessary)

* Create an Amazon Relational Database Service (RDS) Instance to Store OSM data (Water Reference)
  *	Postgresql, 9.3.3, db.m1.small, No, 5GB
  * DBNAME: osmdb
  * DBOWNER: osm_admin
  * PGPASS: osmAdmin1XXX	# USE YOURS - THIS WILL NOT WORK
  * Edit security group to have enough security access to communicate
  * Using Navicat (or phpAdmin) Connect to osmdb database.  Select and Open console
    * osmdb# create extension postgis;
    * osmdb# create extension fuzzystrmatch;
    * osmdb# create extension postgis_tiger_geocoder;
    * osmdb# create extension postgis_topology;

* cd DIR where key.pem is
* Access your instance [remember your public DNS]: 
  * ssh -i key.pem ec2-user@ec2-54-84-226-201.compute-1.amazonaws.com
  
* Set your envs... something like...[remember your Endpoint]
  * export DBHOST= osmdb.crcholi0be4z.us-east-1.rds.amazonaws.com
  * export DBNAME= osmdb
  * export DBOWNER= osm_admin
  * export DBPORT= 5432
  * export PGPASS= osmAdmin1XXX	# USE YOURS - THIS WILL NOT WORK
  * export DATABASE_URL= "tcp://osm_admin:osmAdmin1@osmdb.crcholi0be4z.us-east-1.rds.amazonaws.com/osmdb"
  * export USGS_ACCOUNT=
  * export USGS_PASSWORD=

* Install code dependencies
  * git clone https://github.com/vightel/menatraining.git
  * cd menatraining
  * export MENA_DIR=~/menatraining
  * sh install-deps.sh
  
* Install data dependencies... This will copy some data from S3 to your data directory for testing
  * sh getdata.sh

* Verify Database dependencies
  * cd $MENA_DIR/python
  * Check python configuration file: config.py
  * Check database settings: ./inc/datasource-settings.xml.inc
  * Check python environment, run:
	* check_environment.py
	
* [OPTIONAL] Download OSM data files and load OSM database
  * You may have to get OSM data from your particular area from http://download.geofabrik.de/ and edit the shell file below.
  * cd ./data/osm
  * sh load_all.sh

* [OPTIONAL] Add database tables if you are going to use the Publisher (Node Application)
  * add ./sql/users.sql
  * add ./sql/applications.sql
  * add ./sql/radarsat2.sql
  * add ./sql/eo1_ali_.sql
  * add ./sql/l8.sql
  
* [OPTIONAL] Download HydroSHEDS DEM and build HAND (Height Above Nearest Drainage) for your Area of Interest
  * Currently built for Haiti area, if this is not your area, change the area... check ./python/hand_all.py
  
  You will need to specify the continent and the 3sec tiles you need for the void filled dem and flow direction.
	* [HydroSHEDS Site](http://earlywarning.usgs.gov/hydrosheds/index.php)
	* [HydroSHEDS data](http://earlywarning.usgs.gov/hydrosheds/dataavail.php)
  
  * When ready, run the processing... it takes about 5-10mn per tile
  * Make sure to edit python/config.py to [re]define the HANDS_AREA
  * hand_all.py -v
  
* Process Radarsat Imagery
  * You will need some Radarsat-2 SGF files expanded in your data directory ../data/radarsat2.  At a minimum, one file should have been copied and expanded by the getdata.sh script
  * cd $MENA_DIR/python
  * radarsat_processing.py --scene RS2_OK33065_PK325251_DK290050_F6F_20120825_230857_HH_SGF -v
  * [OPTIONAL] Add the scene into the database to publish the data
    * load_radarsat2.py --scene RS2_OK33065_PK325251_DK290050_F6F_20120825_230857_HH_SGF -v

## Waterpedia

### OpenStreetMap Format

* [OpenStreetMap] (http://openstreetmap.org)
* [OSM XML](http://wiki.openstreetmap.org/wiki/OSM_XML)
* [Tag Water](http://wiki.openstreetmap.org/wiki/Tag:natural%3Dwater)
* [Key Water](http://wiki.openstreetmap.org/wiki/Key:water)
* Downloading osm.bz2 flood map vectors

### OpenStreetMap Tools

* [JOSM for editing](https://josm.openstreetmap.de/)
* [OSM Tasking Manager for crowdsourcing V&V](http://tasks.hotosm.org/)
  
### Generating a Global Flood Event Record
 
* [Dartmouth Flood Observatory](http://www.dartmouth.edu/~floods/Archives/)
* [Hydros Lab - University of Oklahoma](http://eos.ou.edu/flood/)
* [GitHub for Global Flood Catalog] (https://github.com/vightel/gfc)
* Flood event format - TBD -
* How to clone / sync
 
### Updating Reference Surface Water 

* OpenStreetMap Water Features
* Using JOSM to update water features

## More Floodmaps: EO-1, Landsat-8 and MODIS

### Pre-requisites

* A Login at <http://earthexplorer.usgs.gov/>

### Steps

* Install Python Postgres libraries
  * pip install psycopg2 
  * pip install PPyGIS 
  
* Make sure the tables are installed in database for eo1_ali, l8 and radarsat-2

* Get regional archived scenes for EO1 ALI and Landsat-8 OLI/TIRS in csv format
	* go to http://earthexplorer.usgs.gov/
	* select Search Criteria and use the map
	* Select one data set at a time
	  * EO-1 ALI
	  * Landsat Archive L8 OLI/TIRS
	* Additional criteria < 10% or 20% clouds
	* Hit results and export ALL your result in csv format
	* store csv files in ./data/csv
	* load EO-1 archive 
	  *	load_eo1.py -i XXX.csv
	* load Landsat-8 archive
	  * load_l8.py -i XXX.csv
	  
### Manual Processing of Landsat-8

* Download a Landsat-8 scene
  * Option 1: 
    * Go to: http://earthexplorer.usgs.gov/
	* Login
	* Select and download a Scene
	* Upload it to an S3 bucket, make the file it public and copy it to ~/data/landsat8 using wget
  * Option 2:
    * Get an existing scene from our own S3 and copy it over
	* cd $MENA_DIR_/data/landsat8
	* mkdir ./OutputImages
	* mkdir ./LC80090462013357LGN00
	* cd LC80090462013357LGN00
	* wget "https://s3.amazonaws.com/mena_data/LC80090462013357LGN00.tar.gz"
	* tar -xf LC80090462013357LGN00.tar.gz
	* rm LC80090462013357LGN00.tar.gz
	* cd ..
  * Option 3 - Use Publisher Node (See below)
  
* Process it
	* Generate Composite for V&V [ 4-3-2 for example]
	  * landsat8_composite_toa.py --scene LC80090472013357LGN00 --red 4 --green 3 --blue 2
	  * landsat8_composite_toa.py --scene LC80090472013357LGN00 --red 5 --green 6 --blue 4
	  * landsat8_composite_toa.py --scene LC80090472013357LGN00 --red 7 --green 5 --blue 4
	  
	* Generate water map, vectors and browse image
	  * landsat8_toa_watermap.py --scene LC80090472013357LGN00 -v
	  * landsat8_to_topojson.py --scene LC80090472013357LGN00 -v
	  * landsat8_browseimage.py --scene LC80090472013357LGN00 -v
  
### Manual Processing of MODIS NRT

* [OAS Server] (http://oas.gsfc.nasa.gov/floodmap/)
	* Issues:
		* You don't want a PNG/JPEG
		* GeoTiff is hard to handle and needs to be cleaned up around the coastlines in particular
		* You want data in vector format
		
	* Steps
		* Find your tile of interest, year and day of year
	    * cd $MENA_DIR/python
	    * modis.py -y 2012 -d 234 -t 080W020N -p 2 -v

## Becoming a Open GeoSocial Publisher Node

* What does that mean?
  * Support [OpenSearch] (http://www.opensearch.org/Home)
  * Support Story Telling via [Facebook...] (https://developers.facebook.com/docs/opengraph/overview)
  
### Pre-requisites

* [Mapbox Maps] (https://www.mapbox.com/)
* [Facebook Application ID] )https://developers.facebook.com/)
* [Twitter Application ID] (https://dev.twitter.com/)
* [Pappertrail] (https://papertrailapp.com/)

### Steps

* Set Environment Variables
  * export FACEBOOK_APP_SECRET
  * export FACEBOOK_APP_ID
  * export FACEBOOK_PROFILE_ID
  * export TWITTER_SITE
  * export TWITTER_SITE_ID
  * export TWITTER_CREATOR
  * export TWITTER_CREATOR_ID
  * export TWITTER_DOMAIN
  * export DATABASE_URL
  * export COOKIEHASH

* Customize config.yaml and settings.js (app.sessionSecret)

* Publish the data using a Web Server and visualize on the web
  * cd $MENA_DIR/node
  * npm install
  * node server.js
		
## Becoming a Consumer Node

* [Download Consumer Example](https://github.com/vightel/ojo-doc)
* Register Your Consumer Application
* Connect to Publisher

## GeoApp


