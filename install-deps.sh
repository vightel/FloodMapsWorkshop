
# update
sudo yum -y update
sudo yum -y upgrade

# enable EPEL6 by changing enabled=0 -> enabled=1
sudo vim /etc/yum.repos.d/epel.repo

# install deps
sudo yum -y install make gcc47 gcc-c++ bzip2-devel libpng-devel libtiff-devel zlib-devel libjpeg-devel libxml2-devel python-setuptools git-all python-nose python27-devel python27 proj-devel proj proj-epsg proj-nad freetype-devel freetype libicu-devel libicu

# install optional deps
sudo yum -y install gdal-devel gdal postgresql-devel sqlite-devel sqlite libcurl-devel libcurl cairo-devel cairo pycairo-devel pycairo

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

# node-mapnik
git clone https://github.com/mapnik/node-mapnik
cd node-mapnik
npm install
npm test
cd ../

# tilemill
git clone https://github.com/mapbox/tilemill
cd tilemill
vim package.json # remove the 'topcube' line since the GUI will not work on fedora due to lacking gtk/webkit
npm install
./index.js --server=true # view on http://localhost:20009, more info: http://mapbox.com/tilemill/docs/guides/ubuntu-service/
