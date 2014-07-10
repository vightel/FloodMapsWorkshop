<!--
Settings for your postgres setup.

Note: feel free to leave password, host, port, or use blank
-->

<Parameter name="type">postgis</Parameter>
<Parameter name="password">osmAdmin1</Parameter>
<Parameter name="host">osmdb.crcholi0be4z.us-east-1.rds.amazonaws.com</Parameter>
<Parameter name="port">5432</Parameter>
<Parameter name="user">osm_admin</Parameter>
<Parameter name="dbname">osmdb</Parameter>
<!-- this should be 'false' if you are manually providing the 'extent' -->
<Parameter name="estimate_extent">true</Parameter>
<!-- manually provided extent in epsg 900913 for whole globe -->
<!-- providing this speeds up Mapnik database queries 
<Parameter name="extent">-20037508,-19929239,20037508,19929239</Parameter>
-->