var fs		= require('fs');
var path 	= require('path');

// Get the filename
var fileName = process.argv[2]

fs.readFile(fileName, 'utf8', function (err, data) {
	if (err) {
	console.log('Error: ' + err);
	return;
	}
 
	var featureCollection = JSON.parse(data);
	var features = featureCollection.features
	
	for( var f in features) {
		features[f].properties['water'] = 1
	}
	
	// save it back
	//var outpath 		= path.dirname(fileName)
	//var outputFilename 	= path.join(outpath, "props.geojson")
	
	var outputFilename = fileName
	
	fs.writeFile(outputFilename, JSON.stringify(featureCollection, null, 4), function(err) {
		if(err) {
			console.log(err);
		} else {
			console.log("JSON saved to " + outputFilename);
	    }
	}); 
});