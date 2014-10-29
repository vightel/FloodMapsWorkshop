var fs = require('fs')

// node set_geojson_property.js --file ../data/frost/2014/275/Level_1_Frost_2014-10-02.tif.geojson --prop frost=1

var filename 	= process.argv[3]
var prop		= process.argv[5].split('=')
var key			= prop[0]
var val			= prop[1]

try {
	var data	= fs.readFileSync(filename)
	var json	= JSON.parse(data)
	
	for( f in json.features) {
		json.features[f].properties[key] = parseFloat(val)
	}

	var str = JSON.stringify(json)
	fs.writeFileSync(filename, str)
} catch(e) {
	console.log("Exception", e)
}

