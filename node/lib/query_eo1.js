var util 		= require('util'),
	fs			= require('fs'),
	async	 	= require('async'),
	path		= require('path'),
	moment		= require('moment'),
	Hawk		= require('hawk'),
	filesize 	= require('filesize')
	scene_model	= require("../models/scene.js")
	;

function QueryByID(req, user, r, credentials) {
	var duration	= 60 * 30
	var date		= moment(r.date)
	var host 		= "http://"+req.headers.host
	
	function Bewit(url) {
		if( credentials ) {
			var bewit = Hawk.uri.getBewit(url, { credentials: credentials, ttlSec: duration, ext: user.email })
			url += "?bewit="+bewit
		}
		return url;
	}
	
	var source 		= req.gettext("sources.eo1")
	var sensor 		= req.gettext("sensors.ali")

	var path		= parseInt(r.scene.substring(4,7))
	var row			= parseInt(r.scene.substring(7,10))
	var year		= r.scene.substring(10,14)	
	
	// check if it has been processed already
	var browse_url;
	var download, process, browse = undefined;
	var actions;
	
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
					"url": 			Bewit(host+"/products/eo1_ali/browse/"+r.scene),
					"mediaType": 	"html"
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
						"url": 			host+"/mapinfo/eo1_ali/legend",
						"mediaType": 	"text/html",
						"displayName": 	req.gettext("mapinfo.legend")
					},
					{
						"@type": 		"as:HttpRequest",
						"method": 		"GET",
						"@id": 			"style",
						"url": 			host+"/mapinfo/eo1_ali/style",
						"mediaType": 	"application/json",
						"displayName": 	req.gettext("mapinfo.style")
					},
					{
						"@type": 		"as:HttpRequest",
						"method": 		"GET",
						"@id": 			"credits",
						"url": 			host+"/mapinfo/eo1_ali/credits",
						"mediaType": 	"application/json",
						"displayName": 	req.gettext("mapinfo.credits")
					}
				]
			}
		]	
	} else {
		var scene	= r.scene.replace("EO1A", "EO1")
		var minutes = 3
		browse_url	= "http://earthexplorer.usgs.gov/browse/eo-1/ali/"+path+"/"+row+"/"+year+"/"+scene+".jpeg"
		
		actions = [
			{
				"@type": 		"ojo:process",
				"displayName": 	req.gettext("actions.process"),
				"using": [{
					"@type": 		"as:HttpRequest",
					"method": 		"GET",
					"url": 			Bewit(host+"/products/eo1_ali/"+r.scene),
					"displayName": 	req.gettext("products.surface_water"),
					"duration": 	util.format(req.gettext("duration.minutes").replace('{minutes}', 'd'),minutes)
				}]
			}
		]
	}

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
			"bbox": {
				"@label": req.gettext("properties.bbox"),
				"@value": scene_model.bboxFromGeom(r.g)
			},
			"size": {
				"@label": req.gettext("properties.size"),
				"@value": stats ? app.locals.filesize(stats.size, req) : 0
			}
	}	
	
	var entry = {
		"@id": 				r.scene,
		"@type": 			"geoss.surface_water",
		"displayName": 		r.scene,

		"image": [
			{
				"url": browse_url,
				"mediaType": "image/png",
				"rel": "browse"
			}
		],
		"properties": properties,
		"action": actions
	}
	
	return entry	
}

function QueryEO1(req, user, credentials, host, query, bbox, lat, lon, startTime, endTime, startIndex, itemsPerPage, limit, cb ) {
	
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

				if( entries.length < limit ) {
					logger.info("building entry for ", r.scene)
					var entry = QueryByID(req, user, r, credentials)
				
					//console.log(entry)
					entries.push(entry)
				} else {
					logger.info("too many entries", entries.length, limit)
				}
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

module.exports.QueryEO1 	= QueryEO1;
module.exports.QueryByID 	= QueryByID;
