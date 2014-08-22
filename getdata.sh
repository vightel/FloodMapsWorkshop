# Get data from S3 and install in proper directories

# Store Current Directory

if [ ! $MENA_DIR ]; then
	echo "Need to set your MENA_DIR env var";
	exit -1;
fi

if [ ! $DBHOST ]; then
	echo "Need to set your DBHOST env var";
	exit -1;
fi
if [ ! $DBNAME ]; then
	echo "Need to set your DBNAME env var";
	exit -1;
fi
if [ ! $DBOWNER ]; then
	echo "Need to set your DBOWNER env var";
	exit -1;
fi
if [ ! $DBPORT ]; then
	echo "Need to set your DBPORT env var";
	exit -1;
fi
if [ ! $PGPASS ]; then
	echo "Need to set your PGPASS env var";
	exit -1;
fi
if [ ! $DATABASE_URL ]; then
	echo "Need to set your DATABASE_URL env var";
	exit -1;
fi
if [ ! $USGS_ACCOUNT ]; then
	echo "Need to set your USGS_ACCOUNT env var";
	exit -1;
fi
if [ ! $USGS_PASSWORD ]; then
	echo "Need to set your USGS_PASSWORD env var";
	exit -1;
fi


cd $MENA_DIR/data

if [ ! -d HydroSHEDS]; then
  mkdir HydroSHEDS
fi

if [ ! -d HAND]; then
  mkdir HAND
fi

if [ ! -d eo1_ali]; then
  mkdir eo1_ali
fi

if [ ! -d l8]; then
  mkdir l8 
fi

if [ ! -d l8/LC80090472013357LGN00]; then
  mkdir l8/LC80090472013357LGN00
fi

if [ ! -d modis]; then
  mkdir modis
fi

if [ ! -d radarsat2]; then
  mkdir radarsat2
fi

cd $MENA_DIR/data/HAND
if [ ! -d CA ]; then
  wget "https://s3.amazonaws.com/mena_data/CA.zip"
  unzip CA.zip
fi

# Install Landsat8 Data
cd $MENA_DIR/data/l8/LC80090472013357LGN00
if [ ! -f LC80090472013357LGN00.tar.gz ]; then
  wget "https://s3.amazonaws.com/mena_data/LC80090472013357LGN00.tar.gz"
  tar -xvf LC80090472013357LGN00.tar.gz
fi

# Install Radarsat2 data
cd $MENA_DIR/data/radarsat2
if [ ! -f RS2_OK33065_PK325251_DK290050_F6F_20120825_230857_HH_SGF.zip ]; then
  wget "https://s3.amazonaws.com/mena_data/RS2_OK33065_PK325251_DK290050_F6F_20120825_230857_HH_SGF.zip"
  unzip RS2_OK33065_PK325251_DK290050_F6F_20120825_230857_HH_SGF.zip
fi

# Install OSM world_boundaries
cd $MENA_DIR/python
if [ ! -d world_boundaries ]; then
  wget "https://s3.amazonaws.com/mena_data/world_boundaries.zip"
  unzip world_boundaries.zip
fi
