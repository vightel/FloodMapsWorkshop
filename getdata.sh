# Get data from S3 and install in proper directories

# Store Current Directory
mena=$(pwd)

# Install HydroSHEDS files
cd $mena/data/HydroSHEDS
wget "https://s3.amazonaws.com/mena_data/CA.zip"
gunzip CA.zip

# Install Landsat8 Data
cd $mena/data/landsat8/LC80090462013357
wget "https://s3.amazonaws.com/mena_data/LC80090462013357.tif"

# Install Radarsat2 data
cd $mena/data/radarsat2
wget "https://s3.amazonaws.com/mena_data/RS2_OK33065_PK325251_DK290050_F6F_20120825_230857_HH_SGF.zip"
gunzip RS2_OK33065_PK325251_DK290050_F6F_20120825_230857_HH_SGF.zip

wget "https://s3.amazonaws.com/mena_data/RS2_OK33065_PK325252_DK290051_F6F_20120825_230903_HH_SGF.zip"
gunzip RS2_OK33065_PK325252_DK290051_F6F_20120825_230903_HH_SGF.zip

# Install OSM world_boundaries
cd $mena/python
wget "https://s3.amazonaws.com/mena_data/world_boundaries.zip"
gunzip world_boundaries.zip

