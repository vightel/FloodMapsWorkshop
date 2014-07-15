menatraining
============

MENA Training to generate flood maps from  Radarsat-2 and Landsat-8 scenes

## Steps

* Laptop Prerequisites: 
  * phpAdmin or Navicat to configure database 
  * git
  * Editor (TextMate, XCode, Eclipse, VIM...)
 
* Register on GitHub.com for an account
  * You may have to send us your handle to become part of the collaborators
  
* [OPTIONAL] download package onto your local machine or laptop to review scripts locally
  * git clone https://github.com/vightel/menatraining.git 
  
* Create An Amazon Web Services (AWS) Account
* Launch a Virtual Machine on Amazon Elastic Compute Cloud (EC2)
  * Select Region East
  * Linux AMI, General Purpose, m3.large, Note: we need ~ 100GiB storage check if this is still an m3.large otherwise will need to increase volume later
  * Create key/pair and store it in local DIR.  Restrict access to key.pem (chmod 600 key.pem)
  * Remember Instance ID and Public DNS (Check your Management Console if necessary)

* [OPTIONAL] Create an Amazon Relational Database Service (RDS) Instance to Store OSM data (Water Reference)
  *	Postgresql, 9.3.3, db.m1.small, No, 5GB
  * DBNAME: osmdb
  * DBOWNER: osm_admin
  * PGPASSWORD: osmAdmin1
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
  * export DBHOST=osmdb.crcholi0be4z.us-east-1.rds.amazonaws.com
  * export DBNAME=osmdb
  * export DBOWNER=osm_admin_
  * export DBPORT=5432
  * export PGPASS=osmAdmin1

* Install dependencies, code and data
  * git clone https://github.com/vightel/menatraining.git
  * cd menatraining
  * export MENA_DIR=~/menatraining
  * sh install-deps.sh
  * sh getdata.sh

* Verify Database dependencies
  * cd $MENA_DIR/python
  * Check database settings: ./inc/datasource-settings.xml.inc

* [OPTIONAL] Download OSM data files and load OSM database
  * cd ./data/osm
  * sh load_all.sh
  * Add tables if you are going to use the OJO Publisher (Node Application)
    * add ./sql/users.sql
	* add ./sql/applications.sql

* [OPTIONAL] Download HydroSHEDS DEM and build HAND for haiti area
  * Build for Haiti area, if not change the area... check hand_all.py_
  * hand_all.py -a haiti -v
  
* Install miniconda for python 2.7 (default here)
  * cd ~
  * wget "http://repo.continuum.io/miniconda/Miniconda-3.5.5-Linux-x86_64.sh"
  * bash Miniconda-3.5.5-Linux-x86_64.sh
  * Use all defaults... this will create ~/miniconda
  
* Create a Python 3 environment to atmospherically correct landsat-8 data
  * restart a new terminal to get access to conda
  * conda create -n arcsi python=3
  * source activate arcsi
  * conda install -c https://conda.binstar.org/osgeo arcsi tuiview
  * export GDAL_DRIVER_PATH=~/miniconda/envs/arcsi/gdalplugins
  * export GDAL_DATA=~/miniconda/envs/arcsi/share/gdal
  
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

* Atmospheric Correction of Landsat Image
	* Conversion to Radiance [Note: This might not be necessary]
	  * arcsi.py -s ls8 -f KEA --stats -p RAD -o ./OutputImages -i LC80090462013357LGN00/LC80090462013357LGN00_MTL.txt
	* Conversion to Top of Atmosphere Reflectance [Note: This might not be necessary]
	  * arcsi.py -s ls8 -f KEA --stats -p RAD TOA -o ./OutputImages -i LC80090462013357LGN00/LC80090462013357LGN00_MTL.txt
	* Convert to Surface Reflectance
	  * arcsi.py -s ls8 -f KEA --stats -p RAD SREFSTDMDL --aeropro Continental --atmospro MidlatitudeSummer --aot 0.25 -o ./OutputImages -i LC80090462013357LGN00/LC80090462013357LGN00_MTL.txt
	* Convert to tif to avoid requiring KEA Driver if you want to download file to another machine - also reproject to ESPG:4326 while at it 
	  * gdalwarp -of GTIFF -t_srs EPSG:4326 ./OutputImages/LS8_20131223_lat20lon7253_r46p9_rad_srefstdmdl.kea ./OutputImages/LS8_20131223_lat20lon7253_r46p9_rad_srefstdmdl.tif  
	* Copy back to scene folder and rename it
	  * mv ./OutputImages/LS8_20131223_lat20lon7253_r46p9_rad_srefstdmdl.tif LC80090462013357LGN00/LC80090462013357LGN00_SREF.tif
	  
	* Same for other scene [optional]
	  * arcsi.py -s ls8 -f KEA --stats -p RAD SREFSTDMDL --aeropro Continental --atmospro MidlatitudeSummer --aot 0.25 -o ./OutputImages -i LC80090472013357LGN00/LC80090472013357LGN00_MTL.txt
	  * gdalwarp -of GTIFF -t_srs EPSG:4326 ./OutputImages/LS8_20131223_lat19lon7286_r47p9_rad_srefstdmdl.kea ./LC80090472013357LGN00/LC80090472013357LGN00_SREF.tif
	  
	* Reproject BQA band
	  * gdalwarp -t_srs EPSG:4326 ./LC80090472013357LGN00/LC80090472013357LGN00_BQA.tif ./LC80090472013357LGN00/LC80090472013357LGN00_BQA_4326.tif
	  	  
	* Generate Composite for V&V [ 4-3-2 and rest optional]
	  * landsat_composite.py --scene LC80090472013357LGN00 --red 4 --green 3 --blue 2
	  * landsat_composite.py --scene LC80090472013357LGN00 --red 5 --green 6 --blue 4
	  * landsat_composite.py --scene LC80090472013357LGN00 --red 7 --green 5 --blue 4
	  
	* Generate water map, vectors and browse image
	  * landsat8_watermap.py --scene LC80090472013357LGN00 -v
	  * landsat8_to_topojson.py --scene LC80090472013357LGN00 --vrt haiti_hand.vrt -v
	  * landsat8_browseimage.py --scene LC80090472013357LGN00 -v
	  
* Process Landsat Image (Assuming a atmospherically corrected EPSG:4326 tif file in given Landsat8 directory)
  * cd $MENA_DIR/python
  * landsat8_to_topojson.py --scene LC80090462013357 --vrt haiti_hand.vrt
  * NOTE: 
    * visualize surface_water.json with mapshaper.org or geojson.io
    * visualize surface_water.osm with JOSM to generate a reference water trace

* Process Radarsat Imagery
  * cd $MENA_DIR/python
  * radarsat_processing.py RS2_OK33065_PK325251_DK290050_F6F_20120825_230857_HH_SGF -v

* Process MODIS Imagery
  * cd $MENA_DIR/python
  * modis.py -y 2012 -d 234 -t 080W020N -p 2 -v

* Publish the data using a Web Server and visualize on the web
  * cd $MENA_DIR/node
  * npm install
  * node server.js