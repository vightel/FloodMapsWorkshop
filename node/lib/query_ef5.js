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
	
	function padDoy( doy ) {
		if( doy < 10 ) {
			doy = "00"+doy
		} else if( doy < 100 ) {
			doy = "0"+doy
		}
		return doy
	}
	
	function QueryByID(req, user, year, doy, credentials) {
		var products_url 	= host+"/ef5/products/"+year+"/"+doy
		var localdir	 	= app.root+"/../data/ef5/"+year+"/"+doy
		var host 			= "http://"+req.headers.host
		var date			= moment(year+"-"+doy)
		var duration		= 60 * 30
		var id				= year.toString() + doy
		
		function Bewit(url) {
			if( credentials ) {
				var bewit = Hawk.uri.getBewit(url, { credentials: credentials, ttlSec: duration, ext: user.email })
				url += "?bewit="+bewit
			}
			return url;
		}
	
		if( fs.existsSync(localdir)) {
			console.log("Found", localdir)
			var browse_img_url		= host+"/products/flood_forecast/"+year+"/"+doy+"/thn.png"
			var topojson_url		= host+"/products/flood_forecast/"+year+"/"+doy+"/"+year+doy+"_flood_forecast.topojson"
			var topojson_file		= app.root+"/../data/ef5/"+year+"/"+doy+"/"+year+doy+"_flood_forecast.topojson.gz"
			
			var stats = { size: 0 }
			try {
				stats	= fs.statSync( topojson_file )
			} catch(e) {
				console.log("Could not stat", topojson_file, e)
			}
			
			actions = [
				{ 
					"@type": 			"ojo:browse",
					"displayName": 		req.gettext("actions.browse"),
					"using": [{
						"@type": 		"as:HttpRequest",
						"method": 		"GET",
						"url": 			Bewit(host+"/products/flood_forecast/browse/"+year+"/"+doy),
						"mediaType": 	"html"
					}]
				},
				{
					"@type": 			"ojo:download",
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
					]
				},
				{
					"@type": 			"ojo:map",
					"displayName": 	req.gettext("actions.map"),
					"using": [
						{
							"@type": 		"as:HttpRequest",
							"method": 		"GET",
							"@id": 			"legend",
							"url": 			host+"/mapinfo/flood_forecast/legend",
							"mediaType": 	"text/html",
							"displayName": 	req.gettext("mapinfo.legend")
						},
						{
							"@type": 		"as:HttpRequest",
							"method": 		"GET",
							"@id": 			"style",
							"url": 			host+"/mapinfo/flood_forecast/style",
							"mediaType": 	"application/json",
							"displayName": 	req.gettext("mapinfo.style")
						},
						{
							"@type": 		"as:HttpRequest",
							"method": 		"GET",
							"@id": 			"credits",
							"url": 			host+"/mapinfo/flood_forecast/credits",
							"mediaType": 	"application/json",
							"displayName": 	req.gettext("mapinfo.credits")
						}
					]
				}
			]
			
			var source 		= req.gettext("sources.ef5")
			var sensor 		= req.gettext("sensors.ef5")
	
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
						"@value": "400m"
					}
					
			}
				
			var entry = {
				"@id": 			id,
				"@type": 		"geoss:flood_forecast",
				"displayName": 	id,
				"image": 		[ 
									{
										"url": browse_img_url,
										"mediaType": "image/png",
										"rel": "browse"
									}
								],
				"properties": 		properties,
				"geometry": {
					"type": "Polygon",
					"coordinates": [[
						[11.0249996, -30.0833340],
						[11.0249996, -12.0833330],
						[26.5250004, -12.0833330],
						[26.5250004, -30.0833340],
						[11.0249996, -30.0833340]
					]]
				},
				"action": 			actions
			}
			
			return entry
		} else {
			return null
		}
	}
	
	function checkEF5( req, user, d, startTime, endTime, credentials, entries, callback ) {
		time				= endTime.clone()
		time	 			= time.subtract(d, "days");
	
		var year 			= time.year();
		var doy  			= padDoy(time.dayOfYear());
			
		var entry = QueryByID(req, user, year, doy, credentials)

		if( entry ) {	
			//debug(entry)
			entries.push(entry)
			callback(null)
		} else {
			callback(null)			
		}
	}

	
	function QueryEF5(req, user, credentials, host, query, bbox, lat, lon, startTime, endTime, startIndex, itemsPerPage, limit, cb ) {
	
		//console.log("Query Modis", bbox, itemsPerPage, startIndex, "bbox:", bbox, "lat:", lat, "lon:", lon )
	
		if( query != 'flood_forecast') {
			//logger.info("unsupported query", query)
			return cb(null, null)
		}

		if( bbox && !ValidateBBox(bbox)) {
			logger.error("invalid bbox", bbox)
			return cb(null, null)
		}
	
		if( startTime && !startTime.isValid()) {
			logger.error("Invalid start time: "+ startTime)
			return cb(null, null)
		}
	
		if( endTime && !endTime.isValid()) {
			logger.error( "Invalid end time: "+ endTime)
			return cb(null, null)
		}
	
		if( startIndex && startIndex < 0 ) {
			logger.error("Invalid startIndex: "+startIndex)			
			return cb(null, null)	
		}
	
		if( itemsPerPage && itemsPerPage < 0 ) {
			logger.error("Invalid itemsPerPage: "+itemsPerPage)			
			return cb(null, null)		
		}
	
		if( lat && (lat < -21 || lat>-12) ) {
			return cb(null, null)	
		}
	
		if( lon && (lon < 15 || lon>23) ) {
			return cb(null, null)		
		}
			
		if( bbox ) {
			lon = (bbox[0]+bbox[2])/2
			lat = (bbox[1]+bbox[3])/2
		}
		
		// we only have one scene here... we can fix this later
		var days = []
		itemsPerPage = 100;
		for( var i=0; i<itemsPerPage; i++ ) {
			days.push(i)
		}
	
		entries		= []
	
		async.each(days, function(d, callback) {
			if( entries.length < limit ) {
				checkEF5( req, user, d, startTime, endTime, credentials, entries, callback )
			} else {
				callback(null, null)
			}
		}, function(err) {
			//console.log("Modis LST Done", err, entries.length)
			var json = {
				replies: {
					items: entries
				}
			}
			cb(null, json)	
		})
	}
	
	
	module.exports.QueryEF5 	= QueryEF5;
	module.exports.QueryByID 	= QueryByID;
	