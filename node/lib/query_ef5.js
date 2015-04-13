var util 		= require('util'),
	fs			= require('fs'),
	async	 	= require('async'),
	path		= require('path'),
	moment		= require('moment'),
	sprintf 	= require("sprintf-js").sprintf,
	_			= require('underscore'),
	Hawk		= require('hawk'),
<<<<<<< HEAD
	filesize 	= require('filesize'),
	Query		= require('./query_s3');

	var	bbox		=	[60, 40, 80, 20];				// lng,lat bottom left - top right
	var	centerlon	=  	(bbox[0]+bbox[2])/2;
	var	centerlat	=	(bbox[1]+bbox[3])/2;;
	
	var options = {
		bucket: 		'ojo-workshop',
		subfolder: 		'ef5',
		browse_img: 	"_thn.jpg",
		geojson: 		undefined,
		topojson: 		".topojson",
		topojson_gz: 	".topojson.gz",
		source: 		'sources.ef5',
		sensor: 		'sensors.ef5',
		resolution: 	'400m',
		original_url:   'http://flash.ou.edu/pakistan/',
		product: 		'flood_forecast',
		tags: 			['flood_forecast','flood', 'hazard', 'disaster'],
		bbox: 			bbox,							// lng,lat bottom left - top right
		target: 		[centerlon, centerlat],
		minzoom: 		6
	}

	options.credits	= function(req) {
		var json = {
			"credits":  req.gettext("legend.flood_forecast.credits"),
			"url": 		"http://flash.ou.edu/namibia/",
		};
		return json;
	}

	options.style = function(req) {
		var json = {
			"{height}==1": {
				color: "#fee5d9", 	
				weight: 2
			},
			"{height}==2": {
				color: "#fcbba1", 	
				weight: 2
			},
			"{height}==3": {
				color: "#fc9272", 	
				weight: 2
			},
			"{height}==5": {
				color: "#fb6a4a", 	
				weight: 2
			},
			"{height}==8": {
				color: "#ef3b2c", 	
				weight: 2
			},
			"{height}==13": {
				color: "#cb181d", 	
				weight: 2
			},
			"{height}==21": {
				color: "#99000d", 	
				weight: 2
			}
		}
		return json
	}

	options.legend = function(req) {
		var html = "<style id='flood_forecast_legend_style' >"

	    html += ".flood_forecast_map-info .legend-scale ul {"
	    html += "   margin: 0;"
	    html += "   margin-bottom: 5px;"
	    html += "   padding: 0;"
	    html += "   float: left;"
	    html += "   list-style: none;"
	    html += "   }"
		html += ".flood_forecast_map-info .legend-scale ul li {"
		html += "   font-size: 80%;"
		html += "   list-style: none;"
		html += "    margin-left: 0;"
		html += "    line-height: 18px;"
		html += "    margin-bottom: 2px;"
		html += "}"
	    html += ".flood_forecast_map-info ul.legend-labels li span {"
	    html += "  display: block;"
	    html += "  float: left;"
	    html += "  height: 16px;"
	    html += "  width: 30px;"
	    html += "  margin-right: 5px;"
	    html += "  margin-left: 0;"
	    html += "  border: 1px solid #999;"
	    html += "}"
	    html += ".flood_forecast_map-info .legend-source {"
	    html += "   font-size: 70%;"
	    html += "   color: #999;"
	    html += "   clear: both;"
	    html += "}"
		html += ".flood_forecast_map-info {"
		html += "    padding: 6px 8px;"
		html += "    font: 14px/16px Arial, Helvetica, sans-serif;"
		html += "    background: white;"
		html += "    background: rgba(255,255,255,0.8);"
		html += "    box-shadow: 0 0 15px rgba(0,0,0,0.2);"
		html += "    border-radius: 5px;"
		html += "	 position: relative;"
		html += "	 float: left;"
		html += "    line-height: 18px;"
		html += "    color: #555;"
	
		html += "}"
		html += "</style>"
	
		html += "<div id='flood_forecast_legend' class='flood_forecast_map-info'>"
		html += "  <div class='legend-title'>"+ req.gettext("legend.flood_forecast.title")+"</div>"
		html += "  <div class='legend-scale'>"
		html += "    <ul class='legend-labels'>"
		html += "	   <li><span style='background: #fee5d9'></span>&nbsp;"+ req.gettext("legend.flood_forecast.legend.1m") +"</li>"
		html += "	   <li><span style='background: #fcbba1'></span>&nbsp;"+ req.gettext("legend.flood_forecast.legend.2m") +"</li>"
		html += "	   <li><span style='background: #fc9272'></span>&nbsp;"+ req.gettext("legend.flood_forecast.legend.3m") +"</li>"
		html += "	   <li><span style='background: #fb6a4a'></span>&nbsp;"+ req.gettext("legend.flood_forecast.legend.5m") +"</li>"
		html += "	   <li><span style='background: #ef3b2c'></span>&nbsp;"+ req.gettext("legend.flood_forecast.legend.8m") +"</li>"
		html += "	   <li><span style='background: #cb181d'></span>&nbsp;"+ req.gettext("legend.flood_forecast.legend.13m") +"</li>"
		html += "	   <li><span style='background: #99000d'></span>&nbsp;"+ req.gettext("legend.flood_forecast.legend.21m") +"</li>"
		html += "    </ul>"
		html += "  </div>"
		html += "<div class='legend-source'>"+ req.gettext("legend.flood_forecast.source.label")+": <a href='http://flash.ou.edu/namibia/'>"+ req.gettext("legend.flood_forecast.source.source")+"</a>"
		html += "</div>&nbsp;&nbsp;"
	
		//console.log("legend title", req.gettext("legend.flood_forecast.title"))
	
		return html
	}
	
	var query				= new Query(options)
	module.exports.query	= query;
=======
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
	
>>>>>>> dd153ceacf95e6b97fc07edf09976e11b6467e18
