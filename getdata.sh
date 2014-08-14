# Get data from S3 and install in proper directories

# Store Current Directory

# Install HydroSHEDS files
cd $MENA_DIR/data

mkdir HydroSHEDS
mkdir HAND
mkdir eo1_ali
mkdir l8
mkdir l8/LC80090472013357LGN00
mkdir modis
mkdir radarsat2

cd $MENA_DIR/data/HAND
wget "https://s3.amazonaws.com/mena_data/CA.zip"
unzip CA.zip

# Install Landsat8 Data
cd $MENA_DIR/data/l8/LC80090472013357LGN00
wget "https://s3.amazonaws.com/mena_data/LC80090472013357LGN00.tar.gz"
tar -xvf LC80090472013357LGN00.tar.gz

# Install Radarsat2 data
cd $MENA_DIR/data/radarsat2
wget "https://s3.amazonaws.com/mena_data/RS2_OK33065_PK325251_DK290050_F6F_20120825_230857_HH_SGF.zip"
unzip RS2_OK33065_PK325251_DK290050_F6F_20120825_230857_HH_SGF.zip

# Install OSM world_boundaries
cd $MENA_DIR/python
wget "https://s3.amazonaws.com/mena_data/world_boundaries.zip"
unzip world_boundaries.zip

