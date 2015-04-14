var util 		= require('util'),
	fs			= require('fs'),
	async	 	= require('async'),
	path		= require('path'),
	moment		= require('moment'),
	_			= require('underscore'),
	Hawk		= require('hawk'),
	filesize 	= require('filesize')
	;
	
	var BUCKET  	= 'ojo-workshop';
	var subfolder 	=  "ls"
	var bucketList 	= {}
	
	function padDoy( doy ) {
		if( doy < 10 ) {
			doy = "00"+doy
		} else if( doy < 100 ) {
			doy = "0"+doy
		}
		return doy
	}
	
	function InBBOX( lat, lon, bbox) {
		if( (lat > bbox[1]) && (lat< bbox[3]) && (lon > bbox[0]) && (lon < bbox[2]) ) return true;
		return false
	}
	
	// Find Region that would match that Lat/Lon
	function FindRegionKey(lat, lon) {
		var regions = app.config.regions
		for( var r in regions ) {
			var region = regions[r]
			if( r != "Global ") {
				if( InBBOX(lat, lon, region.bbox)) {
					return r
				}
			}
		}
		return undefined
	}
	
	function QueryByID(req, user, year, doy, regionKey, credentials ) {
		var date			= moment(year+"-"+doy)
		var duration		= 60 * 30
		var id				= "pop_2011"
		var host 			= "http://"+req.headers.host
		var bucket			= app.config.regions[regionKey].bucket
		console.log("QueryByID")
		
		function Bewit(url) {
			if( credentials ) {
				var bewit = Hawk.uri.getBewit(url, { credentials: credentials, ttlSec: duration, ext: user.email })
				url += "?bewit="+bewit
			}
			return url;
		}
	
		var month = date.month() + 1
		if( month < 10 ) month = "0"+ month

		var jday	= date.dayOfYear()
		if( jday < 10 ) {
			jday = "00"+jday
		} else if( jday < 100 ) jday = "0"+jday

		var day		= date.date();
		if( day < 10 ) day = "0"+day
			
		var key =  "ls/2011"+"/"
		
		if( bucketList[key] != undefined ) {	
			var artifacts			= bucketList[key]
						
			var s3host				= "https://s3.amazonaws.com/"+bucket+"/ls/2011/"
			var browse_img			= "ls.2011_thn.jpg"
			var topojson_file		= "ls.2011.topojson"
			var topojson_gz_file	= "ls.2011.topojson.gz"
			
			var topojson_size		= _.find(artifacts, function(el) { return el.key == topojson_file}).size
			var topojson_gz_size	= _.find(artifacts, function(el) { return el.key == topojson_gz_file }).size
			
			actions = [
				{ 
					"@type": 			"ojo:browse",
					"displayName": 		req.gettext("actions.browse"),
					"using": [{
						"@type": 		"as:HttpRequest",
						"method": 		"GET",
						"url": 			Bewit(host+"/products/"+regionKey+"/browse/pop/"+year+"/"+doy),
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
							"url": 			s3host+topojson_file,
							"mediaType": 	"application/json",
							"size": 		filesize(topojson_size),
							"displayName": 	req.gettext("formats.topojson")
						},
						{
							"@type": 		"as:HttpRequest",
							"method": 		"GET",
							"url": 			s3host+topojson_gz_file,
							"mediaType": 	"application/gzip",
							"size": 		filesize(topojson_gz_size),
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
							"url": 			host+"/mapinfo/pop/legend",
							"mediaType": 	"text/html",
							"displayName": 	req.gettext("mapinfo.legend")
						},
						{
							"@type": 		"as:HttpRequest",
							"method": 		"GET",
							"@id": 			"style",
							"url": 			host+"/mapinfo/pop/style",
							"mediaType": 	"application/json",
							"displayName": 	req.gettext("mapinfo.style")
						},
						{
							"@type": 		"as:HttpRequest",
							"method": 		"GET",
							"@id": 			"credits",
							"url": 			host+"/mapinfo/pop/credits",
							"mediaType": 	"application/json",
							"displayName": 	req.gettext("mapinfo.credits")
						}
					]
				}
			]
			
			var source 		= req.gettext("sources.ls")
			var sensor 		= req.gettext("sensors.ls")
	
			var properties = {
				"source": {
					"@label": req.gettext("properties.source"),
					"@value": source
				},
				"date": {
					"@label": req.gettext("properties.date"),
					"@value": 2011
				},
				"resolution": {
					"@label": req.gettext("properties.resolution"),
					"@value": "30 arc-second or about 1km"
				}
			}
				
			var entry = {
				"@id": 			id,
				"@type": 		"geoss:population_count",
				"displayName": 	id,
				"image": 		[ 
									{
										"url": s3host+browse_img,
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
			//console.log(entry)
			return entry
		} else {
			return undefined
		}
	}
	
	function check( req, user, d, startTime, endTime, regionKey, credentials, entries, callback ) {
		var time			= endTime.clone()
		time	 			= time.subtract(d, "days");
	
		var year 			= time.year();
		var doy  			= padDoy(time.dayOfYear());
			
		var entry = QueryByID(req, user, year, doy, regionKey, credentials)
		entries.push(entry)
	}

	
	function QueryAll(req, user, credentials, host, query, bbox, lat, lon, startTime, endTime, startIndex, itemsPerPage, limit, cb ) {
		console.log("Query LS")

		// override default bucket based on location
		var regionKey  	= FindRegionKey(lat, lon)
		var bucket		= app.config.regions[regionKey].bucket
		
		if( query != 'population_count') {
			logger.info("unsupported query", query)
			return cb(null, null)
		}

		//if( bbox && !ValidateBBox(bbox)) {
		//	logger.error("invalid bbox", bbox)
		//	return cb(null, null)
		//}
	
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
		//var days = []
		//itemsPerPage = limit;
		//for( var i=0; i<itemsPerPage; i++ ) {
		//	days.push(i)
		//}
	
		entries		= []

		//
		// List all objects in bucket/subfolder
		//
		function listObjects(next) {
			// Get a list of all objects in that bucket's subfolder (WARNING: limit=1000)
			var params = {
				Bucket: bucket,
				Prefix: 'ls'
			};
	
			app.s3.listObjects(params, function(err, data) {
				if (err) {
					console.log(err, err.stack); 	// an error occurred
					next(err)
				} else {
					//console.log(data);				// successful response
			
					bucketList 		= {}
					var contents 	= data.Contents
					_.each(data.Contents, function(elt) {
						var size 	= elt.Size
						var arr		= elt.Key.split("/")
						var name	= _.last(arr)
						var key		= elt.Key.replace(name, "")
				
						//console.log("found key", key)
				
						if( bucketList[key] != undefined ) {
							bucketList[key].push( { key: name, size: size } )
						} else {
							bucketList[key] = [ { key: name, size: size } ]
							console.log("added to key", key, name)
						}					
					})
					//console.log( JSON.stringify(bucketList))
					next(null)
				}    
			});
		}

		function checkAllRequestedDays(next) {
			check( req, user, null, startTime, endTime, regionKey, credentials, entries )
			next(null)
		}	
		
		async.series([
			listObjects, checkAllRequestedDays
		], function(err) {
			var json = {}
		
			if( !err ) {
				json.replies = {
					items: entries
				}
			}
			cb(err, json)			
		})
	}
	
	module.exports.QueryAll 	= QueryAll;
	module.exports.QueryByID 	= QueryByID;
	