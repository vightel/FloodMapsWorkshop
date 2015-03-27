Flood Workshop Training
=======================

How to generate flood maps from  Radarsat-2, MODIS, EO-1, DFO and Landsat-8 imagery...
WaterPedia for flood event mapping and validation
Global Flood Catalog for event recording
Open GeoSocial API for data distribution, visualization, discovery and sharing via social netowrks

Notes: This is not authoritative but work in progress used for capacity building and examples... This is not operational software!

Algorithms have not been formally validated by the science team!

Please become a collaborator and help us improve this repository.

### Copyright

Copyright © 2013  United States Government as represented by the Administrator of the National Aeronautics and Space Administration.  All Other Rights Reserved

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

## Pre-Requisites

* [Watch Presentation and Screencast Video](https://github.com/vightel/FloodMapsWorkshop/blob/master/FloodMappingWorkshop.pptx)

* Register on GitHub.com for an account
  * You will have to send us your handle so we can add you as a collaborator on this project

* Laptop with: 
  * pgAdmin or Navicat (prefered http://www.navicat.com/download/navicat-for-postgresql ) to configure database 
  * [git](http://git-scm.com/downloads)
  * Editor ( [TextMate](http://macromates.com/), OSX XCode, [Eclipse](https://www.eclipse.org/), [VIM](http://www.vim.org/)...)
 
* [OPTIONAL] download package onto your local machine or laptop to review scripts locally
  * git clone https://github.com/vightel/FloodMapsWorkshop.git

* Account on Amazon AWS [you may need a credit card] http://aws.amazon.com/

* Register on [EarthExplorer](http://earthexplorer.usgs.gov/)
 

## Pre-Requisite Steps Prior To Workshop

1. Launch a Virtual Machine on Amazon Elastic Compute Cloud (EC2)  [Instructional Videos](http://aws.amazon.com/training/intro_series/)
  * Select Region East
  * Linux AMI, General Purpose, 64-bit, EBS Root Device Type
  amzn-ami-hvm-2014.03.2.x86_64-ebs (ami-76817c1e)
  m3.large
	
  m3.large, AND Note: we need more than 100GiB storage. Check if this is still an m3.large otherwise will need to [increase](http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-expand-volume.html) volume later
   
  * Create key/pair and store it in local DIR.  Restrict access to key.pem (chmod 600 key.pem)
  * Remember Instance ID and Public DNS (Check your Management Console if necessary)
  * You can use SFTP to copy files back and forth your VI (like Featurestch on MacOSX)
    * cd ~/.ssh
	* vi config
	* Add an entry for your VI Host name and add an IdentityFile pointing to your .pem
	
2. Create an Amazon Relational Database Service (RDS) Instance to Store OSM data (Water Reference)
  *	Postgresql, 9.3.3, db.m1.large, No, 20GB Storage
  * DBNAME: osmdb
  * DBOWNER: osm_admin
  * PGPASS: osmAdmin1XXX	# USE YOURS - THIS WILL NOT WORK
  * Edit security group to have enough security access to communicate via TCP
  * Using Navicat (or phpAdmin) Connect to osmdb database.  Select and Open console
    * osmdb# create extension postgis;
    * osmdb# create extension fuzzystrmatch;
    * osmdb# create extension postgis_tiger_geocoder;
    * osmdb# create extension postgis_topology;

3. While at it, add database tables if you are going to use the Publisher (Node Application)
  * add ./sql/users.sql
  * add ./sql/applications.sql
  * add ./sql/radarsat2.sql
  * add ./sql/eo1_ali.sql
  * add ./sql/l8.sql
  * add ./sql/dfo.sql
  
4. cd DIR where key.pem is
  * To Access your instance [remember your public DNS], use Connect Tab Menu to get actual direction and use proper user name
  * ssh -i AWS.pem ec-user2@54.164.10.133
  
5. Set your environment variables on Virtual Instance...[remember your endpoint]
  * export DBHOST=osmdb.crcholi0be4z.us-east-1.rds.amazonaws.com
  * export DBNAME=osmdb
  * export DBOWNER=osm_admin
  * export DBPORT=5432
  * export PGPASS=osmAdmin1XXX	# USE YOURS - THIS WILL NOT WORK
  * export DATABASE_URL="tcp://osm_admin:osmAdmin1@osmdb.crcholi0be4z.us-east-1.rds.amazonaws.com:5432/osmdb"
  * export USGS_ACCOUNT=
  * export USGS_PASSWORD=

  * Note: We recommend to customize envs.copy.sh with your own values to envs.sh and then > source envs.sh and make sure this gets done automatically when you login by changing your .profile
  * Please make sure that . is in your PATH
  
6. Install Code Dependencies
  * git clone https://github.com/vightel/FloodMapsWorkshop.git
  * cd FloodMapsWorkshop
  * export WORKSHOP_DIR=~/FloodMapsWorkshop

  * It is advisable to run the shell file below step by step to check on potential errors while loading and building code/libraries
  * sh install-deps.sh
  
7. Install data dependencies... This will copy some data from S3 to your data directory for testing
  * sh getdata.sh
  [Note: This needs to be updated for RCMRD and ICIMOD workshops]

8. Verify Database dependencies and environment variables
  * cd $WORKSHOP_DIR/python
  * Check python configuration file: config.py
  * Check database settings: ./inc/datasource-settings.xml.inc
  * Check python environment, run:
	* check_environment.py
	
  * Make sure AGAIN that . is in PATH to find the python scripts (if not, edit your .bashrc or .profile)
	
9. Download OSM data files and load OSM database
  * You may have to get OSM data from your particular area from http://download.geofabrik.de/ and edit the shell file below.
  * cd ./data/osm
  * sh load_all.sh
  
10. Download HydroSHEDS DEM and build HAND (Height Above Nearest Drainage) for your Area of Interest
  * Currently built for Haiti area, if this is not your area, change the area... check ./python/hand_all.py
  
  You will need to specify the continent and the 3sec tiles you need for the void filled dem and flow direction.
	* [HydroSHEDS Site](http://earlywarning.usgs.gov/hydrosheds/index.php)
	* [HydroSHEDS data](http://earlywarning.usgs.gov/hydrosheds/dataavail.php)
  
  * When ready, run the processing... WARNING: it takes about 1hr or more per tile
  * Make sure to edit python/config.py to [re]define the HANDS_AREA
  * make sure that your HydroSHEDS and HAND folders are created before you start (../data/HAND/CA for example if CA is your continent).
  * hand_all.py -v
  
  * HAND Seams
    There is a notorious problem with HAND while processing tiles.  It is near impossible to propagate HAND propagation across tiles.  To address this issue, we are reprocessing HAND over the seams using a one degree overlap.
    You will need to customize the script: hand_overlap.py for your regional area tiles and seams and then run the script
  
  [Notes] You may have to set your local machine so you can FTP and ssh to your instance and use your own PEM file.
  
  I have to setup my .ssh/config this way:
  
  Host <name>
    HostName 54.164.139.253
    User ec2-user
    IdentityFile <full path name to PEM file>
    ServerAliveInterval 300
    ServerAliveCountMax 2

11. [OPTIONAL] For Namibia Test scenes...
  * From USGS
    * EO-1          EO1A1760722013027110KF_1T
    * Landsat-8     LC81740722014140LGN00
    * Radardat-2    RS2_OK37182_PK361606_DK319629_F1N_20130119_040305_HH_HV_SGF
    * MODIS         2014 140 020E010S
    * DFO           N/A
    * PALSAR2       N/A
    * DigitalGlobe  N/A
    * Frost
    * VIIRS
    
## Next... Workshop

* Process Radarsat Imagery
  * You will need some Radarsat-2 SGF files expanded in your data directory ../data/radarsat2.  At a minimum, one file should have been copied and expanded by the getdata.sh script
  * cd $WORKSHOP_DIR/python
  * radarsat_processing.py --scene RS2_OK33065_PK325251_DK290050_F6F_20120825_230857_HH_SGF -v
  * [OPTIONAL] Add the scene into the database to publish the data
    * load_radarsat2.py --scene RS2_OK33065_PK325251_DK290050_F6F_20120825_230857_HH_SGF -v

* Visualizing Results
  * TIFF file can be visualized in Preview
  * [geoson.io](http://geojson.io/)
  * [mapshaper.org](http://www.mapshaper.org/)
  * Javascript Libraries: [Mapbox.js](https://www.mapbox.com/mapbox.js/api/v2.0.0/) [d3.js](http://d3js.org/) [Leaflet.js](http://leafletjs.com/)
  * Using Mapbox Studio
  
## Waterpedia

### OpenStreetMap Format 

* [OpenStreetMap] (http://openstreetmap.org)
* [OSM XML](http://wiki.openstreetmap.org/wiki/OSM_XML)
* [Tag Water](http://wiki.openstreetmap.org/wiki/Tag:natural%3Dwater)
* [Key Water](http://wiki.openstreetmap.org/wiki/Key:water)

* Downloading surface_water.osm.bz2 flood map vectors

### OpenStreetMap Tools

* [JOSM for editing](https://josm.openstreetmap.de/)
* [OSM Tasking Manager for crowdsourcing V&V](http://tasks.hotosm.org/)
  
### Updating Reference Surface Water

* OpenStreetMap Water Features
* Using JOSM to update water features
* Connect to OpenStreetMap RunTime Server

### Generating a Global Flood Event Record
 
* [Dartmouth Flood Observatory](http://www.dartmouth.edu/~floods/Archives/)
* [Hydros Lab - University of Oklahoma](http://eos.ou.edu/flood/)
* [GitHub for Global Flood Catalog] (https://github.com/vightel/gfc)
* Flood event format - TBD -
* How to clone / sync the Global Database Repository

## More Floodmaps: EO-1, Landsat-8, DFO and MODIS

### Pre-Requisites

* An Account on <http://earthexplorer.usgs.gov/>

### Steps
  
* Make sure the tables are installed in database for eo1_ali, l8 and radarsat-2

* Get regional archived scenes for EO1 ALI and Landsat-8 OLI/TIRS in csv format
	* go to http://earthexplorer.usgs.gov/
	* select Search Criteria and use the map
	* Select one data set at a time
	  * EO-1 ALI
	  * Landsat Archive L8 OLI/TIRS
	* Additional criteria < 10% clouds
	* Hit results and export ALL your result in csv format
	* store csv files in ./data/csv
	* cd $WORKSHOP_DIR/csv
	* load EO-1 archive 
	  *	load_eo1.py -i XXX.csv
	* load Landsat-8 archive
	  * load_l8.py -i XXX.csv

### [Optional] Manual Processing of EO-1
* Download a EO-1 ALI scene
  * Option 1: 
    * Go to: http://earthexplorer.usgs.gov/
	* Login
	* Select and download a EO-1 ALI Scene, not too cloudy <10% or less
	* Upload it to an S3 bucket, make the file it public and copy it to ~/data/eo1-ali using wget
  * Option 2:
    * Get an existing scene from our own S3 and copy it over
	* cd $WORKSHOP_DIR/data/eo1_ali
	* mkdir ./EO1A0090472014197110P0_SG1_01
	* cd EO1A0090472014197110P0_SG1_01
	* wget "https://s3.amazonaws.com/mena_data/EO1A0090472014197110P0_SG1_01.tgz"
	* tar -xf EO1A0090472014197110P0_SG1_01.tgz
	* rm EO1A0090472014197110P0_SG1_01.tgz
	* cd ..
  * Option 3 - Use Publisher Node (See below)

* Process it
	* Generate Composite for V&V [ 5-4-3 for example]
	  * eo1_ali_composite.py --scene EO1A0090472014197110P0_SG1_01 --red 5 --green 4 --blue 3
	* Generate Cloud Mask
	  * eo1_ali_cloudmask.py --scene EO1A0090472014197110P0_SG1_01
	* Generate Water map
	  * eo1_ali_watermap.py --scene EO1A0090472014197110P0_SG1_01
	* Generate Flood vectors
	  * eo1_to_topojson.py --scene EO1A0090472014197110P0_SG1_01
	* Generate BrowseImage
	  * eo1_ali_browseimage.py --scene EO1A0090472014197110P0_SG1_01

### [Optional] Manual Processing of Landsat-8

* Download a Landsat-8 scene
  * Option 1: 
    * Go to: http://earthexplorer.usgs.gov/
	* Login
	* Select and download a Scene
	* Upload it to an S3 bucket, make the file it public and copy it to ~/data/l8 using wget
  * Option 2:
    * Get an existing scene from our own S3 and copy it over
	* cd $WORKSHOP_DIR/data/l8
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
 
### [Optional] Manual Processing of MODIS NRT

* Download From the [OAS Server] (http://oas.gsfc.nasa.gov/floodmap/)
	* Issues:
		* You don't want a PNG/JPEG
		* GeoTiff is hard to handle and needs to be cleaned up around the coastlines in particular
		* You want data in vector format
		
	* Steps
		* Find your tile of interest (2-day product), year and day of year and download it to ~/data/modis/YYYY/doy/TILE
		* cd $WORKSHOP_DIR/python
		* modis.py -y 2012 -d 234 -t 080W020N -p 2 -v

* Or use the Publisher Node to do it on-demand

### [Optional] Manual Processing of DFO GeoTIFF

* Geotiff From the [Flood Observatory] (http://floodobservatory.colorado.edu/)
	* Issues:
		* You don't want a PNG/JPEG
		* GeoTiff is hard to handle and needs to be cleaned up around the coastlines in particular
		* You want data in vector format
		
	* Steps
		* cd $WORKSHOP_DIR/python
        * Assuming a scene geotiff and jpg in dfo directory
        * Assuming that they have been renamed properly (see below)
		* dfo_watermap.py -v --scene 20140921_Bangladesh_4178
        * load_dfo --scene 20140921_Bangladesh_4178

## Becoming an Open GeoSocial Publisher Node

* What does that mean?
  * Support [OpenSearch] (http://www.opensearch.org/Home)
  * Support Story Telling via [Facebook...] (https://developers.facebook.com/docs/opengraph/overview)
  

### Pre-Requisites

* [Node.js](http://nodejs.org/)
	This is the Javascript environment used to develop the server code.

* [Facebook Application ID] (https://developers.facebook.com/)
	You will need to create a Facebook application, get an id and secret to publish flood data

* [Twitter Application ID] (https://dev.twitter.com/)
	You will need to create a Twitter Application to tweet your products on the web... You will need to get the publisher up and going... then get your site approved to publish Twitter cards
	
* [Mapbox Maps] (https://www.mapbox.com/)
	Mapbox is used for the background maps.  The service is very inexpensive.  The Company develops all of its code open source.  It woudl be great to support it.
	
* [Papertrail] (https://papertrailapp.com/)
	I used papertrail to keep the web logs... not a requirement but pretty nice to have.
	
### Steps

* Set Environment Variables
	* Facebook Application Data
	  * export FACEBOOK_APP_SECRET=
	  * export FACEBOOK_APP_ID=
	  * export FACEBOOK_PROFILE_ID=
	* Twitter Application Data
	  * export TWITTER_SITE=
	  * export TWITTER_SITE_ID=
	  * export TWITTER_CREATOR=
	  * export TWITTER_CREATOR_ID=
	  * export TWITTER_DOMAIN=
	  * export DATABASE_URL=
	* Node Secret for Session Protection
	  * export COOKIEHASH=

* Customize config.yaml and settings.js

* Publish the data using a Web Server and visualize on the web
  * cd $WORKSHOP_DIR/node
  * npm install
  * node server.js
		
* Demo Script
	* OpenSearch Radarsat-2, EO-1, Landsat-8, MODIS
	* Visualize data on the map (example)
	* Product Page and Tagging
	* Share on Facebook / Twitter
	* Application Registration
	
## Becoming an Open GeoSocial Consumer Node

* [Download Consumer Example](https://github.com/vightel/ojo-doc)
* Register Your Consumer Application
* Connect to Publisher

## GeoApp

Coming Soon...

## Special Discussion Topics
* Identity using [Persona](https://www.mozilla.org/en-US/persona/) and/or [Auth0](https://auth0.com/) or [OAuth.io](https://oauth.io/)
* Securing web transactions using [Hawk](https://github.com/hueniverse/hawk)
* Optimization of Flood Map Algorithms: Haze and Cloud Shadow Removal 
* How To Change the Flood Mapping Algorithm
* Atmospheric Correction for EO-1, Landsat-8 using FLAASH or [arcsi](http://spectraldifferences.wordpress.com/2014/05/27/arcsi/)
* More products using the Web Coverage Processing Service (WCPS)
* Irradiance Values for Top of Atmposphers Reflectance
* Calculating Landsat-8 TOA Reflectance
* Radarsat-2 [Ordering](http://www.asc-csa.gc.ca/eng/satellites/radarsat2/order-contact.asp) and [Archive](https://neodf.nrcan.gc.ca/neodf_cat3/index.php?lang=en) Browsing
* Radarsat-2 Co-registration - [PCI Geomatics](http://www.pcigeomatics.com/)
* EO-1 L1T / L1G Co-registration
* [MapboxGL](https://www.mapbox.com/blog/mapbox-gl/) and Vector Tiling (.pbf)
