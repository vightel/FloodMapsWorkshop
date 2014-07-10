menatraining
============

MENA Training to generate flood maps from  Radarsat-2 and Landsat-8 scenes

## Steps
* Laptop Prerequisites: 
  * phpAdmin or Navicat to configure database 
  * git
  * Editor (TextMate, XCode, Eclipse, VIM...)
  
* [OPTIONAL] download package onto your local machine or laptop to review scripts locally
  * git clone https://github.com/vightel/menatraining.git 
  
* Create An Amazon web Services (AWS) Account
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
  
* Process Landsat Image (Assuming a FLAASH corrected EPSG:4326 tif file in given Landsat8 directory)
  * cd $MENA_DIR/python
  * landsat8_to_topojson.py --scene LC80090462013357 --vrt haiti_hand.vrt
  * NOTE: 
    * visualize surface_water.json with mapshaper.org or geojson.io
    * visualize surface_water.osm with JOSM to generate a reference water trace
	* xxx.topojson.gz can be served as is by a publisher and rendered on the web using Mapbox.js/D3.js
	
* Process Radarsat Imagery
  * cd $MENA_DIR/python
  * radarsat_processing.py RS2_OK33065_PK325251_DK290050_F6F_20120825_230857_HH_SGF -v
