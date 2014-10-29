var util 			= require('util'),
	fs				= require('fs'),
	async	 		= require('async'),
	path			= require('path'),
	moment			= require('moment'),
	Hawk			= require('hawk'),
	filesize 		= require('filesize'),
	scene_model		= require("../models/scene.js"),
	childProcess 	= require('child_process'),
	request 		= require('request'),
	xml2js 			= require('xml2js');
	;
	
var connectid	= process.env['DGCS_CONNECTID'] 	
var username	= process.env['DGCS_USERNAME'] 	
var password	= process.env['DGCS_PASSWORD']

var wfs_url 	= "https://rdog.digitalglobe.com/catalogservice/wfsaccess"
var wcs_url 	= "https://rdog.digitalglobe.com/deliveryservice/wcsaccess"

var wfs_version = "1.1";
var wcs_version = "1.1.1";
	
function WFSUrl(bbox) {
	var featureType = "DigitalGlobe:FinishedFeature"
	var url 	= wfs_url +"?"+"connectid="+connectid+"&version=1.1.0&service=WFS&request=GetFeature&typeName="+featureType
	url 		+= "&BBOX="+bbox.join(",")
	url			+= "&srsName=EPSG:4326"
	
	debug("WFSUrl", url)
	return url;
}

function WCSUrl(identifier, bbox, gridOrigin) {
	var url 	= wcs_url +"?"+"connectid="+connectid+"&version=1.1.1&service=WCS&request=GetCoverage"
	url 		+= "&identifier="+identifier
	url			+= "&FORMAT=image/geotiff"
	url			+= "&BoundingBox="+bbox.join(",")
	url			+= ",urn:ogc:def:crs:EPSG::4326"
	url			+= "&GridBaseCRS=urn:ogc:def:crs:EPSG::4326"
	url			+= "&GridCS=urn:ogc:def:cs:OGC:0.0:Grid2dSquareCS"
	url			+= "&GridType=urn:ogc:def:method:WCS:1.1:2dGridIn2dCrs"
	url			+= "&GridOrigin=" + gridOrigin
	url			+= "&GridOffsets=0.00028,0.00028"
		
	debug("WCSUrl", url)
	return url;
}

function BuildGeom( geom ) {
	
	function trimFloat(v) {
		return parseFloat(parseFloat(v).toFixed(5))
	}
	
	var polygon		= geom['gml:Polygon'][0] 
	var exterior	= polygon['gml:exterior'][0] 
	var linearRing	= exterior['gml:LinearRing'][0] 
	var posList		= linearRing['gml:posList'][0]
	var coords		= posList.split(" ").map(trimFloat)
	
	var geom 		= []
	var index = 0
	while( index < coords.length-1) {
		var el = [coords[index], coords[index+1]]
		index += 2
		geom.push(el)
	}
	return geom
}

function GenerateBrowseImage( host, featureId, geom ){
	var browse_url		= host+"/products/digiglobe/"+featureId+"/"+featureId+"_thn.png"
	
	// check if browseimage exists
	var dir			 	= app.root+"/../data/digiglobe/"+featureId
	if( !fs.existsSync(dir)) {
		fs.mkdirSync(dir)
	}
	
	var tif 			= path.join(dir, featureId+"_thn.tif")
	var thn 			= path.join(dir, featureId+"_thn.png")
	
	if( !fs.existsSync(thn)) {
		debug("does not exist", thn)
		//console.log("geom", geom)
		
		var gridOrigin	= geom[1]
		var bbox		= geom[0].reverse()
		
		bbox.push( geom[2][1] )
		bbox.push( geom[2][0] )
				
		var url 	= WCSUrl(featureId, bbox, gridOrigin)
		var auth 	= "Basic " + new Buffer(username + ":" + password).toString("base64");
		request({ 	url : url,
					encoding: 'binary',
					headers : {
						"Authorization" : auth
					}
				}, function (error, response, body) {
					//console.log("WCS error", error, response.statusCode)
					var content_type = response.headers['content-type']
					
					//console.log("Content-type:", content_type) // 'image/png'
						
					if( !error ) {
						if( content_type == 'application/xml') {
							var parser = new xml2js.Parser();
							parser.parseString(body, function (err, result) {
								if( !err ) {
									//console.log("xml2js result" )
									
									var exceptionReport = result['ows:ExceptionReport']
									//console.log(exceptionReport)
									
									var exception 		= exceptionReport['ows:Exception'][0]
									//console.log(exception)
									
									//var exceptionCode 	= exception['ows:ExceptionCode']
									var exceptionText 	= exception['ows:ExceptionText']
									logger.error(exceptionText.join("-"))
									
								} else {
									logger.error("xml2js", err)
								}
							})
						} else {
						    fs.writeFile(tif,body, 'binary', function(err) {
						       if(err)
						         logger.error(err);
						       else
						         logger.info(tif, " was saved!");
								 // run python script to do conversion from mime-multipart to png
								 var cmd = app.root+"/../python/multipart_thumb.py --scene "+featureId
								 console.log(cmd)
								 try {
								 var child = childProcess.exec(cmd, function (error, stdout, stderr) {
						 			if (error) {
						 		  	   debug(error.stack);
						 		  	   debug('Error code: '+error.code);
						 		  	   debug('Signal received: '+error.signal);
						 		   	}
						 			debug('Child Process STDOUT: '+stdout);
						 			debug('Child Process STDERR: '+stderr);
						 		});
								} catch(e) {
									logger.error("Error spawning python", e)
								}
						     }); 
						}
					}
				})
	}
	
	return browse_url
}

