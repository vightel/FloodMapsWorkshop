var util 		= require('util'),
	fs			= require('fs'),
	async	 	= require('async'),
	path		= require('path'),
	moment		= require('moment'),
	sprintf 	= require("sprintf-js").sprintf,
	_			= require('underscore'),
	Hawk		= require('hawk'),
	filesize 	= require('filesize'),
	scene_model	= require("../models/scene.js");

function QueryByID(req, user, r, credentials) {
	var source 		= req.gettext("sources.radarsat2")
	var sensor 		= req.gettext("sensors.sar")
	var thn 		= app.root+"/../data/radarsat2/"+r.scene+"/surface_water_osm.png"
	var date		= moment(r.date)
	var host 		= "http://"+req.headers.host

	topojson_url	= host+"/products/radarsat2/"+r.scene+"/surface_water.topojson"
	topojson_file	= app.root+"/../data/radarsat2/"+r.scene+"/surface_water.topojson.gz"
	
	osm_file		= app.root+"/../data/radarsat2/"+r.scene+"/"+ "surface_water.osm.bz2"
	osm_file_url	= host+"/products/radarsat2/"+r.scene+"/"+ "surface_water.osm.bz2"
	browse_url		= host+"/products/radarsat2/"+r.scene+"/"+ "surface_water_osm.png"
	
	function Bewit(url) {
		if( credentials ) {
			var bewit = Hawk.uri.getBewit(url, { credentials: credentials, ttlSec: duration, ext: user.email })
			url += "?bewit="+bewit
		}
		return url;
	}
	
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
			"@type": 		"ojo:download",
			"displayName": 	req.gettext("actions.download"),
			"using": [
				{
					"@type": 		"as:HttpRequest",
					"method": 		"GET",
					"url": 			Bewit(topojson_url),
					"mediaType": 	"application/json",
					"size": 		app.locals.filesize(stats.size, req),
					"displayName": 	req.gettext("formats.topojson")
				}
				,{
					"@type": 		"as:HttpRequest",
					"method": 		"GET",
					"url": 			Bewit(topojson_url+".gz"),
					"mediaType": 	"application/gzip",
					"size": 		app.locals.filesize(stats.size, req),
					"displayName": 	req.gettext("formats.topojsongz")
				}	
				,{
					"@type": 		"as:HttpRequest",
					"method": 		"GET",
					"url": 			Bewit(osm_file_url+".gz"),
					"mediaType": 	"application/bzip2",
					"size": 		app.locals.filesize(stats2.size, req),
					"displayName": 	req.gettext("formats.osmbz2")
				}	
			]
		},
		{ 
			"@type": 			"ojo:browse",
			"displayName": 		req.gettext("actions.browse"),
			"using": [{
				"@type": 		"as:HttpRequest",
				"method": 		"GET",
				"url": 			Bewit(host+"/products/radarsat2/browse/"+r.scene),
				"mediaType": 	"html",
			}]
		},
		{
			"@type": 			"ojo:map",
			"displayName": 	req.gettext("actions.map"),
			"using": [
				{
					"@type": 		"as:HttpRequest",
					"method": 		"GET",
					"@id": 			"legend",
					"url": 			host+"/mapinfo/radarsat2/legend",
					"mediaType": 	"text/html",
					"displayName": 	req.gettext("mapinfo.legend")
				},
				{
					"@type": 		"as:HttpRequest",
					"method": 		"GET",
					"@id": 			"style",
					"url": 			host+"/mapinfo/radarsat2/style",
					"mediaType": 	"application/json",
					"displayName": 	req.gettext("mapinfo.style")
				},
				{
					"@type": 		"as:HttpRequest",
					"method": 		"GET",
					"@id": 			"credits",
					"url": 			host+"/mapinfo/radarsat2/credits",
					"mediaType": 	"application/json",
					"displayName": 	req.gettext("mapinfo.credits")
				}
			]
		}
	]
					
	var properties = {
			"source": {
				"@label": req.gettext("properties.source"),
				"@value": source
			},
			"sensor": {
				"@label": req.gettext("properties.sensor"),
				"@value": sensor
			},
			"date": {
				"@label": req.gettext("properties.date"),
				"@value": date.format(req.gettext("formats.date"))
			},
			"size": {
				"@label": req.gettext("properties.size"),
				"@value": stats ? app.locals.filesize(stats.size, req) : 0
			},
			"resolution": {
				"@label": req.gettext("properties.resolution"),
				"@value": "<10m"
			}
			
	}				
	
	var entry = {
		"@id": 					r.scene,
		"@type": 				"geoss:surface_water",
		"displayName": 			r.scene,
		"image": [
			{
				"url": 			browse_url,
				"mediaType": 	"image/png",
				"rel": 			"browse"
			}
		],
		"properties": 			properties,
		"geometry": {
			"type": "Polygon",
			"coordinates": scene_model.PolygonFromGeom(r.g)
		},
		"action": 				actions
	}
	
	return entry
}

//
// new Action Stream
//
function QueryRadarsat2_v2(req, user, credentials, host, query, bbox, lat, lon, startTime, endTime, startIndex, itemsPerPage, limit, cb ) {
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
			logger.error("Err", err, JSON.stringify(result))
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
				if( entries.length<limit) {
					var entry = QueryByID(req, user, r, credentials)
						entries.push(entry)
				}
				
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
module.exports.QueryRadarsat2 	= QueryRadarsat2_v2;
module.exports.QueryByID 		= QueryByID;
