var util 		= require('util'),
	fs			= require('fs'),
	async	 	= require('async'),
	path		= require('path'),
	moment		= require('moment'),
	Hawk		= require('hawk'),
	filesize 	= require('filesize')
	scene_model	= require("../models/scene.js")
	;

function QueryEO1(user, credentials, host, query, bbox, lat, lon, startTime, endTime, startIndex, itemsPerPage, cb ) {
	var duration	= 60 * 30
	
	function Bewit(url) {
		if( credentials ) {
			var bewit = Hawk.uri.getBewit(url, { credentials: credentials, ttlSec: duration, ext: user.email })
			url += "?bewit="+bewit
		}
		return url;
	}
	
	scene_model.findAllScenes("eo1_ali", lat, lon, function(err, result) {		
		if( err || (result == undefined) || result.rows == undefined) {
			cb(err, null)
		} else {
			var entries = []
			async.each(result.rows, function(r, callback) {
				var date		= moment(r.date)
				var stats 		= undefined
				if( (date < startTime) || (date > endTime) ) {
					logger.info("scene removed outside span", r.scene, startTime.format("YYYY-MM-DD"), date.format("YYYY-MM-DD"), endTime.format("YYYY-MM-DD"))
					return callback(null)
				}
				var processed 	= false

				var source 		= "NASA GSFC EO-1"
				var sensor 		= "EO-1 ALI"
				// EO1A1260582014199110T2_PF1_01
				var path		= parseInt(r.scene.substring(4,7))
				var row			= parseInt(r.scene.substring(7,10))
				var year		= r.scene.substring(10,14)	
				
				// check if it has been processed already
				var browse_url;
				var download, process, browse = undefined;
				
				var short		= r.scene.split('_')[0]
				var thn 		= 	app.root+"/../data/eo1_ali/"+r.scene+"/"+ short+"_watermap_browseimage.thn.png"
				
				if( fs.existsSync(thn)) {
					processed 		= true
					browse_url		= host+"/products/eo1_ali/"+r.scene+"/"+short+"_watermap_browseimage.thn.png"
					topojson_url	= host+"/products/eo1_ali/"+r.scene+"/"+short+"_WATERMAP.tif.hand.tif.pgm.topojson"
					topojson_file	= app.root+"/../data/eo1_ali/"+r.scene+"/"+ short+"_WATERMAP.tif.hand.tif.pgm.topojson.gz"
					osm_file		= app.root+"/../data/eo1_ali/"+r.scene+"/"+ "surface_water.osm.bz2"
					osm_file_url	= host+"/products/eo1_ali/"+r.scene+"/"+ "surface_water.osm.bz2"
					
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
					browse = Bewit(host+"/products/eo1_ali/browse/"+r.scene)
						
				} else {
					var scene	= r.scene.replace("EO1A", "EO1")				
					browse_url	= "http://earthexplorer.usgs.gov/browse/eo-1/ali/"+path+"/"+row+"/"+year+"/"+scene+".jpeg"
					process = {
						"process": {
							"objectType": 	"HttpActionHandler",
							"method": 		"GET",
							"url": 			Bewit(host+"/products/eo1_ali/browse/"+r.scene),
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

module.exports.QueryEO1 = QueryEO1;
