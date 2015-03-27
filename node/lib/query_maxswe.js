var util 		= require('util'),
	fs			= require('fs'),
	async	 	= require('async'),
	path		= require('path'),
	moment		= require('moment'),
	_			= require('underscore'),
	Hawk		= require('hawk'),
	filesize 	= require('filesize')
	;
	
	var BUCKET  = 'ojo-workshop';
	
	function padDoy( doy ) {
		if( doy < 10 ) {
			doy = "00"+doy
		} else if( doy < 100 ) {
			doy = "0"+doy
		}
		return doy
	}
	
	function QueryByID(req, user, year, doy, credentials, cb ) {
		var date			= moment(year+"-"+doy)
		var duration		= 60 * 30
		var id				= year.toString() + doy
		var host 			= "http://"+req.headers.host
		
		function Bewit(url) {
			if( credentials ) {
				var bewit = Hawk.uri.getBewit(url, { credentials: credentials, ttlSec: duration, ext: user.email })
				url += "?bewit="+bewit
			}
			return url;
		}
	
		var month = date.month() + 1
		if( month < 10 ) month = "0"+ month

		var day		= date.date();
		if( day < 10 ) day = "0"+day
			
		var key =  "maxswe" + "/" + date.year() + "/" + doy + "/" + "maxswe."+date.year()+month+day+".120000.tif"
		
		// Check if object exists
		var params = {
			Bucket: BUCKET,
			Key: key
		};
		
		//console.log("Checking", params)
		
		app.s3.headObject(params, function(err, data) {
			if (err) return cb(null,null)
				
			console.log("found", key)
				
			var s3host				= "https://s3.amazonaws.com/ojo-workshop/maxswe/2015/079/"
			var browse_img_url		= s3host+"maxswe."+date.year()+month+day+".120000_thn.jpg"
			var topojson_url		= s3host+"maxswe."+date.year()+month+day+".120000_levels.topojson"
			var topojson_file		= s3host+"maxswe."+date.year()+month+day+".120000_levels.topojson.gz"
			
			actions = [
				{ 
					"@type": 			"ojo:browse",
					"displayName": 		req.gettext("actions.browse"),
					"using": [{
						"@type": 		"as:HttpRequest",
						"method": 		"GET",
						"url": 			host+"/products/maxswe/browse/"+year+"/"+doy,
						"mediaType": 	"html"
					}]
				},
				{
					"@type": 			"ojo:download",
					"displayName": 		req.gettext("actions.download"),
					"using": [
						{
							"@type": 		"as:HttpRequest",
							"method": 		"GET",
							"url": 			topojson_url,
							"mediaType": 	"application/json",
							"displayName": 	req.gettext("formats.topojson")
						},
						{
							"@type": 		"as:HttpRequest",
							"method": 		"GET",
							"url": 			topojson_file,
							"mediaType": 	"application/gzip",
							"displayName": 	req.gettext("formats.topojsongz")
						}	
					]
				},
				{
					"@type": 			"ojo:map",
					"displayName": 		req.gettext("actions.map"),
					"using": [
						{
							"@type": 		"as:HttpRequest",
							"method": 		"GET",
							"@id": 			"legend",
							"url": 			host+"/mapinfo/maxswe/legend",
							"mediaType": 	"text/html",
							"displayName": 	req.gettext("mapinfo.legend")
						},
						{
							"@type": 		"as:HttpRequest",
							"method": 		"GET",
							"@id": 			"style",
							"url": 			host+"/mapinfo/maxswe/style",
							"mediaType": 	"application/json",
							"displayName": 	req.gettext("mapinfo.style")
						},
						{
							"@type": 		"as:HttpRequest",
							"method": 		"GET",
							"@id": 			"credits",
							"url": 			host+"/mapinfo/maxswe/credits",
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
				"resolution": {
					"@label": req.gettext("properties.resolution"),
					"@value": "400m"
				}
			}
				
			var entry = {
				"@id": 			id,
				"@type": 		"geoss:snow_water_equivalent",
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
						[40, 60],
						[40, 80],
						[20, 80],
						[20, 60],
						[40, 60]
					]]
				},
				"action": 			actions
			}
			
			cb(null,entry)
		})
	}
	
	function checkMaxSWE( req, user, d, startTime, endTime, credentials, entries, callback ) {
		time				= endTime.clone()
		time	 			= time.subtract(d, "days");
	
		var year 			= time.year();
		var doy  			= padDoy(time.dayOfYear());
			
		QueryByID(req, user, year, doy, credentials, function(err, data) {
			if( !err && data) entries.push(data)
			callback(null)
		})
	}

	
	function QueryMaxSWE(req, user, credentials, host, query, bbox, lat, lon, startTime, endTime, startIndex, itemsPerPage, limit, cb ) {
		console.log("QueryMaxSWE")
		
		if( query != 'snow_water_equivalent') {
			logger.info("unsupported query", query)
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
	
		if( lat && (lat < 20 || lat> 40) ) {
			logger.error("outside lat", lat)
			return cb(null, null)	
		}
	
		if( lon && (lon < 60 || lon> 80) ) {
			logger.error("outside lon", lon)
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
				checkMaxSWE( req, user, d, startTime, endTime, credentials, entries, callback )
			} else {
				callback(null, null)
			}
		}, function(err) {
			var json = {
				replies: {
					items: entries
				}
			}
			cb(null, json)	
		})
	}
	
	
	module.exports.QueryMaxSWE 	= QueryMaxSWE;
	module.exports.QueryByID 	= QueryByID;
	