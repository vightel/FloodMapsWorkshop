menatraining
============

MENA Training to generate flood maps from  Radarsat-2 and Landsat-8 scenes

## Steps

* git clone https://github.com/vightel/menatraining.git
  * set MENA_DIR env to proper directory
  * EXPORT MENA_DIR=./menatraining
  * cd $MENA_DIR
  

* Create An Amazon web Services (AWS) Account
* Launch a Virtual Machine on Amazon Elastic Compute Cloud (EC2)
  * Select Region East
  * Linux AMI, General Purpose, m3.large
  * Create key/pair and store it in your local MENA_DIR.  Restrict access to key.pem (chmod 600 key.pem)
  * Remember Instance ID and Public DNS (Check your Management Console if necessary)

* Create an Amazon Relational Database Service (RDS) Instance
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

* cd $MENA_DIR where key.pem is
* Access your instance [remember your public DNS]: 
  * > ssh -i key.pem ec2-user@ec2-54-88-102-173.compute-1.amazonaws.com
  
* Set your envs... something like...[remember your Endpoint]
  * EXPORT DBHOST=osmdb.crcholi0be4z.us-east-1.rds.amazonaws.com
  * EXPORT DBNAME=osmdb
  * EXPORT DBOWNER=osm_admin_
  * EXPORT DBPORT=5432
  * EXPORT PGPASS=osmAdmin1

* Install code dependencies:
  * sh install-deps.sh 

* Download OSM data files and load OSM database
  * cd ./data/osm
  * sh load_all.sh

* Download HydroSHEDS DEM and build HAND for haiti area
  * cd $MENA_DIR/python
  * Customize with database settings: ./inc/datasource-settings.xml.inc
  * Build for Haiti area, if not change the area... check hand_all.py_
  * hand_all.py -a haiti -v
  
* Process Landsat Image (Assuming a FLAASH corrected EPSG:4326 tif file in gieven Landsat8 directory)
  * cd $MENA_DIR/python
  * landsat8_to_topojson.py --scene LC80090462013357 --vrt haiti_hand.vrt
  * NOTE: 
    * visualize surface_water.json with mapshaper.org or geojson.io
    * visualize surface_water.osm with JOSM to generate a reference water trace
	* xxx.topojson.gz can be server as is by product publisher and rendered on the web using Mapbox.js/D3.js
	
* Process Radarsat Imagery
  * cd $MENA_DIR/data/radarsat2
  * tar xvf *.zip
  * cd $MENA_DIR/python
  
  * radarsat_processing.py RS2_OK33065_PK325251_DK290050_F6F_20120825_230857_HH_SGF -v
