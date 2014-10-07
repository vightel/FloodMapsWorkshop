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

function getTileInfo( tile ) {
	var lon = parseFloat(tile.substring(0,3))
	var ew  = tile[3]
	var ns 	= tile[7]
	var lat = parseFloat(tile.substring(4,7))
	if( ew == 'W') lon = -lon
	if( ns == 'S') lat = -lat
	
	var scene = {
		"centerlat": lat - 5.0,
		"centerlon": lon - 5.0,
		"bbox": [lon, lat-10.0, lon+10.0,lat],
		"ncols": 4552,
		"nlines": 4552
	}
	//console.log("Scene", scene)
	return scene
}

function IsProductAvailable( urlstr, cb, errfn ) {
	var uri = url.parse(urlstr);

	var options = {
	  host: uri.host,
	  path: uri.pathname,
	  method: 'HEAD'
	};

	var req = http.request(options, function(res, next) {
		if( res.statusCode == 200 ) {
			cb();
		} else {
			errfn(urlstr);
		}
	});
	req.end();
}

function GetFileSize(filename) {
	var stat = fs.statSync(filename)

	var str;
	var size = stat.size / 1000;
	if( size > 1000 ) {
		size /= 1000;
		str = size.toFixed(1)+"MB";
	} else {
		str = size.toFixed(1)+"KB";
	}
	return str;
}

function ValidateBBox( bbox ) {
	console.log("Validate bbox", bbox)
	if( bbox[0] < -180 || bbox[0] > 180 ) 	return false
	if( bbox[2] < -180 || bbox[2] > 180 ) 	return false
	if( bbox[1] < -90  || bbox[1] > 90 ) 	return false
	if( bbox[3] < -90  || bbox[3] > 90 ) 	return false
	return true
}

function ValidateTime( dt ) {
	console.log(dt.format())
	return dt.isValid()
}

function truncate(n) {
  return Math[n > 0 ? "floor" : "ceil"](n);
}

function TileName( latitude, longitude ) {
	var ilat = parseInt(latitude);
	var ilon = parseInt(longitude);

	var tenlat = truncate(ilat / 10);
	var tenlon = truncate(ilon / 10);

	var latstr, lonstr;

	if( tenlat > 0 ) {
		tenlat += 1
		latstr = sprintf("%03dN", tenlat*10);
	} else {
		tenlat -= 1
		latstr = sprintf("%03dS", -tenlat*10);
	}

	if( tenlon > 0 ) {
		tenlon += 1
		lonstr = sprintf("%03dE", tenlon*10);
	} else {
		tenlon -= 1
		lonstr = sprintf("%03dW", -tenlon*10 );
	}
	//console.log( ilat + " " + ilon + " tenlat:"+tenlat+" tenlong:"+tenlon+" -> " + lonstr+latstr);
	return lonstr+latstr;
}

function GetModisTiles(lat, lon, bbox ) {
	if( lat && lon ) {
		var tile = TileName(lat,lon)
		if( _.find(app.config.valid_modis_tiles, function(t) { 
			return t==tile;
		 })) {
			return [tile]
		} else {
			console.log("Sorry not in cfig")
			return []
		}
	} else {
		// TODO
		return []
	}
}

