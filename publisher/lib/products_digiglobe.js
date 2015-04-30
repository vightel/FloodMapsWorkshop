var util 		= require('util'),
	fs			= require('fs'),
	async	 	= require('async'),
	path		= require('path'),
	moment		= require('moment'),
	request		= require('request'),
	xml2js 		= require('xml2js'),
	_			= require('underscore'),
	mime		= require('mime-types'),
	Hawk		= require('hawk'),
	debug		= require('debug')('digiglobe');

	var connectid	= process.env['DGCS_CONNECTID'] 	
	var username	= process.env['DGCS_USERNAME'] 	
	var password	= process.env['DGCS_PASSWORD']

	var wfs_url 	= "https://rdog.digitalglobe.com/catalogservice/wfsaccess"
	var wfs_version = "1.1";
	
	
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
			console.log("sending .topojson application/json gzip", basename)
		} else {
			debug("sending ", mime_type, basename, dirname)
			res.header("Content-Type", mime_type, basename)
			console.log(ext, mime_type, "no encoding")
		}
		
		res.header("Access-Control-Allow-Origin", "*")
		res.sendfile(basename, {root: dirname})
	}
	
	function WFSUrl(identifier) {
		var featureType = "DigitalGlobe:FinishedFeature"
		var url 	= wfs_url +"?"+"connectid="+connectid+"&version=1.1.0&service=WFS&request=GetFeature&typeName="+featureType
		url			+= "&srsName=EPSG:4326"
		url			+= "&featureId="+identifier
	
		debug("WFSUrl", url)
		return url;
	}

	function BuildBBox( geom ) {	
		function trimFloat(v) {
			return parseFloat(parseFloat(v).toFixed(5))
		}
	
		var polygon		= geom['gml:Polygon'][0] 
		var exterior	= polygon['gml:exterior'][0] 
		var linearRing	= exterior['gml:LinearRing'][0] 
		var posList		= linearRing['gml:posList'][0]
			
		var coords		= posList.split(" ").map(trimFloat)
	
		var geom 		= []
		var index 		= 0
		
		var minlat 		= 90, maxlat = -90
		var minlon		= 180, maxlon = -180
		
		while( index < coords.length-1) {
			var el = [coords[index], coords[index+1]]
			index += 2
			var lon = coords[index]
			var lat = coords[index+1]
			if( lon < minlon ) minlon = lon
			if( lon > maxlon ) maxlon = lon
			if( lat < minlat ) minlat = lat
			if( lat > maxlat) maxlat  = lat
		}
		
		return [minlon, minlat,  maxlon, maxlat, ]
	}
	
	function GetFeature(identifier, cb) {
		var err 	= 0;
		var auth 	= "Basic " + new Buffer(username + ":" + password).toString("base64");
		request({
					url : WFSUrl(identifier),
					headers : {
						"Authorization" : auth
				}
		    }, function (error, response, body) {
				if( !error && (response.statusCode == 200) ) {
					var parser = new xml2js.Parser();
				    parser.parseString(body, function (err, result) {
						if( err ) {
							return cb(err, null)
						}
						var featureCollection 	= result['wfs:FeatureCollection']
						var featureMembers 		= featureCollection['gml:featureMembers'] 
						var finishedFeatures 	= featureMembers[0]['DigitalGlobe:FinishedFeature']
						var feature 			= finishedFeatures[0]

						//console.log(feature)
						
						var keys 	= _.keys(feature)
						keys 		= _.filter(keys, function(k) { return k.indexOf("DigitalGlobe:")>= 0})
						var entry 	= {}
						
						var DigitalGlobe_geometry 	= feature['DigitalGlobe:geometry'][0]
						var bbox					= BuildBBox(DigitalGlobe_geometry)
						
						for( var k in keys ) {
							var key = keys[k]
							
							if( key.indexOf("geometry") < 0 ) {
								var val 	= feature[key]
								var text	= val[0]
								
								if(text.length > 1) {
									entry[key.replace("DigitalGlobe:", "")] = val[0]
								}
							}
							
							entry['bbox'] = bbox
						}

						cb(err, entry)
					})
				} else {
					cb(err, null)
				}
			})
	}
	
	function render_map(region, topojson, req, res) {
		console.log("render_map", topojson)
		res.render("products/map", {
			region: region,
			topojson: topojson,
			layout: false
		})
	}
	
module.exports = {

	product: function(req,res) {
		var scene 	= req.params['scene']
		var id 		= req.params['id']
		var product	= app.root+"/../data/digiglobe/"+scene+"/"+id
		
		console.log("digiglobe product", product)
		
		if( !fs.existsSync(product)) {
			if( fs.existsSync(product+".gz")) {
				console.log("sending as topojson gzip encoded")
				sendFile(res, product)				
			} else {
				debug("Product does not exist")
				return res.send(400)
			}
		} else {
			sendFile(res, product)
		}
	},

	browse: function(req,res) {
		var scene = req.params['scene']
		GetFeature(scene, function(err, feature) {
			if( !err ) {
				var date    	= feature.acquisitionDate
				var host 		= "http://"+req.headers.host
				var bbox		= feature.bbox
				var centerlon	= (bbox[0]+bbox[2])/2
				var centerlat	= (bbox[1]+bbox[3])/2
				
				var region 	= {
					name: 	"DigitalGlobe Flood Map",
					scene: 	scene,
					bbox: 	feature.bbox,
					target: [centerlat, centerlon]
				}
				
				delete feature.bbox
				delete feature.productType
				delete feature.dataLayer
				delete feature.dataLayer
				delete feature.outputMosaic
				delete feature.colorBandOrder
				delete feature.assetName
				delete feature.assetType
				delete feature.pixelsIngested
				delete feature.isBrowse
				delete feature.isMirrored
				delete feature.formattedDate
				delete feature.ingestDate
				delete feature.earliestAcquisitionDate
				delete feature.latestAcquisitionDate
				
				console.log(host+"/products/digiglobe/"+scene+"/surface_water_osm.png" )
				res.render("products/digiglobe", {
					social_envs: 	app.social_envs,
					description: 	"DigitalGlobe Flood Map",
					image: 			host+"/products/digiglobe/"+scene+"/surface_water_osm.png",
					url: 			host+"/products/digiglobe/browse/"+scene,
					date: 			date,
					region: 		region,
					data: 			"https://evwhs.digitalglobe.com",
					topojson: 		host+"/products/digiglobe/"+scene+"/surface_water.topojson.gz",
					feature: 		feature,
					layout: 		false
				})
			} else {
				res.send("Error", err)
			}
		})
	},

	map: function(req,res) {
		var scene 	= req.params['scene']
		GetFeature(scene, function(err, feature) {
			if( !err  ) {
				var date    	= feature.acquisitionDate
				var host 		= "http://"+req.headers.host
				var bbox		= feature.bbox
				
				var centerlon	= (bbox[0]+bbox[2])/2
				var centerlat	= (bbox[1]+bbox[3])/2
				
				var region 	= {
					name: 	"DigitalGlobe Flood Map",
					scene: 	scene,
					bbox: 	undefined,	// feature.bbox,
					target: [centerlat, centerlon],
					min_zoom: 6
				}
				console.log(region)
				var topojson=	host+"/products/digiglobe/"+scene+"/surface_water.topojson"
				render_map(region, topojson, req, res )
			} else {
				res.send("Map Err"+err)
			}
		})
	},

	process: function(req,res) {
	
	}
};