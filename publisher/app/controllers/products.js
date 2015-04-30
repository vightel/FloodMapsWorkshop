var util			= require('util'),
	async			= require('async'),
	eyes			= require('eyes'),
	moment			= require('moment'),
	path			= require('path'),
	mkdirp 			= require('mkdirp'),
	filesize 		= require('filesize'),
	Hawk			= require('hawk'),
	glob 			= require("glob")
	debug			= require('debug')('products'),
	sys 			= require('sys'),
	exec 			= require('child_process').exec,
	mime			= require('mime-types'),
	osm_geojson		= require("osm-and-geojson/osm_geojson"),
	tokml			= require('tokml'),
	childProcess 	= require('child_process'),
	scene_model		= require('../../models/scene.js'),
	_				= require('underscore'),
	query_modis		= require('../../lib/query_modis.js'),
	fs				= require('fs');
		
	mime.define( {
		"application/x-osm+xml": [ "osm"],
		"application/json": [ "geojson", "topojson"],
		"application/x-gzip": ["gz"]
	})
	
	function InBBOX( lat, lon, bbox) {
		if( (lat > bbox[2]) && (lat< bbox[3]) && (lon > bbox[0]) && (lon < bbox[2]) ) return true;
		return false
	}
	
	function sendFile( res, file ) {
		var ext 		= path.extname(file)
		var basename 	= 	path.basename(file)
		var dirname 	= 	path.dirname(file)
		var ext			= 	path.extname(file)
		
		var mime_type = mime.lookup(path.basename(file))
		debug( "sendFile", ext, mime_type)
		
		if( ext == ".topojson") {
			res.header("Content-Type", "application/json")
			res.header("Content-Encoding", "gzip")
			basename += ".gz"
			debug("sending .topojson application/json gzip", basename)
		} else {
			debug("sending ", mime_type, basename, dirname)
			res.header("Content-Type", mime_type, basename)
			debug(ext, mime_type, "no encoding")
		}
		
		res.header("Access-Control-Allow-Origin", "*")
		res.sendfile(basename, {root: dirname})
	}

	function sendLandsat8Products(query, ymds, limit, req, res ) {
		var user			= req.session.user
		var host			= req.protocol + "://" + req.headers.host
		var originalUrl		= host + req.originalUrl
		var results 		= []
		
		if( user == undefined ) {
			user = {
				email: "NA"
			}
		}
		
		// we could filter on ymds here...
		var file = app.root+"/public/data/LC80090472013357LGN00_WATERMAP.tif.hand.tif.pgm.topojson.gz"
				
		var fileName 		= file
		var basename 		= path.basename(fileName)
		
		// add product entry to result
		var stats 			= fs.statSync( fileName )
		
		var duration		= 60 * 30
		var credentials		= req.session.credentials
		
		function Bewit(url) {
			var bewit = Hawk.uri.getBewit(url, { credentials: credentials, ttlSec: duration, ext: user.email })
			url += "?bewit="+bewit
			return url;
		}
		
		var entry = {
			"id": basename,
			"image": [
				{
					"url": host+"/data/LC80090472013357LGN00_watermap_browseimage.thn.png",
					"mediaType": "image/png",
					"rel": "browse"
				}
			],
			"properties": {
				"source": 	"NASA NRT Global Flood Mapping",
				"sensor": 	"LANDSAT-8",
				"date": 	"2012-12-23",
				"bbox": 	[-73.94358, 17.74510, -71.76917, 19.81187],
				"size": 	filesize(stats.size)
			},
			"actions": {
				"download": [
					{
						"objectType": 	"HttpActionHandler",
						"method": 		"GET",
						"url": 			Bewit(host+"/data/LC80090472013357LGN00_WATERMAP.tif.hand.tif.pgm.topojson"),
						"mediaType": 	"application/json",
						"displayName": 	"topojson"
					},
					{
						"objectType": 	"HttpActionHandler",
						"method": 		"GET",
						"url": 			Bewit(host+"/data/LC80090472013357LGN00_WATERMAP.tif.hand.tif.pgm.topojson.gz"),
						"mediaType": 	"application/gzip",
						"displayName": 	"topojson.gz",
						"size": 		filesize(stats.size)
					}
				],
				"view": 	host+"/products/landsat8",
				"share": 	host+"/products/landsat8",
				"map": [
					{
						"objectType": 	"HttpActionHandler",
						"id": 			"landsat8_floodmap_legend",
						"method": 		"GET",
						"url": 			host+"/mapinfo/landsat8/legend",
						"mediaType": 	"text/html",
						"displayName": 	"legend",
					},
					{
						"objectType": 	"HttpActionHandler",
						"id": 			"landsat8_floodmap_style",
						"method": 		"GET",
						"url": 			host+"/mapinfo/landsat8/style",
						"mediaType": 	"application/json",
						"displayName": 	"style",
					},
					{
						"objectType": 	"HttpActionHandler",
						"id": 			"landsat8_floodmap_credits",
						"method": 		"GET",
						"url": 			host+"/mapinfo/landsat8/credits",
						"mediaType": 	"application/json",
						"displayName": 	"credits",
					}
				]
			}
		}
		return entry
	}

	function sendRadarsat2Products(query, ymds, limit, req, res ) {
		var user			= req.session.user
		var host			= req.protocol + "://" + req.headers.host
		var originalUrl		= host + req.originalUrl
		var results 		= []
		
		if( user == undefined ) {
			user = {
				email: "NA"
			}
		}
		
		// we could filter on ymds here...
		var file = app.root+"/public/data/surface_water.topojson.gz"
				
		var fileName 		= file
		var basename 		= path.basename(fileName)
		
		// add product entry to result
		var stats 			= fs.statSync( fileName )
		
		var duration		= 60 * 30
		var credentials		= req.session.credentials
		
		function Bewit(url) {
			var bewit = Hawk.uri.getBewit(url, { credentials: credentials, ttlSec: duration, ext: user.email })
			url += "?bewit="+bewit
			return url;
		}
		
		var entry = {
			"id": basename,
			"image": [
				{
					"url": host+"/data/LC80090472013357surface_water_osm.png",
					"mediaType": "image/png",
					"rel": "browse"
				}
			],
			"properties": {
				"source": 	"NASA NRT Global Flood Mapping",
				"sensor": 	"Radarsat-2",
				"date": 	"2012-08-25",
				"bbox": 	[-73.94358, 17.74510, -71.76917, 19.81187],
				"size": 	filesize(stats.size)
			},
			"actions": {
				"download": [
					{
						"objectType": 	"HttpActionHandler",
						"method": 		"GET",
						"url": 			Bewit(host+"/data/surface_water.topojson"),
						"mediaType": 	"application/json",
						"displayName": 	"topojson"
					},
					{
						"objectType": 	"HttpActionHandler",
						"method": 		"GET",
						"url": 			Bewit(host+"/data/surface_water.topojson.gz"),
						"mediaType": 	"application/gzip",
						"displayName": 	"topojson.gz",
						"size": 		filesize(stats.size)
					}
				],
				"view": 	host+"/products/radarsat2",
				"share": 	host+"/products/radarsat2",
				"map": [
					{
						"objectType": 	"HttpActionHandler",
						"id": 			"radarsat2_floodmap_legend",
						"method": 		"GET",
						"url": 			host+"/mapinfo/radarsat2/legend",
						"mediaType": 	"text/html",
						"displayName": 	"legend",
					},
					{
						"objectType": 	"HttpActionHandler",
						"id": 			"radarsat2_floodmap_style",
						"method": 		"GET",
						"url": 			host+"/mapinfo/radarsat2/style",
						"mediaType": 	"application/json",
						"displayName": 	"style",
					},
					{
						"objectType": 	"HttpActionHandler",
						"id": 			"radarsat2_floodmap_credits",
						"method": 		"GET",
						"url": 			host+"/mapinfo/radarsat2/credits",
						"mediaType": 	"application/json",
						"displayName": 	"credits",
					}
				]
			}
		}
		return entry
	}
	
	function OBEsendModisProducts(query, ymds, limit, req, res ) {
		var user			= req.session.user
		var host			= req.protocol + "://" + req.headers.host
		var originalUrl		= host + req.originalUrl
		var results 		= []
		
		if( user == undefined ) {
			user = {
				email: "NA"
			}
		}
		
		// we could filter on ymds here...
		var file = app.root+"/public/data/SWP_2012234_080W020N_2D2OT.topojson.gz"
				
		var fileName 		= file
		var basename 		= path.basename(fileName)
		
		// add product entry to result
		var stats 			= fs.statSync( fileName )
		
		var duration		= 60 * 30
		var credentials		= req.session.credentials
		
		function Bewit(url) {
			var bewit = Hawk.uri.getBewit(url, { credentials: credentials, ttlSec: duration, ext: user.email })
			url += "?bewit="+bewit
			return url;
		}
		
		var entry = {
			"id": basename,
			"image": [
				{
					"url": host+"/data/OSM_SWP_2012234_080W020N.png",
					"mediaType": "image/png",
					"rel": "browse"
				}
			],
			"properties": {
				"source": 	"NASA NRT Global Flood Mapping",
				"sensor": 	"MODIS",
				"date": 	"2012-12-23",
				"bbox": 	[-80, 10, -70.76917, 20],
				"size": 	filesize(stats.size)
			},
			"actions": {
				"download": [
					{
						"objectType": 	"HttpActionHandler",
						"method": 		"GET",
						"url": 			Bewit(host+"/data/SWP_2012234_080W020N_2D2OT.topojson"),
						"mediaType": 	"application/json",
						"displayName": 	"topojson"
					},
					{
						"objectType": 	"HttpActionHandler",
						"method": 		"GET",
						"url": 			Bewit(host+"/data/SWP_2012234_080W020N_2D2OT.topojson.gz"),
						"mediaType": 	"application/gzip",
						"displayName": 	"topojson.gz",
						"size": 		filesize(stats.size)
					}
				],
				"view": 	host+"/products/modis",
				"share": 	host+"/products/modis",
				"map": [
					{
						"objectType": 	"HttpActionHandler",
						"id": 			"modis_floodmap_legend",
						"method": 		"GET",
						"url": 			host+"/mapinfo/modis/legend",
						"mediaType": 	"text/html",
						"displayName": 	"legend",
					},
					{
						"objectType": 	"HttpActionHandler",
						"id": 			"modis_floodmap_style",
						"method": 		"GET",
						"url": 			host+"/mapinfo/modis/style",
						"mediaType": 	"application/json",
						"displayName": 	"style",
					},
					{
						"objectType": 	"HttpActionHandler",
						"id": 			"modis_floodmap_credits",
						"method": 		"GET",
						"url": 			host+"/mapinfo/modis/credits",
						"mediaType": 	"application/json",
						"displayName": 	"credits",
					}
				]
			}
		}
		return entry
	}

