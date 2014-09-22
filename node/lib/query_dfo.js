var util 		= require('util'),
	fs			= require('fs'),
	async	 	= require('async'),
	path		= require('path'),
	moment		= require('moment'),
	Hawk		= require('hawk'),
	filesize 	= require('filesize')
	scene_model	= require("../models/scene.js")
	;

function QueryDFO(user, credentials, host, query, bbox, lat, lon, startTime, endTime, startIndex, itemsPerPage, cb ) {
	var duration	= 60 * 30
	
	function Bewit(url) {
		if( credentials ) {
			var bewit = Hawk.uri.getBewit(url, { credentials: credentials, ttlSec: duration, ext: user.email })
			url += "?bewit="+bewit
		}
		return url;
	}
	
	scene_model.findAllScenes("dfo", lat, lon, function(err, result) {		
		if( err || (result == undefined) || result.rows == undefined) {
			cb(err, null)
		} else {
			var entries = []
			async.each(result.rows, function(r, callback) {
				var date		= moment(r.date)
				var stats 		= undefined
				if( (date < startTime) || (date > endTime) ) {
					return callback(null)
				}
				var processed 	= false

				var source 		= "Dartmouth Flood Observatory - Colorado"
				var sensor 		= "MODIS/L8"

				var arr 		= r.scene.split('_')
				var date		= arr[0]
				
				var year		= r.scene.substring(0,4)
				var month		= r.scene.substring(4,6)
				var day			= r.scene.substring(6,8)	
				
				var eventNum	= arr[2]
				
				// check if it has been processed already
				var browse_url;
				var download, process, browse = undefined;
				
				var thn 		= 	app.root+"/../data/dfo/"+eventNum+"/"+date+"/browseimage.png"
				
				if( fs.existsSync(thn)) {
					debug("found thn", thn)
					processed 		= true
					browse_url		= host+"/products/dfo/"+eventNum+"/"+date+"/browseimage.png"
					topojson_url	= host+"/products/dfo/"+eventNum+"/"+date+"/watermap.topojson"
					
					topojson_file	= app.root+"/../data/dfo/"+eventNum+"/"+date+"/watermap.topojson.gz"
					osm_file		= app.root+"/../data/dfo/"+eventNum+"/"+date+"/surface_water.osm.bz2"
					
					osm_file_url	= host+"/products/dfo/"+eventNum+"/"+date+"/surface_water.osm.bz2"
					
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
							"displayName": 	"topojson",
							"size": 		filesize(stats.size)
						}
						,{
							"objectType": 	"HttpActionHandler",
							"method": 		"GET",
							"url": 			Bewit(topojson_url+".gz"),
							"mediaType": 	"application/gzip",
							"displayName": 	"topojson.gz",
							"size": 		filesize(stats.size)
						}	
						,{
							"objectType": 	"HttpActionHandler",
							"method": 		"GET",
							"url": 			Bewit(osm_file_url+".gz"),
							"mediaType": 	"application/bzip2",
							"displayName": 	"osm.bz2",
							"size": 		filesize(stats2.size)
						}	
					]		
					browse = Bewit(host+"/products/dfo/browse/"+r.scene)
						
				} else {
					logger.error("Could not find thn", thn)
				}

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
						"date": 	year+"-"+month+"-"+day,
						"bbox": 	scene_model.bboxFromGeom(r.g),
						"size": 	stats ? filesize(stats.size) : 0
					},
					"actions": {}
				}
				entry.actions.download 	= download
				if( process ) entry.actions.process 	= process
				entry.actions.browse 	= browse
				
				debug(entry)
				entries.push(entry)
				callback(null)
			}, function(err) {					
				cb(err, {
					replies: {
						items: entries
					}
				})
			})
		}
	})
}

module.exports.QueryDFO = QueryDFO;
