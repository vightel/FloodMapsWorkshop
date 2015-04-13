var util 		= require('util'),
	fs			= require('fs'),
	async	 	= require('async'),
	path		= require('path'),
	moment		= require('moment'),
	_			= require('underscore'),
	Hawk		= require('hawk'),
<<<<<<< HEAD
	filesize 	= require('filesize'),
	Query		= require('./query_s3');

	var	bbox		=	[60, 40, 80, 20];				// lng,lat bottom left - top right
	var	centerlon	=  	(bbox[0]+bbox[2])/2;
	var	centerlat	=	(bbox[1]+bbox[3])/2;
	
	var options = {
		bucket: 		'ojo-workshop',
		subfolder: 		'maxswe',
		browse_img: 	".120000_thn.jpg",
		geojson: 		undefined,
		topojson: 		".120000_levels.topojson",
		topojson_gz: 	".120000_levels.topojson.gz",
		source: 		'sources.ef5',
		sensor: 		'sensors.ef5',
		resolution: 	'400m',
		original_url:   'http://flash.ou.edu/pakistan/',
		product: 		'snow_water_equivalent',
		tags: 			['snow_water_equivalent', 'swe'],
		bbox: 			bbox,							// lng,lat bottom left - top right
		target: 		[centerlon, centerlat],
		minzoom: 		6
	}
	
	var colors = ["#f7fcf0","#e0f3db","#ccebc5","#a8ddb5","#7bccc4","#4eb3d3","#2b8cbe","#0868ac","#084081"]
	
	options.credits	= function(req) {
		var json = {
			"credits":  req.gettext("legend.snow_water_equivalent.credits"),
			"url": 		"http://flash.ou.edu/pakistan/",
		};
		return json;
	}

	options.style = function(req) {
		var json = {
			"{swe}==10": {
				color: colors[0], 	
				weight: 2
			},
			"{swe}==20": {
				color: colors[1], 	
				weight: 2
			},
			"{swe}==30": {
				color: colors[2], 	
				weight: 2
			},
			"{swe}==50": {
				color: colors[3], 	
				weight: 2
			},
			"{swe}==80": {
				color: colors[3], 	
				weight: 2
			},
			"{swe}==130": {
				color: colors[4], 	
				weight: 2
			},
			"{swe}==210": {
				color: colors[5], 	
				weight: 2
			},
			"{swe}==340": {
				color: colors[6], 	
				weight: 2
			},
			"{swe}==550": {
				color: colors[7], 	
				weight: 2
			}
		}
		return json
	}

	options.legend = function(req) {
		var html = "<style id='maxswe_legend_style' >"
	    html += ".maxswe_map-info .legend-scale ul {"
	    html += "   margin: 0;"
	    html += "   margin-bottom: 5px;"
	    html += "   padding: 0;"
	    html += "   float: right;"
	    html += "   list-style: none;"
	    html += "   }"
		html += ".maxswe_map-info .legend-scale ul li {"
		html += "   font-size: 80%;"
		html += "   list-style: none;"
		html += "    margin-left: 0;"
		html += "    line-height: 18px;"
		html += "    margin-bottom: 2px;"
		html += "}"
	    html += ".maxswe_map-info ul.legend-labels li span {"
	    html += "  display: block;"
	    html += "  float: left;"
	    html += "  height: 16px;"
	    html += "  width: 30px;"
	    html += "  margin-right: 5px;"
	    html += "  margin-left: 0;"
	    html += "  border: 1px solid #999;"
	    html += "}"
	    html += ".maxswe_map-info .legend-source {"
	    html += "   font-size: 70%;"
	    html += "   color: #999;"
	    html += "   clear: both;"
	    html += "}"
		html += ".maxswe_map-info {"
		html += "    padding: 6px 8px;"
		html += "    font: 14px/16px Arial, Helvetica, sans-serif;"
		html += "    background: white;"
		html += "    background: rgba(255,255,255,0.8);"
		html += "    box-shadow: 0 0 15px rgba(0,0,0,0.2);"
		html += "    border-radius: 5px;"
		html += "	 position: relative;"
		html += "	 float: right;"
		html += "    line-height: 18px;"
		html += "    color: #555;"
	
		html += "}"
		html += "</style>"
	
		html += "<div id='maxswe_legend' class='maxswe_map-info'>"
		html += "  <div class='legend-title'>"+ req.gettext("legend.snow_water_equivalent.title")+"</div>"
		html += "  <div class='legend-scale'>"
		html += "    <ul class='legend-labels'>"
		html += "	   <li><span style='background: " + colors[0] + "'></span>&nbsp;"+ req.gettext("legend.snow_water_equivalent.legend.10mm") +"</li>"
		html += "	   <li><span style='background: " + colors[1] + "'></span>&nbsp;"+ req.gettext("legend.snow_water_equivalent.legend.20mm") +"</li>"
		html += "	   <li><span style='background: " + colors[2] + "'></span>&nbsp;"+ req.gettext("legend.snow_water_equivalent.legend.30mm") +"</li>"
		html += "	   <li><span style='background: " + colors[3] + "'></span>&nbsp;"+ req.gettext("legend.snow_water_equivalent.legend.50mm") +"</li>"
		html += "	   <li><span style='background: " + colors[4] + "'></span>&nbsp;"+ req.gettext("legend.snow_water_equivalent.legend.80mm") +"</li>"
		html += "	   <li><span style='background: " + colors[5] + "'></span>&nbsp;"+ req.gettext("legend.snow_water_equivalent.legend.130mm") +"</li>"
		html += "	   <li><span style='background: " + colors[6] + "'></span>&nbsp;"+ req.gettext("legend.snow_water_equivalent.legend.210mm") +"</li>"
		html += "	   <li><span style='background: " + colors[7] + "'></span>&nbsp;"+ req.gettext("legend.snow_water_equivalent.legend.340mm") +"</li>"
		html += "	   <li><span style='background: " + colors[8] + "'></span>&nbsp;"+ req.gettext("legend.snow_water_equivalent.legend.550mm") +"</li>"
		html += "    </ul>"
		html += "  </div>"
		html += "<div class='legend-source'>"+ req.gettext("legend.snow_water_equivalent.source.label")+": <a href='http://flash.ou.edu/pakistan/'>"+ req.gettext("legend.snow_water_equivalent.source.source")+"</a>"
		html += "</div>&nbsp;&nbsp;"
	
		//console.log("legend title", req.gettext("legend.snow_water_equivalent.title"))
	
		return html
	}
	
	var query	= new Query(options)
	
	module.exports.query 			= query;
=======
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
	
>>>>>>> dd153ceacf95e6b97fc07edf09976e11b6467e18