function render_map(region, topojson, req, res) {
	res.render("products/map", {
		region: region,
		topojson: topojson,
		layout: false
	})
}

function render_mapgl(region, topojson, req, res) {
	res.render("products/mapgl", {
		region: 		region,
		social_envs:	app.social_envs,
		topojson: 		topojson,
		layout: false
	})
}


module.exports = {
	// http://localhost:7465/products/opensearch?q=surface_water&lat=18&lon=-70&startTime=20140418&endTime=20140421
		
	opensearch: function(req, res) {
		var query 			= req.query.q
		var bbox			= req.query.bbox ? req.query.bbox.split(",").map(parseFloat) : undefined
		var itemsPerPage	= req.query.itemsPerPage || 7
		var startIndex		= req.query.startIndex || 1
		var limit			= req.query.limit || 25
		var startTime		= req.query.startTime ? moment(req.query.startTime, "YYYY-MM-DD") : moment()
		var endTime			= req.query.endTime ? moment(req.query.endTime, "YYYY-MM-DD") : moment()
		var lat				= req.query.lat ? parseFloat(req.query.lat) : undefined
		var lon				= req.query.lon ? parseFloat(req.query.lon) : undefined
		var user			= req.session.user
		var host			= req.protocol + "://" + req.headers.host
		var originalUrl		= host + req.originalUrl
		var credentials		= req.session.credentials

		console.log("Product opensearch", originalUrl)
		
		if( bbox ) {
			lon = (bbox[0]+bbox[2])/2.0
			lat = (bbox[1]+bbox[3])/2.0
		}
		
		var results = []
		var json = {
			"objectType": 'query',
			"id": "urn:ojo-publisher:"+query,
			"displayName": "OJO Publisher Products",
			"replies": {
				"url": originalUrl,
				"mediaType": "application/activity+json",
				"totalItems": results.length,
				"items": results
			}
		}
		
		// This for products we support
		//if( query != "surface_water") {
		//	debug("Usupported product request", query)
		//	return res.send(json)
		//}
		
		// find region of interest
		var inregion = InBBOX(lat, lon, [-80,10,-70,20])
		if( inregion === undefined ) {
			debug("Not within region for ", lat, lon)
			return res.send( json )
		}
			
		var ymds 	= []
		var dTime	= endTime.clone()
			
		while( dTime.isAfter(startTime) || startTime.isSame(dTime)) {
			var ymd = dTime.format("YYYYMMDD")
			ymds.push(ymd)
			dTime.subtract('days', 1);
		}
		
		debug("Searching for", query)
		
		items = []
		
		function find_modis_products( callback) {
			query_modis.QueryModis(req, user, credentials, host, query, bbox, lat, lon, startTime, endTime, startIndex, itemsPerPage, limit, callback)
		}
		
		function find_radarsat2_products( callback) {
			callback(null, null)
		}
		
		function find_l8_products( callback) {
			callback(null, null)
		}

		function find_eo1_ali_products( callback) {
			callback(null, null)
		}

		
		async.parallel([
			find_modis_products,
			find_radarsat2_products,
			find_eo1_ali_products,
			find_l8_products
		], function(err, results) {
			if( !err ) {
				// Add Modis results
				console.log("Got MODIS items", results[0].replies.items.length)
				for( var i in results[0].replies.items) {
					var entry =  results[0].replies.items[i]
					items.push(entry)
				}				
			} else {
				logger.error("Error", err)
				res.send(500)
				return
			}
			
			res.set("Access-Control-Allow-Origin", "*")
			var json = {
				"objectType": 'query',
				"id": "urn:trmm:"+query,
				"displayName": "OJO Publisher GEOSS Products",
				"replies": {
					"url": originalUrl,
					"mediaType": "application/activity+json",
					"totalItems": items.length,
					"items": items
				}
			}
			res.send(json)	
		})
		//entry = sendModisProducts(query, ymds, limit, req, res )
		//if( entry ) results.push(entry)
		
		//entry = sendRadarsat2Products(query, ymds, limit, req, res )
		//if( entry ) results.push(entry)

		//entry = sendLandsat8Products(query, ymds, limit, req, res )
		//if( entry ) results.push(entry)
		
		
	},
	
	index: function(req, res) {
		var user = req.session.user
		res.render("products/index", {user: user})
	},
	
	topojson: function(req,res) {
		var id 			= req.params["id"]
		var file 		= app.root+"/public/data/"+id
		var basename	= path.basename(file)
		var dirname 	= path.dirname(file)
		var ext 		= path.extname(file)
		
		var mime_type 	= mime.lookup(path.basename(file))
		
		debug("topojson", basename)
		
		if( basename.indexOf(".gz") > 0) {
			debug("sending ", mime_type, basename, dirname)
			res.header("Content-Type", mime_type, basename)
			debug(ext, mime_type, "no encoding")
		} else {
			res.header("Content-Type", "application/json")
			res.header("Content-Encoding", "gzip")
			basename += ".gz"
			debug("sending .topojson application/json gzip", basename)
		}
		
		res.header("Access-Control-Allow-Origin", "*")
		res.sendfile(basename, {root: dirname}) 
	}
}
