var util 		= require('util'),
	fs			= require('fs'),
	async	 	= require('async'),
	path		= require('path'),
	moment		= require('moment'),
	sprintf 	= require("sprintf-js").sprintf,
	_			= require('underscore'),
	Hawk		= require('hawk'),
	filesize 	= require('filesize')
	;

	// takes a polygon and returns a bbox
	// POLYGON((19.154261 -72.334539,19.054651 -72.00994,17.99311 -72.249369,18.092406 -72.571983,19.154261 -72.334539))
	function bboxFromGeom(g) {
		var str = g.replace("POLYGON((", "")
		str = str.replace("))", "")
		str = str.replace(/ /g, ",")
		var arr = str.split(",")
		var latmin 	= Math.min( parseFloat(arr[0]), parseFloat(arr[2]), parseFloat(arr[4]), parseFloat(arr[6]), parseFloat(arr[8]))
		var latmax 	= Math.max( parseFloat(arr[0]), parseFloat(arr[2]), parseFloat(arr[4]), parseFloat(arr[6]), parseFloat(arr[8]))
		var lonmin 	= Math.max( parseFloat(arr[1]), parseFloat(arr[3]), parseFloat(arr[5]), parseFloat(arr[7]), parseFloat(arr[9]))
		var lonmax 	= Math.max( parseFloat(arr[1]), parseFloat(arr[3]), parseFloat(arr[5]), parseFloat(arr[7]), parseFloat(arr[9]))
		var bbox =  [latmin, lonmin, latmax, lonmax]
		//console.log("bbox", arr, bbox)
		return bbox
	}
	
function QueryRadarsat2(req, user, credentials, host, query, bbox, lat, lon, startTime, endTime, startIndex, itemsPerPage, cb ) {
	var duration	= 60 * 30
	
	function Bewit(url) {
		if( credentials ) {
			var bewit = Hawk.uri.getBewit(url, { credentials: credentials, ttlSec: duration, ext: user.email })
			url += "?bewit="+bewit
		}
		return url;
	}
	
	var str 		= util.format("SELECT *, ST_AsText(geom) as g from radarsat2 where ST_contains(geom, ST_GeomFromText('POINT(%d %d)',4326))", lat, lon )

	console.log("Query Radarsat2", str)
	
	var query = app.client.query(str, function(err, result) {
		//console.log("query result", err, result.rows)
		if( err || (result == undefined) || result.rows == undefined) {
			cb(err, null)
		} else {
			var entries = []
			async.each(result.rows, function(r, callback) {
				var file 	= "../../data/radarsat2/"+r.scene+"/surface_water.topojson.gz"
				var date	= moment(r.date)
				if( (date < startTime) || (date > endTime) ) {
					return callback(null)
				}
				
				var stats = undefined
				if( fs.existsSync(file) ) {
					var stats 	= fs.statSync(file)
					console.log("Stats", file, stats)
				} else { 
					//console.log("File does not exist", file) 
				}
				
				var processed = false
				
				var source 		= req.gettext("sources.radarsat2")
				var sensor 		= req.gettext("sensors.sar")
				var thn 		= app.root+"/../data/radarsat2/"+r.scene+"/surface_water_osm.png"

				topojson_url	= host+"/products/radarsat2/"+r.scene+"/surface_water.topojson"
				topojson_file	= app.root+"/../data/radarsat2/"+r.scene+"/surface_water.topojson.gz"
				
				osm_file		= app.root+"/../data/radarsat2/"+r.scene+"/"+ "surface_water.osm.bz2"
				osm_file_url	= host+"/products/radarsat2/"+r.scene+"/"+ "surface_water.osm.bz2"
				browse_url		= host+"/products/radarsat2/"+r.scene+"/"+ "surface_water_osm.png"
				
				var stats = { size: 0 }
				try {
					stats	= fs.statSync( topojson_file )
				} catch(e) {
					console.log("Could not stat", topojson_file, e)
				}
				var stats2 = { size: 0 }
				try {
					stats2	= fs.statSync( osm_file )
				} catch(e) {
					console.log("Could not stat", osm_file_url, e)
				}
				
				download = [
					{
						"objectType": 	"HttpActionHandler",
						"method": 		"GET",
						"url": 			Bewit(topojson_url),
						"mediaType": 	"application/json",
						"displayName": 	req.gettext("formats.topojson"),
						"size": 		filesize(stats.size)
					}
					,{
						"objectType": 	"HttpActionHandler",
						"method": 		"GET",
						"url": 			Bewit(topojson_url+".gz"),
						"mediaType": 	"application/gzip",
						"displayName": 	req.gettext("formats.topojsongz"),
						"size": 		filesize(stats.size)
					}	
					,{
						"objectType": 	"HttpActionHandler",
						"method": 		"GET",
						"url": 			Bewit(osm_file_url+".gz"),
						"mediaType": 	"application/bzip2",
						"displayName": 	req.gettext("formats.osmbz2"),
						"size": 		filesize(stats2.size)
					}	
				]			

				var entry = {
					"id": r.scene,
					"image": [
						{
							"url": browse_url,
							"mediaType": "image/png",
							"rel": "browse"
						}
					],
					"properties": {
						"source": 	source,
						"sensor": 	sensor,
						"date": 	date.format(req.gettext("formats.date")),
						"bbox": 	bboxFromGeom(r.g),
						"size": 	stats ? filesize(stats.size) : 0
					},
					"actions": {
						"download": download,
						"browse": 	Bewit(host+"/products/radarsat2/browse/"+r.scene)
					}
				}
				
				entries.push(entry)
				callback(null)
			}, function(err) {					
				var json = {
					replies: {
						items: entries
					}
				}
				console.log("Radarsat2 Done", err)				
				cb(null, json)	
			})
		}
	})
}

