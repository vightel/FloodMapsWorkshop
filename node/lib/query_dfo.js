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
	var host 		= "http://"+req.headers.host
	
	function Bewit(url) {
		if( credentials ) {
			var bewit = Hawk.uri.getBewit(url, { credentials: credentials, ttlSec: duration, ext: user.email })
			url += "?bewit="+bewit
		}
		return url;
	}
	var source 		= req.gettext("sources.dfo")
	var sensor 		= req.gettext("sensors.dfo")

	var arr 		= r.scene.split('_')
	var date		= arr[0]
	
	var year		= r.scene.substring(0,4)
	var month		= r.scene.substring(4,6)
	var day			= r.scene.substring(6,8)	
	
	var eventNum	= arr[2]
	
	// check if it has been processed already
	var browse_url;
	var actions = undefined;
	
	var thn 		= 	app.root+"/../data/dfo/"+eventNum+"/"+date+"/browseimage.png"
	
	if( fs.existsSync(thn)) {
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
					"url": 			Bewit(host+"/products/dfo/browse/"+r.scene),
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
						"url": 			host+"/mapinfo/dfo/legend",
						"mediaType": 	"text/html",
						"displayName": 	req.gettext("mapinfo.legend")
					},
					{
						"@type": 		"as:HttpRequest",
						"method": 		"GET",
						"@id": 			"style",
						"url": 			host+"/mapinfo/dfo/style",
						"mediaType": 	"application/json",
						"displayName": 	req.gettext("mapinfo.style")
					},
					{
						"@type": 		"as:HttpRequest",
						"method": 		"GET",
						"@id": 			"credits",
						"url": 			host+"/mapinfo/dfo/credits",
						"mediaType": 	"application/json",
						"displayName": 	req.gettext("mapinfo.credits")
					}
				]
			}
		]	
		
	} else {
		logger.error("Could not find thn", thn)
	}

	//var dt = moment()
	//dt.year(year)
	//dt.month(month+1)
	//dt.date(day)
	
	date		= moment(r.date)
					
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
				"@value": "~250m"
			},
			"geometry": {
				"type": "Polygon",
				"coordinates": scene_model.PolygonFromGeom(r.g)
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
		"properties": 	properties,
		"action": 		actions
	}
	
	return entry	
}

function QueryDFO(req, user, credentials, host, query, bbox, lat, lon, startTime, endTime, startIndex, itemsPerPage, limit, cb ) {
	
	scene_model.findAllScenes("dfo", lat, lon, function(err, result) {		
		if( err || (result == undefined) || (result.rows == undefined)) {
			cb(err, null)
		} else {
			var entries = []
			console.log("DFO Found", result.rows.length)
			async.each(result.rows, function(r, callback) {
				var date		= moment(r.date)
				var stats 		= undefined
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

module.exports.QueryDFO 	= QueryDFO;
module.exports.QueryByID 	= QueryByID;