function BuildEntry(req, host, feature, credentials, duration, user ) {
	var featureId				= feature['DigitalGlobe:featureId'][0]
	var DigitalGlobe_geometry 	= feature['DigitalGlobe:geometry'][0]
	var coordinates				=  BuildGeom(DigitalGlobe_geometry)
	//console.log(featureId, DigitalGlobe_geometry)
	
	function Bewit(url) {
		if( credentials ) {
			var bewit = Hawk.uri.getBewit(url, { credentials: credentials, ttlSec: duration, ext: user.email })
			url += "?bewit="+bewit
		}
		return url;
	}
	
	var cloudCover 				= 100.0
	var DigitalGlobe_cloudCover = feature['DigitalGlobe:cloudCover'];
	if( DigitalGlobe_cloudCover ) {
		cloudCover = parseFloat(DigitalGlobe_cloudCover[0])
	}

	var properties = {
		"source": {
			"@label": 		req.gettext("properties.source"),
			"@value": 		feature['DigitalGlobe:source'][0]
		},
		"sensor": {
			"@label": 		req.gettext("properties.sensor"),
			"@value": 		feature['DigitalGlobe:productType'][0]
		},
		"date": {
			"@label": 		req.gettext("properties.date"),
			"@value": 		feature['DigitalGlobe:acquisitionDate'][0]
		},
		"resolution": {
			"@label": 		req.gettext("properties.resolution"),
			"@value": 		feature['DigitalGlobe:RMSEAccuracy'][0]
		},
		"cloud": {
			"@label": 		req.gettext("properties.cloud"),
			"@value": 		cloudCover
		},
		"copyright": {
			"@label": 		req.gettext("properties.copyright"),
			"@value": 		feature['DigitalGlobe:copyright'][0]
		},
		
		geometry: 				{
			"type": "Polygon",
			"coordinates": [	coordinates ]
		}
	}
	
	// if browse_url does not exist, call WCS
	// var browse_url 				= GenerateBrowseImage( host, featureId, coordinates )
	
	var minutes					= 20
	var browse_thn_url			= host+"/products/digiglobe/"+featureId+"/"+ featureId+"_thn.png"	
	var browse_thn_file			= app.root+"/../data/digiglobe/"+featureId+"/"+ featureId+"_thn.png"

	var browse_topojson_url		= host+"/products/digiglobe/"+featureId+"/surface_water_osm.png"	
	var browse_topojson_file	= app.root+"/../data/digiglobe/"+featureId+"/surface_water_osm.png"

	var topojson_url			= host+"/products/digiglobe/"+featureId+"/surface_water.topojson"	
	var topojson_file			= app.root+"/../data/digiglobe/"+featureId+"/surface_water.topojson.gz"
	var osm_file				= app.root+"/../data/digiglobe/"+featureId+"/surface_water.osm.bz2"
	var osm_file_url			= host+"/products/digiglobe/"+featureId+"/surface_water.osm.bz2"

	var stats 					= { size: 0 }
	var downloads				= undefined
	var browseimage_url			= undefined
	var productType				= undefined
	var browse					= undefined
	var process_action			= undefined
	
	console.log("feature", featureId)
	
	if(fs.existsSync(topojson_file)) {
		console.log("Found topojson for", featureId)
		
		browseimage_url = browse_topojson_url
		productType 	= "geoss:surface_water"
		
		downloads 	= {
			"@type": 		"ojo:download",
			"displayName": 	req.gettext("actions.download"),
			"using": [
				{
					"@type": 		"as:HttpRequest",
					"method": 		"GET",
					"url": 			Bewit(topojson_url),
					"mediaType": 	"application/json",
					"size": 		app.locals.GetFileSize(topojson_file, req.gettext),
					"displayName": 	req.gettext("formats.topojson")
				}
				,{
					"@type": 		"as:HttpRequest",
					"method": 		"GET",
					"url": 			Bewit(topojson_url+".gz"),
					"mediaType": 	"application/gzip",
					"size": 		app.locals.GetFileSize(topojson_file, req.gettext),
					"displayName": 	req.gettext("formats.topojsongz")
				}	
				,{
					"@type": 		"as:HttpRequest",
					"method": 		"GET",
					"url": 			Bewit(osm_file_url),
					"mediaType": 	"application/bzip2",
					"size": 		app.locals.GetFileSize(osm_file, req.gettext),
					"displayName": 	req.gettext("formats.osmbz2")
				}	
			]
		}
		
		browse = 	{ 
			"@type": 			"ojo:browse",
			"displayName": 		req.gettext("actions.browse"),
			"using": [{
				"@type": 		"as:HttpRequest",
				"method": 		"GET",
				"url": 			Bewit(host+"/products/digiglobe/browse/"+featureId),
				"mediaType": 	"html"
			}]
		}
						
	} else {
		if( !fs.existsSync( browse_thn_file )) return null
		
		browseimage_url = browse_thn_url
		productType 	= feature['DigitalGlobe:productType'][0]
		downloads 	= {
			"@type": 		"ojo:download",
			"displayName": 	req.gettext("actions.download"),
			"using": [
				{
					"@type": 		"as:HttpRequest",
					"method": 		"GET",
					"url": 			Bewit(browseimage_url),
					"mediaType": 	"image/png",
					"size": 		app.locals.GetFileSize(browse_thn_file, req.gettext),
					"displayName": 	req.gettext("formats.png")
				}
			]
		}
		
		process_action =	{
				"@type": 		"ojo:process",
				"displayName": 	req.gettext("actions.process"),
				"using": [{
					"@type": 		"as:HttpRequest",
					"method": 		"GET",
					"url": 			Bewit(host+"/products/digiglobe/"+featureId),
					"displayName": 	req.gettext("products.surface_water"),
					"duration": 	util.format(req.gettext("duration.minutes").replace('{minutes}', 'd'),minutes)
				}]
			}
	}
	
	var actions = []
	

	
	if (downloads) 			actions.push(downloads)
	if (browse) 			actions.push(browse)
	if (process_action) 	actions.push(process_action)
	
	
	var entry = {
		"@id": 				featureId,
		"@type": 			productType,
		"displayName": 		featureId,
		
		"image": [
			{
				"url": browseimage_url,
				"mediaType": "image/png",
				"rel": "browse"
			}
		],
		"properties": 		properties,
		"action": 			actions
	}
		
	return entry
}

