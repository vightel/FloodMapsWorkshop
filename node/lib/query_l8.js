var util 		= require('util'),
	fs			= require('fs'),
	async	 	= require('async'),
	path		= require('path'),
	moment		= require('moment'),
	Hawk		= require('hawk'),
	filesize 	= require('filesize')
	scene_model	= require("../models/scene.js")
	;
	
function QueryLandsat8(user, credentials, host, query, bbox, lat, lon, startTime, endTime, startIndex, itemsPerPage, cb ) {
	var duration	= 60 * 30
	
	function Bewit(url) {
		if( credentials ) {
			var bewit = Hawk.uri.getBewit(url, { credentials: credentials, ttlSec: duration, ext: user.email })
			url += "?bewit="+bewit
		}
		return url;
	}
	
	scene_model.findAllScenes("l8", lat, lon, function(err, result) {		
		//console.log(node, err, result.rows)
		if( err || (result == undefined) || result.rows == undefined) {
			cb(err, null)
		} else {
			var entries = []
			async.each(result.rows, function(r, callback) {
				var date		= moment(r.date)
				var stats 		= undefined
				var processed 	= false
				
				if( (date < startTime) || (date > endTime) ) {
					return callback(null)
				}
				
				var source 		= "NASA GSFC Landsat-8"
				var sensor 		= "OLI"
				// LC81930542014209LGN00
				var path		= r.scene.substring(3,6)
				var row			= r.scene.substring(6,9)
				var year		= r.scene.substring(9,13)						
				
				// check if it has been processed already
				var browse_url;
				var download, process, browse=undefined;
				
				var short		= r.scene
				var thn 		= app.root+"/../data/l8/"+r.scene+"/"+ short+"_watermap_browseimage.thn.png"
				if( fs.existsSync(thn)) {
					processed 		= true
					browse_url		= host+"/products/l8/"+r.scene+"/"+short+"_watermap_browseimage.thn.png"
					topojson_url	= host+"/products/l8/"+r.scene+"/"+short+"_WATERMAP.tif.hand.tif.pgm.topojson"
					topojson_file	= app.root+"/../data/l8/"+r.scene+"/"+ short+"_WATERMAP.tif.hand.tif.pgm.topojson.gz"
					osm_file		= app.root+"/../data/l8/"+r.scene+"/"+ "surface_water.osm.bz2"
					osm_file_url	= host+"/products/l8/"+r.scene+"/"+ "surface_water.osm.bz2"
					
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
					browse = Bewit(host+"/products/l8/browse/"+r.scene)
						
				} else {
					var browse_url	= "http://earthexplorer.usgs.gov/browse/landsat_8/"+year+"/"+path+"/"+row+"/"+r.scene+".jpg"
					process = {
						"process": {
							"objectType": 	"HttpActionHandler",
							"method": 		"GET",
							"url": 			Bewit(host+"/products/l8/"+r.scene),
							"displayName": 	"surface water",
							"duration": 	"~5mn"
						}	
					}
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
						"date": 	date.format("YYYY-MM-DD"),
						"bbox": 	scene_model.bboxFromGeom(r.g),
						"size": 	stats ? filesize(stats.size) : 0
					},
					"actions": {}
				}
				
				entry.actions.download 	= download
				entry.actions.process 	= process
				entry.actions.browse 	= browse
				
				//console.log(entry)
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
module.exports.QueryLandsat8 = QueryLandsat8;
