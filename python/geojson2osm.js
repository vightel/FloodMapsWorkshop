// Pat Cappelaere
//
// Takes a geojson file and converts it to OSM XML
//
var osm_geojson = require('./osm_geojson.js');
var fs	= require('fs');

var input	= process.argv[2]

//var source	= process.argv[3]
//var date		= undefined

// if( process.argv.length > 4) date = process.argv[4]

console.log( "Converting:", input, " to OSM...")

fs.readFile(input, function (err, data) {
	if (err) throw err;
	var json = JSON.parse(data)
	
	// Note:
	//   Source and date should be applied to the changeset rather than the object
	var properties = {
		'natural':'water'
//		'source': source
	}
	
//	if( date ) properties['source:date'] = date
	
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