function QueryDigiglobe(req, user, credentials, host, query, bbox, lat, lon, startTime, endTime, startIndex, itemsPerPage, cb ) {
	var duration	= 60 * 30
	
	if( bbox == undefined ) {
		var delta = 0.1	// spread across target in degrees
		// EPSG:4326 minLat, minLong, maxLat, maxLon
		var minlat 	= (parseFloat(lat)-delta).toFixed(3)
		var minlon	= (parseFloat(lon)-delta).toFixed(3)
		var maxlat	= (parseFloat(lat)+delta).toFixed(3)
		var maxlon	= (parseFloat(lon)+delta).toFixed(3)
		bbox 		= [ minlat, minlon, maxlat, maxlon]
	}
	
	console.log("QueryDigiglobe",lat,lon,bbox)
	
	var entries = [];
	var err 	= 0;
	var auth 	= "Basic " + new Buffer(username + ":" + password).toString("base64");
	request({
				url : WFSUrl(bbox),
				headers : {
					"Authorization" : auth
			}
	    }, function (error, response, body) {
			console.log(error, response.statusCode)
			if( !error && (response.statusCode == 200) ) {
				var parser = new xml2js.Parser();
			    parser.parseString(body, function (err, result) {
					var featureCollection 	= result['wfs:FeatureCollection']
					var featureMembers 		= featureCollection['gml:featureMembers'] 
					var finishedFeatures 	= featureMembers[0]['DigitalGlobe:FinishedFeature']

					if( finsihedFeatures) console.log("got finishedFeatures: ", finishedFeatures.length)
					
					for( var f in finishedFeatures) {
						var feature 	= finishedFeatures[f]
						var featureId	= feature['DigitalGlobe:featureId'][0]
						
						//console.log(feature)
						var date 	= moment(feature['DigitalGlobe:acquisitionDate'][0])
						
						if( !date.isBefore(startTime) && !date.isAfter(endTime)) {
							var entry 	= BuildEntry(req, host, feature, credentials, duration, user)
							if( entry && entry.properties.cloud["@value"] < 0.1 ) {
								entries.push(entry)
							}
						} else {
							console.log("outside span", date.format("YYYY-MM-DD"), featureId)
						}
					}
					
					//console.log(entries)
					cb(error, {
						replies: {
							items: entries
						}
					})
				})
			} else {
				cb(error, {
					replies: {
						items: entries
					}
				})
			}
			
	    }
	);
}

module.exports.QueryDigiglobe = QueryDigiglobe;

	