function checkModisProduct(tile, d, startTime, endTime, host, entries, Bewit, cb ) {
	time				= endTime.clone()
	time	 			= time.subtract(d, "days");
	
	var year 			= time.year();
	var doy  			= padDoy(time.dayOfYear());
	var id				= year.toString() + doy+"_"+tile
	
	console.log("checkModisProduct", year, doy, id)
	
	var products_url 	= host+"/modis/products/"+year+"/"+doy
	var localdir	 	= app.root+"/../data/modis/"+year+"/"+doy+"/"+tile
	var scene			= getTileInfo( tile )
	
	var download, process, browse, share, actions;

	if( fs.existsSync(localdir)) {
		console.log("Found", localdir)
		var browse_img_url	= host +"/img/modis.png";
		var scene			= getTileInfo( tile )

		browse_img_url		= host+"/products/modis/"+year+"/"+doy+"/"+tile+"/OSM_SWP_"+id+".png"
		topojson_url		= host+"/products/modis/"+year+"/"+doy+"/"+tile+"/SWP_"+id+"_2D2OT.topojson"
		topojson_file		= app.root+"/../data/modis/"+year+"/"+doy+"/"+tile+"/SWP_"+id+"_2D2OT.topojson.gz"
		
		var stats = { size: 0 }
		try {
			stats	= fs.statSync( topojson_file )
		} catch(e) {
			console.log("Could not stat", topojson_file, e)
		}
				
		actions = [
			{ 
				"@type": 			"urn:ojo:actions:browse",
				"displayName": 		req.gettext("actions.browse"),
				"using": {
					"@type": 		"http://activitystrea.ms/2.0/HttpRequest",
					"method": 		"GET",
					"url": 			Bewit(host+"/products/modis/browse/"+year+"/"+doy+"/"+tile),
					"mediaType": 	"html"
				} 
			},
			{
				"@type": 		"urn:ojo:actions:download",
				"displayName": 	req.gettext("actions.download"),
				"using": [
					{
						"@type": 		"http://activitystrea.ms/2.0/HttpRequest",
						"method": 		"GET",
						"url": 			Bewit(topojson_url),
						"mediaType": 	"application/json",
						"size": 		app.locals.filesize(stats.size, req),
						"displayName": 	req.gettext("formats.topojson")
					}
					,{
						"@type": 		"http://activitystrea.ms/2.0/HttpRequest",
						"method": 		"GET",
						"url": 			Bewit(topojson_url+".gz"),
						"mediaType": 	"application/gzip",
						"size": 		app.locals.filesize(stats.size, req),
						"displayName": 	req.gettext("formats.topojsongz")
					}	
				]
			}
		]
	} else {
		console.log("Modis dir not Found", localdir)
		
		var browse_img_url	= host +"/img/modis.png";
		var scene			= getTileInfo( tile )
		var duration		= 1	
		
		actions = {
			"@type": 			"urn:ojo:actions:process",
			"displayName": 		req.gettext("actions.process"),
			"using": [{
				"@type": 		"http://activitystrea.ms/2.0/HttpRequest",
				"method": 		"GET",
				"url": 			Bewit(host+"/products/modis/"+year+"/"+doy+"/"+tile),
				"displayName": 	"surface water",
				"duration": 	util.format(req.gettext("duration.minutes").replace("{minutes}","d"),duration)
			}]
		}
	}
	
	var source 		= req.gettext("sources.modis")
	var sensor 		= req.gettext("sensors.modis")
	
	var properties = {}
	properties[req.gettext("properties.source")]= 		source;
	properties[req.gettext("properties.sensor")]= 		sensor;
	properties[req.gettext("properties.date")]= 		time.format(req.gettext("formats.date"));
	properties[req.gettext("properties.bbox")]= 		scene.bbox;
	properties[req.gettext("properties.size")]= 		scene.ncols+"x"+scene.nlines;
	properties[req.gettext("properties.centerlat")]= 	scene.centerlat;
	properties[req.gettext("properties.centerlon")]= 	scene.centerlon;
	
	
	var entry = {
		"@id": 				id,
		"@type": 			"geoss.surface_water",
		"displayName": 		tile,
		"image": 		[ 
							{
								"url": browse_img_url,
								"mediaType": "image/png",
								"rel": "browse"
							}
						],
		"properties": 		properties,
		"action": 			actions
	}
	
	entries.push(entry)
	cb(null)
}

function QueryModis(req, user, credentials, host, query, bbox, lat, lon, startTime, endTime, startIndex, itemsPerPage, cb ) {
	console.log("Query Modis", query)
	var duration	= 60 * 30
	
	function Bewit(url) {
		if( credentials ) {
			var bewit = Hawk.uri.getBewit(url, { credentials: credentials, ttlSec: duration, ext: user.email })
			url += "?bewit="+bewit
		}
		return url;
	}
	
	console.log("Query Modis", bbox, itemsPerPage, startIndex, "bbox:", bbox, "lat:", lat, "lon:", lon )
	
	if( query != 'surface_water') {
		return cb(null, null)
	}

	if( bbox && !ValidateBBox(bbox)) {
		console.log("invalid bbox", bbox)
		return cb(null, null)
	}
	
	if( startTime && !ValidateTime(startTime)) {
		console.log("Invalid start time: "+ startTime)
		return cb(null, null)
	}
	
	if( endTime && !ValidateTime(endTime)) {
		console.log( "Invalid end time: "+ endTime)
		return cb(null, null)
	}
	
	if( startIndex && startIndex < 0 ) {
		console.log("Invalid startIndex: "+startIndex)			
		return cb(null, null)	
	}
	
	if( itemsPerPage && itemsPerPage < 0 ) {
		console.log("Invalid itemsPerPage: "+itemsPerPage)			
		return cb(null, null)		
	}
	
	if( lat && (lat < -90 || lat>90) ) {
		console.log("Invalid latitude: "+lat)			
		return cb(null, null)	
	}
	
	if( lon && (lon < -180 || lon>180) ) {
		console.log("Invalid longitude: "+lon)			
		return cb(null, null)		
	}
			
	if( bbox ) {
		lon = (bbox[0]+bbox[2])/2
		lat = (bbox[1]+bbox[3])/2
	}
	
	var tiles 	= GetModisTiles(lat, lon, bbox)
	console.log("tiles", tiles)
	
	var days = []
	for( var i=0; i<itemsPerPage; i++ ) {
		days.push(i)
	}
	
	var tile 	= tiles[0]	// for now
	entries		= []
	
	async.each(days, function(d, callback) {
		checkModisProduct(tile, d, startTime, endTime, host, entries, Bewit, callback )
	}, function(err) {
		var json = {
			replies: {
				items: entries
			}
		}
		console.log("Modis Done", entries.length)
		cb(null, json)	
	})
}

module.exports.QueryModis = QueryModis;
