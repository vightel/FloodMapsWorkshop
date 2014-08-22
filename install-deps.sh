
# update
sudo yum -y update
sudo yum -y upgrade

# enable EPEL6 by changing enabled=0 -> enabled=1
sudo vim /etc/yum.repos.d/epel.repo


# install deps
sudo yum -y install git potrace
sudo yum -y install make gcc47 gcc-c++ bzip2-devel libpng-devel libtiff-devel zlib-devel libjpeg-devel libxml2-devel python-setuptools git-all python-nose python27-devel python27 proj-devel proj proj-epsg proj-nad freetype-devel freetype libicu-devel libicu

# install optional deps
sudo yum -y install postgresql-devel sqlite-devel sqlite libcurl-devel libcurl cairo-devel cairo pycairo-devel pycairo


# Download and Install requirements for PostGIS Installation
# proj4
wget http://download.osgeo.org/proj/proj-4.8.0.tar.gz
gzip -d proj-4.8.0.tar.gz
tar -xvf proj-4.8.0.tar
cd proj-4.8.0
./configure
make
sudo make install
cd ../

# geos
wget http://download.osgeo.org/geos/geos-3.4.2.tar.bz2
bzip2 -d geos-3.4.2.tar.bz2
tar -xvf geos-3.4.2.tar
cd geos-3.4.2 
./configure 
make 
sudo make install 
cd ../

wget http://download.osgeo.org/gdal/1.11.0/gdal-1.11.0.tar.gz
tar -xzf gdal-1.11.0.tar.gz
cd gdal-1.11.0
#wget http://download.osgeo.org/gdal/gdal-1.9.2.tar.gz
#tar -xzf gdal-1.9.2.tar.gz
#cd gdal-1.9.2
./configure --with-python
make
sudo make install

wget http://potrace.sourceforge.net/download/potrace-1.11.tar.gz
tar -xzf potrace-1.11.tar.gz
cd potrace-1.11
./configure
make
sudo make install

JOBS=`grep -c ^processor /proc/cpuinfo`

# build recent boost
export BOOST_VERSION="1_55_0"
export S3_BASE="http://mapnik.s3.amazonaws.com/deps"
curl -O ${S3_BASE}/boost_${BOOST_VERSION}.tar.bz2
tar xf boost_${BOOST_VERSION}.tar.bz2
cd boost_${BOOST_VERSION}
./bootstrap.sh
./b2 -d1 -j${JOBS} \
    --with-thread \
    --with-filesystem \
    --with-python \
    --with-regex -sHAVE_ICU=1  \
    --with-program_options \
    --with-system \
    link=shared \
    release \
    toolset=gcc \
    stage
sudo ./b2 -j${JOBS} \
    --with-thread \
    --with-filesystem \
    --with-python \
    --with-regex -sHAVE_ICU=1 \
    --with-program_options \
    --with-system \
    toolset=gcc \
    link=shared \
    release \
    install
cd ../

# set up support for libraries installed in /usr/local/lib
sudo bash -c "echo '/usr/local/lib' > /etc/ld.so.conf.d/boost.conf"
sudo ldconfig

# mapnik
# stable branch: 2.3.x
git clone https://github.com/mapnik/mapnik -b 2.3.x
cd mapnik
./configure
make
make test-local
sudo make install
cd ../

sudo chown -R ec2-user:ec2-user /usr/local/bin
sudo chown -R ec2-user:ec2-user /usr/local/lib
chmod u+rx,go-w /usr/local/lib/node_modules/

# node
NODE_VERSION="0.10.26"
wget http://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}.tar.gz
tar xf node-v${NODE_VERSION}.tar.gz
cd node-v${NODE_VERSION}
./configure
make -j${JOBS}
sudo make install
cd ../

# install protobuf libs needed by node-mapnik
sudo yum -y install protobuf-devel protobuf-lite

# Then workaround package bugs:
# 1) 'pkg-config protobuf --libs-only-L' misses -L/usr/lib64
# do this to fix:
export LDFLAGS="-L/usr/lib64"
# 2) '/usr/lib64/libprotobuf-lite.so' symlink is missing
# do this to fix:
sudo ln -s /usr/lib64/libprotobuf-lite.so.8 /usr/lib64/libprotobuf-lite.so
# otherwise you will hit: '/usr/bin/ld: cannot find -lprotobuf-lite' building node-mapnik

sudo chown ec2-user /usr/local/lib/node_modules/

# node-mapnik
git clone https://github.com/mapnik/node-mapnik
cd node-mapnik
npm install
npm test
cd ../

# topojson 
# 1.6.14
npm install -g topojson

# osm2pgsql
sudo yum -y install autoconf-2.69-10.8.amzn1.noarch
sudo yum -y install automake-1.13.4-2.14.amzn1.noarch
sudo yum -y install libtool

# ImageMagick (and convert)
sudo yum -y install ImageMagick.x86_64

# osm2pgsql
git clone git://github.com/openstreetmap/osm2pgsql.git
cd osm2pgsql
./autogen.sh 
./configure
make
sudo make install
cd ../

# install numpy and scipy,...
sudo yum -y install gdal-python numpy scipy 
sudo easy_install psycopg2 
sudo easy_install ppygis
 
# update your libraries
sudo su
echo /usr/local/lib >> /etc/ld.so.conf
ldconfig
exit
