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
  * Linux AMI, General Purpose, m3.large
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
  * ssh -i key.pem ec2-user@ec2-54-88-102-173.compute-1.amazonaws.com
  
* Set your envs... something like...[remember your Endpoint]
  * EXPORT DBHOST=osmdb.crcholi0be4z.us-east-1.rds.amazonaws.com
  * EXPORT DBNAME=osmdb
  * EXPORT DBOWNER=osm_admin_
  * EXPORT DBPORT=5432
  * EXPORT PGPASS=osmAdmin1

* Install dependencies, code and data
  * git clone https://github.com/vightel/menatraining.git
  * cd menatraining
  * EXPORT MENA_DIR=~/menatraining
  * sh install-deps.sh
  * sh getdata.sh

* Verify Database dependencies
  * cd $MENA_DIR/python
  * Check database settings: ./inc/datasource-settings.xml.inc

* [OPTIONAL] Download OSM data files and load OSM database
  * cd ./data/osm
  * sh load_all.sh

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
	* wget "https://s3.amazonaws.com/mena_data/LC80090462013357LGN00.tar.gz"
	* tar -xf LC80090462013357LGN00.tar.gz
	* mkdir LC80090462013357LGN00
	* mv *.TIF LC80090462013357LGN00
	* mv *.txt LC80090462013357LGN00
	* mkdir ./OutputImages
	* Conversion to Radiance
	  * arcsi.py -s ls8 -f KEA --stats -p RAD -o ./OutputImages -i LC80090462013357LGN00/LC80090462013357LGN00_MTL.txt

	  !!! TO COMPLETE HERE
	  
* Process Landsat Image (Assuming a FLAASH corrected EPSG:4326 tif file in given Landsat8 directory)
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