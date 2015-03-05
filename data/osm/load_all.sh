#!/bin/sh
#set -e

# Generate the Postgres Database and ingest the osm files
# Assumption: osm2pgsql has been installed 
# POSTGRES / POSTGIS have been installed
# OSM Files have been downloaded from cloudmade
# Postgres database user and database name

# Check for required environmnet variables
if [ -z "$DBNAME" ]; then
    echo "Need to export OSM DBNAME env"
    exit 1
fi 

if [ -z "$DBHOST" ]; then
    echo "Need to export OSM DBHOST env"
    exit 1
fi 

if [ -z "$DBOWNER" ]; then
    echo "Need to export OSM DBOWNER env"
    exit 1
fi 

if [ -z "$DBPORT" ]; then
    echo "Need to set OSM DBPORT env"
    exit 1
fi 

if [ -z "$PGPASS" ]; then
    echo "Need to set OSM PGPASS env"
    exit 1
fi 

echo "envs correct..."

#
# load OSM files from GeoFabrik
#

if [ ! -f ./central-america-latest.osm.bz2 ]; then
	wget "http://download.geofabrik.de/central-america-latest.osm.bz2"
fi

# wget "http://download.geofabrik.de/africa/egypt-latest.osm.bz2"
# wget "http://download.geofabrik.de/africa/morocco-latest.osm.bz2"

#if [ ! -f ./south-america-latest.osm.bz2 ]; then
#	wget "http://download.geofabrik.de/south-america-latest.osm.bz2"
#fi

#if [ ! -f ./africa-latest.osm.bz2 ]; then
#	wget "http://download.geofabrik.de/africa-latest.osm.bz2"
#fi

#export STYLE="default.style"
export STYLE="water.style"

export CACHESIZE=2400
export NUM_PROCESSES=4

# note CACHESIZE might be too large on Joyent machine... use 1200
osm2pgsql -c -G -H $DBHOST -U $DBOWNER  -d $DBNAME  --port $DBPORT -S $STYLE -C $CACHESIZE   ./central-america-latest.osm.bz2
#osm2pgsql -a -G -H $DBHOST -U $DBOWNER  -d $DBNAME  --port $DBPORT -S $STYLE -C $CACHESIZE   ./south-america-latest.osm.bz2
#osm2pgsql -c -G -H $DBHOST -U $DBOWNER  -d $DBNAME  --port $DBPORT -S $STYLE  -C $CACHESIZE  ./africa-latest.osm.bz2
#osm2pgsql -a -G -H $DBHOST -U $DBOWNER  -d $DBNAME  --port $DBPORT -S $STYLE  -C $CACHESIZE  ./egypt-latest.osm.bz2
#osm2pgsql -a -G -H $DBHOST -U $DBOWNER  -d $DBNAME  --port $DBPORT -S $STYLE  -C $CACHESIZE  ./morocco-latest.osm.bz2

# verify that it works
# python generate_image.py --mapfile osm.xml --name /Volumes/MacBay3/HAND/HydroSHEDS/CA/n10w065/n10w065_water_image.tif --bbox -65.000000 9.999635 -59.999621 15.000000 --img 5927 6073

# troubleshooting
# query: select st_astext(way) from planet_osm_point where osm_id=617528487;
