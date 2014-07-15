var util	= require('util'),
	async	= require('async'),
	eyes	= require('eyes'),
	moment	= require('moment'),
	path	= require('path'),
	mkdirp 	= require('mkdirp'),
	filesize = require('filesize'),
	Hawk	= require('hawk'),
	glob 	= require("glob")
	debug	= require('debug')('products'),
	sys 	= require('sys'),
	exec 	= require('child_process').exec,
	mime	= require('mime-types'),
	osm_geojson	= require("osm-and-geojson/osm_geojson"),
	tokml	= require('tokml'),
	fs		= require('fs');
	
	mime.define( {
		"application/x-osm+xml": [ "osm"],
		"application/json": [ "geojson", "topojson"],
		"application/x-gzip": ["gz"]
	})
	
	function puts(error, stdout, stderr) { sys.puts(stdout) }
	
	function InBBOX( lat, lon, bbox) {
		if( (lat > bbox[2]) && (lat< bbox[3]) && (lon > bbox[0]) && (lon < bbox[2]) ) return true;
		return false
	}
	
	function findRegion(lat, lon) {
		if( InBBOX(lat, lon, app.config.regions.d02.bbox)) return app.config.regions.d02
		if( InBBOX(lat, lon, app.config.regions.d03.bbox)) return app.config.regions.d03
		return undefined
	}
	
	// Check if file exists on S3, if yes, download it into /tmp
	function existsOnS3(bucket, folder, fname, cb ) {
		var tmp_dir = app.get("tmp_dir")
		
		console.log("Check on S3", bucket, folder, fname)
		var options = {
			Bucket: bucket, 
			Key: folder + "/" + fname
		};
		app.s3.getObject( options, function(err, data) {
			if( !err ) {
				var dir = path.join(tmp_dir, bucket, folder)
				
				// make sure folder exists
				mkdirp.sync(dir)
				
				var fileName	= path.join(dir, fname)
				var out 		= fs.createWriteStream(fileName)	
				var buff 		= new Buffer(data.Body, "binary")
				var Readable 	= require('stream').Readable;
				var rs 			= new Readable;
				rs.push(buff)
				rs.push(null)
				rs.pipe(out)
				
			} else {
				console.log("NOT Found it on S3", fname)
			}
			cb(err)
		})
	}
	
	function sendFile( res, file ) {
		var ext 		= path.extname(file)
		var basename 	= 	path.basename(file)
		var dirname 	= 	path.dirname(file)
		
		var mime_type = mime.lookup(path.basename(file))
		
		if( basename.indexOf(".topojson") > 0) {
			res.header("Content-Type", "application/json")
			res.header("Content-Encoding", "gzip")
			console.log("sending .topojson application/json gzip", basename)
		} else {
			console.log("sending ", mime_type, basename, dirname)
			res.header("Content-Type", mime_type, basename)
			console.log(ext, mime_type, "no encoding")
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
	
	function sendModisProducts(query, ymds, limit, req, res ) {
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
		if( query != "surface_water") {
			console.log("Usupported product request", query)
			return res.send(json)
		}
		
		// find region of interest
		var inregion = InBBOX(lat, lon, [-80,10,-70,20])
		if( inregion === undefined ) {
			console.log("Not within region for ", lat, lon)
			return res.send( json )
		}
			
		var ymds = []
		while( endTime.isAfter(startTime) || startTime.isSame(endTime)) {
			var ymd = endTime.format("YYYYMMDD")
			ymds.push(ymd)
			endTime.subtract('days', 1);
		}
		
		console.log("Searching for", query)
		
		results = []
		
		entry = sendModisProducts(query, ymds, limit, req, res )
		if( entry ) results.push(entry)
		
		entry = sendRadarsat2Products(query, ymds, limit, req, res )
		if( entry ) results.push(entry)

		entry = sendLandsat8Products(query, ymds, limit, req, res )
		if( entry ) results.push(entry)
		
		res.set("Access-Control-Allow-Origin", "*")
		var json = {
			"objectType": 'query',
			"id": "urn:trmm:"+query,
			"displayName": "OJO Publisher Flood Surface Water Products",
			"replies": {
				"url": originalUrl,
				"mediaType": "application/activity+json",
				"totalItems": results.length,
				"items": results
			}
		}
		res.send(json)
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
		
		console.log("topojson", basename)
		
		if( basename.indexOf(".gz") > 0) {
			console.log("sending ", mime_type, basename, dirname)
			res.header("Content-Type", mime_type, basename)
			console.log(ext, mime_type, "no encoding")
		} else {
			res.header("Content-Type", "application/json")
			res.header("Content-Encoding", "gzip")
			basename += ".gz"
			console.log("sending .topojson application/json gzip", basename)
		}
		
		res.header("Access-Control-Allow-Origin", "*")
		res.sendfile(basename, {root: dirname}) 
	},
	

	
	map: function(req,res) {
		var id 		= req.params["id"]
		var host 	= "http://"+req.headers.host
		
		switch(id) {
		case 'landsat8':
			var region = {
				name: 	"Landsat-8 Flood Map for Haiti",
				scene: 	"LC80090472013357LGN00",
				bbox: 	[-73.94358, 17.74510, -71.76917, 19.81187],
				centerlat: (19.83792+17.72199)/2,
				centerlon: (-73.93045-71.76917)/2,
			    UL_LAT: 19.83792,
			    UL_LON: -73.93045,
			    UR_LAT: 19.81187,
			    UR_LON: -71.76917,
			    LL_LAT: 17.74510,
			    LL_LON: -73.94358,
			    LR_LAT: 17.72199,
			    LR_LON: -71.80878
			}
			var topojson=	host+"/topojson/LC80090472013357LGN00_WATERMAP.tif.hand.tif.pgm.topojson"
			render_map(region, topojson, req, res)
			break;
			
		case 'modis':
			var region = {
				name: 	"MODIS Flood Map for Haiti",
				scene: 	"080W020N_2D2OT",
				bbox: 	[-80, 10, -70, 20],
				centerlat: 15,
				centerlon: -75,
			    UL_LAT: 20,
			    UL_LON: -80,
			    UR_LAT: 20,
			    UR_LON: -70,
			    LL_LAT: 10,
			    LL_LON: -80,
			    LR_LAT: 10,
			    LR_LON: -70
			}
			var topojson=	host+"/topojson/SWP_2012234_080W020N_2D2OT.topojson"
			render_map(region, topojson, req, res)
			break;
			
		case 'radarsat2':
			var region = {
				name: 	"Radarsat-2 Flood Map for Haiti",
				scene: 	"RS2_OK33065_PK325251_DK290050_F6F_20120825_230857_HH_SGF",
				bbox: 	[-72.987, 19.677, -72.364, 19.216],
				centerlat: (19.677+19.216)/2,
				centerlon: (-72.987-72.364)/2,
			    UL_LAT: 19.216,
			    UL_LON: -72.987,
			    UR_LAT: 19.216,
			    UR_LON: -72.364,
			    LL_LAT: 19.216,
			    LL_LON: -72.987,
			    LR_LAT: 19.216,
			    LR_LON: -72.364
			}
			var topojson=	host+"/topojson/surface_water.topojson"
			render_map(region, topojson, req, res)
			break;
		}
	},
	
	landsat8: function(req, res) {
		var host = "http://"+req.headers.host
		var region = {
			name: 	"Haiti",
			scene: 	"LC80090472013357LGN00",
			bbox: 	[-73.94358, 17.74510, -71.76917, 19.81187],
			target: [(19.83792+17.72199)/2, (-73.93045-71.76917)/2]
		}
		res.render("products/l8", {
			fbAppId: 		app.config.fbAppId,
			description: 	"Landsat-8 Flood Map",
			image: 			host+"/data/LC80090472013357LGN00_watermap_browseimage.thn.png",
			url: 			host+"/products/landsat8",
			date: 			"2013-12-23T15:16:23Z",
			region: 		region,
			topojson: 		host+"/topojson/LC80090472013357LGN00_WATERMAP.tif.hand.tif.pgm.topojson.gz"
		})
	},
	
	radarsat2: function(req, res) {
		var host = "http://"+req.headers.host
		var region = {
			name: 	"Haiti",
			scene: 	"RS2_OK33065_PK325251_DK290050_F6F_20120825_230857_HH_SGF",
			bbox: 	[-72.987, 19.677, -72.364, 19.216],
			target: [(19.677+19.216)/2, (-72.987-72.364)/2]

		}
		res.render("products/l8", {
			fbAppId: 		app.config.fbAppId,
			description: 	"Landsat-8 Flood Map",
			image: 			host+"/data/surface_water_osm.png",
			url: 			host+"/products/landsat8",
			date: 			"2012-08-25T23:08:57Z",
			region: 		region,
			topojson: 		host+"/topojson/surface_water.topojson.gz"
		})
	},
	
	modis: function(req, res) {
		var host = "http://"+req.headers.host
		var region = {
			name: 	"Haiti",
			scene: 	"080W020N_2D2OT",
			bbox: 	[-80, 10, -70.76917, 20],
			target: [15, -75]
		}
		res.render("products/modis", {
			fbAppId: 		app.config.fbAppId,
			description: 	"MODIS Flood Map",
			image: 			host+"/data/OSM_SWP_2012234_080W020N.png",
			url: 			host+"/products/landsat8",
			date: 			"2012-12-23",
			region: 		region,
			data: 			"http://oas.gsfc.nasa.gov/floodmap/getTile.php?location=080W020N&day=234&year=2012&product=2",
			topojson: 		host+"/topojson/SWP_2012234_080W020N_2D2OT.topojson.gz",
			layout: 		false
		})
	}
}
