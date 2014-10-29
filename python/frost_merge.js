// Pat Cappelaere
//
// Merge the geojson frost level files into one file, convert it to topojson and compress it
//
// node frost_merge 2014 275

var fs 			= require('fs');
var path		= require('path');
var exec 		= require('child_process').exec;
var zlib 		= require('zlib');

var gzip 		= zlib.createGzip();

var year	 	= process.argv[2]
var doy			= process.argv[3]

var dir 		= path.join("../data/frost",year, doy)

console.log("Frost processing of ", dir)

function ReadFile( filename) {
	var data	= fs.readFileSync(filename)
	var json	= JSON.parse(data)
	return json
}

var filename1 			= path.join(dir, "geojson", "frost_level_1.geojson")
var filename2 			= path.join(dir, "geojson", "frost_level_2.geojson")
var filename3 			= path.join(dir, "geojson", "frost_level_3.geojson")
var filename4 			= path.join(dir, "geojson", "frost_level_4.geojson")
var filename5 			= path.join(dir, "geojson", "frost_level_5.geojson")

var merge_filename 		= path.join(dir, "geojson", "merged_frost_levels.geojson")
var topojson_filename 	= path.join(dir, "merged_frost_levels.topojson")
var topojsongz_filename	= path.join(dir, "merged_frost_levels.topojson.gz")

var json1 				= ReadFile( filename1)
//console.log("features:", json1.features.length)

function AddFeatures( filename ) {
	var js = ReadFile( filename)
	for( var f in js.features ) {
		var feature = js.features[f]
		console.log(feature)
		json1.features.push(feature)
	}
	//console.log(filename, "features:", json1.features.length)
}


AddFeatures(filename2)
AddFeatures(filename3)
AddFeatures(filename4)
AddFeatures(filename5)

//console.log("features:", json1.features.length)

var str = JSON.stringify(json1)
fs.writeFileSync(merge_filename, str)
console.log("wrote", merge_filename, " with features:", json1.features.length)

var cmd 	= "topojson -p -o "+ topojson_filename + " " + merge_filename
var child 	= exec(cmd, function(error, stdout, stderr) {
	console.log('stdout: ' + stdout);
	console.log('stderr: ' + stderr);
	if (error !== null) {
		console.log('exec error: ' + error);
	} else {
		var inp = fs.createReadStream(topojson_filename);
		var out = fs.createWriteStream(topojsongz_filename);

		inp.pipe(gzip).pipe(out);	
	}
})

