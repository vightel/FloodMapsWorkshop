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
	  
	* Reproject BQA band [Not necessary anymore]
	  * gdalwarp -t_srs EPSG:4326 ./LC80090472013357LGN00/LC80090472013357LGN00_BQA.tif ./LC80090472013357LGN00/LC80090472013357LGN00_BQA_4326.tif
	  	  
	* Generate Composite for V&V [ 4-3-2 and rest optional]
	  * landsat8_composite_toa.py --scene LC80090472013357LGN00 --red 4 --green 3 --blue 2
	  * landsat8_composite_toa.py --scene LC80090472013357LGN00 --red 5 --green 6 --blue 4
	  * landsat8_composite_toa.py --scene LC80090472013357LGN00 --red 7 --green 5 --blue 4
	  
	* Generate water map, vectors and browse image
	  * landsat8_toa_watermap.py --scene LC80090472013357LGN00 -v
	  * landsat8_to_topojson.py --scene LC80090472013357LGN00 --vrt haiti_hand.vrt -v
	  * landsat8_browseimage.py --scene LC80090472013357LGN00 -v
	  
* Process Landsat Image (Assuming a atmospherically corrected EPSG:4326 tif file in given Landsat8 directory)
  * cd $MENA_DIR/python
  * landsat8_to_topojson.py --scene LC80090462013357 --vrt haiti_hand.vrt
  * NOTE: 
    * visualize surface_water.json with mapshaper.org or geojson.io
    * visualize surface_water.osm with JOSM to generate a reference water trace

* Process MODIS Imagery
  * cd $MENA_DIR/python
  * modis.py -y 2012 -d 234 -t 080W020N -p 2 -v
