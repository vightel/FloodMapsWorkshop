var util 		= require('util'),
	fs			= require('fs'),
	async	 	= require('async'),
	path		= require('path'),
	moment		= require('moment'),
	Hawk		= require('hawk'),
	filesize 	= require('filesize'),
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
	var source 		= req.gettext("sources.l8")
	var sensor 		= req.gettext("sensors.l8")
	
	var path		= r.scene.substring(3,6)
	var row			= r.scene.substring(6,9)
	var year		= r.scene.substring(9,13)						
	
	// check if it has been processed already
	var browse_url;
	var download, process, browse=undefined;
	var actions;
	
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
					"url": 			Bewit(host+"/products/l8/browse/"+r.scene),
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
						"url": 			host+"/mapinfo/l8/legend",
						"mediaType": 	"text/html",
						"displayName": 	req.gettext("mapinfo.legend")
					},
					{
						"@type": 		"as:HttpRequest",
						"method": 		"GET",
						"@id": 			"style",
						"url": 			host+"/mapinfo/l8/style",
						"mediaType": 	"application/json",
						"displayName": 	req.gettext("mapinfo.style")
					},
					{
						"@type": 		"as:HttpRequest",
						"method": 		"GET",
						"@id": 			"credits",
						"url": 			host+"/mapinfo/l8/credits",
						"mediaType": 	"application/json",
						"displayName": 	req.gettext("mapinfo.credits")
					}
				]
			}
		]
	} else {
		var browse_url	= "http://earthexplorer.usgs.gov/browse/landsat_8/"+year+"/"+path+"/"+row+"/"+r.scene+".jpg"
		var minutes		= 2
		
		actions = [
			{
				"@type": 		"ojo:process",
				"displayName": 	req.gettext("actions.process"),
				"using": [{
					"@type": 		"as:HttpRequest",
					"method": 		"GET",
					"url": 			Bewit(host+"/products/l8/"+r.scene),
					"displayName": 	req.gettext("products.surface_water"),
					"duration": 	util.format(req.gettext("duration.minutes").replace('{minutes}', 'd'),minutes)
				}]
			}
		]
	}

	var source 	= req.gettext("sources.l8");
	var sensor	= req.gettext("sensors.l8");
	
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
				"@value": "30m"
			}
	}	
	
	var entry = {
		"@id": 				r.scene,
		"@type": 			"geoss:surface_water",
		"displayName": 		r.scene,
		
		"image": [
			{
				"url": browse_url,
				"mediaType": "image/png",
				"rel": "browse"
			}
		],
		"properties": 		properties,
		"geometry": {
			"type": "Polygon",
			"coordinates": scene_model.PolygonFromGeom(r.g)
		},
		"action": 			actions
	}
	console.log(JSON.stringify(entry))
	return entry	
}

function QueryLandsat8(req, user, credentials, host, query, bbox, lat, lon, startTime, endTime, startIndex, itemsPerPage, limit, cb ) {
	
	scene_model.findAllScenes("l8", lat, lon, function(err, result) {		
		//console.log(node, err, result.rows)
		if( err || (result == undefined) || result.rows == undefined) {
			cb(err, null)
		} else {
			var entries = []
			async.each(result.rows, function(r, callback) {
				var date		= moment(r.date)
				var stats 		= { size: 0 }
				var processed 	= false
				
				if( (date < startTime) || (date > endTime) ) {
					return callback(null)
				}
				
				if( entries.length < limit ) {
					var entry = QueryByID(req, user, r, credentials)
					entries.push(entry)
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
module.exports.QueryLandsat8 	= QueryLandsat8;
module.exports.QueryByID 		= QueryByID;
