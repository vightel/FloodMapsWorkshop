// Pat Cappelaere
//
// Takes a geojson file and converts it to OSM XML
//
var osm_geojson = require('./osm_geojson.js');
var fs	= require('fs');

var input	= process.argv[2]
var source	= process.argv[3]

console.log( "Converting:", input, " to OSM...", "with source:", source )

fs.readFile(input, function (err, data) {
	if (err) throw err;
	var json = JSON.parse(data)
	
	var properties = {
		'natural':'water',
		'source': source
	}
	
	for( var f in json.features ) {
		json.features[f].properties = properties
	}
	
	var str = osm_geojson.geojson2osm(json)
	
	var output	= input.replace(".json", ".osm")
	
	//console.log(str)
	fs.writeFile(output, str, function (err) {
	  if (err) throw err;
	  console.log('It\'s saved!', output);
	});
});