//
// new Action Stream
//
function QueryRadarsat2_v2(req, user, credentials, host, query, bbox, lat, lon, startTime, endTime, startIndex, itemsPerPage, cb ) {
	var duration	= 60 * 30
	
	function Bewit(url) {
		if( credentials ) {
			var bewit = Hawk.uri.getBewit(url, { credentials: credentials, ttlSec: duration, ext: user.email })
			url += "?bewit="+bewit
		}
		return url;
	}
	
	var str 		= util.format("SELECT *, ST_AsText(geom) as g from radarsat2 where ST_contains(geom, ST_GeomFromText('POINT(%d %d)',4326))", lat, lon )

	console.log("Query Radarsat2", str)
	
	var query = app.client.query(str, function(err, result) {
		//console.log("query result", err, result.rows)
		if( err || (result == undefined) || result.rows == undefined) {
			cb(err, null)
		} else {
			var entries = []
			async.each(result.rows, function(r, callback) {
				var file 	= "../../data/radarsat2/"+r.scene+"/surface_water.topojson.gz"
				var date	= moment(r.date)
				if( (date < startTime) || (date > endTime) ) {
					return callback(null)
				}
				
				var stats = undefined
				if( fs.existsSync(file) ) {
					var stats 	= fs.statSync(file)
					console.log("Stats", file, stats)
				} else { 
					//console.log("File does not exist", file) 
				}
				
				var processed = false
				
				var source 		= req.gettext("sources.radarsat2")
				var sensor 		= req.gettext("sensors.sar")
				var thn 		= app.root+"/../data/radarsat2/"+r.scene+"/surface_water_osm.png"

				topojson_url	= host+"/products/radarsat2/"+r.scene+"/surface_water.topojson"
				topojson_file	= app.root+"/../data/radarsat2/"+r.scene+"/surface_water.topojson.gz"
				
				osm_file		= app.root+"/../data/radarsat2/"+r.scene+"/"+ "surface_water.osm.bz2"
				osm_file_url	= host+"/products/radarsat2/"+r.scene+"/"+ "surface_water.osm.bz2"
				browse_url		= host+"/products/radarsat2/"+r.scene+"/"+ "surface_water_osm.png"
				
				var stats = { size: 0 }
				try {
					stats	= fs.statSync( topojson_file )
				} catch(e) {
					console.log("Could not stat", topojson_file, e)
				}
				var stats2 = { size: 0 }
				try {
					stats2	= fs.statSync( osm_file )
				} catch(e) {
					console.log("Could not stat", osm_file_url, e)
				}

				actions = [
					{
						"@type": 		"urn:ojo:actions:download",
						"displayName": 	req.gettext("actions.download"),
						"using": [
							{
								"@type": 		"http://activitystrea.ms/2.0/HttpRequest",
								"method": 		"GET",
								"url": 			Bewit(topojson_url),
								"mediaType": 	"application/json",
								"size": 		app.locals.filesize(stats.size, req),
								"displayName": 	req.gettext("formats.topojson")
							}
							,{
								"@type": 		"http://activitystrea.ms/2.0/HttpRequest",
								"method": 		"GET",
								"url": 			Bewit(topojson_url+".gz"),
								"mediaType": 	"application/gzip",
								"size": 		app.locals.filesize(stats.size, req),
								"displayName": 	req.gettext("formats.topojsongz")
							}	
							,{
								"@type": 		"http://activitystrea.ms/2.0/HttpRequest",
								"method": 		"GET",
								"url": 			Bewit(osm_file_url+".gz"),
								"mediaType": 	"application/bzip2",
								"size": 		app.locals.filesize(stats2.size, req),
								"displayName": 	req.gettext("formats.osmbz2")
							}	
						]
					},
					{ 
						"@type": 			"urn:ojo:actions:browse",
						"displayName": 		req.gettext("actions.browse"),
						"using": [{
							"@type": 		"http://activitystrea.ms/2.0/HttpRequest",
							"method": 		"GET",
							"url": 			Bewit(host+"/products/radarsat2/browse/"+r.scene),
							"mediaType": 	"html",
						}]
					}
				]
				
				var properties = {}
				properties[req.gettext("properties.source")]= 	source;
				properties[req.gettext("properties.sensor")]= 	sensor;
				properties[req.gettext("properties.date")]= 	date.format(req.gettext("formats.date"));
				properties[req.gettext("properties.bbox")]= 	bboxFromGeom(r.g);
				properties[req.gettext("properties.size")]= 	stats ? app.locals.filesize(stats.size, req) : 0;
				
				
				var entry = {
					"@id": 					r.scene,
					"@type": 				"geoss.surface_water",
					"displayName": 			r.scene,
					"image": [
						{
							"url": 			browse_url,
							"mediaType": 	"image/png",
							"rel": 			"browse"
						}
					],
					"properties": 			properties,
					"action": 				actions
				}
				
				entries.push(entry)
				callback(null)
			}, function(err) {					
				var json = {
					replies: {
						items: entries
					}
				}
				console.log("Radarsat2 Done", err)				
				cb(null, json)	
			})
		}
	})
}
module.exports.QueryRadarsat2 = QueryRadarsat2_v2;
