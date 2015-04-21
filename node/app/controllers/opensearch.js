var fs  		= require('fs'),
	util		= require('util'),
	async		= require('async'),
	moment		= require('moment'),
	eyes		= require('eyes'),
	Hawk		= require('hawk'),
	filesize 	= require('filesize'),
	Request		= require('request'),
	_			= require('underscore'),
	debug		= require('debug')('opensearch'),
	
	query_eo1					= require("../../lib/query_eo1"),
	query_l8					= require("../../lib/query_l8"),
	query_modis					= require("../../lib/query_modis.js"),
	query_radarsat2				= require("../../lib/query_radarsat2"),
	query_dfo					= require("../../lib/query_dfo"),
	//query_digiglobe				= require("../../lib/query_digiglobe"),
	query_modislst				= require("../../lib/query_modislst"),
	query_pop					= require("../../lib/query_pop")

	query_af					= require("../../lib/query_modis_af").query
	query_trmm_24				= require("../../lib/query_trmm_24").query
	query_gpm_24				= require("../../lib/query_gpm_24").query
	query_ef5					= require("../../lib/query_ef5").query,
	query_maxswe				= require("../../lib/query_maxswe").query,
	query_sm					= require("../../lib/query_sm").query,
	query_maxq					= require("../../lib/query_maxq").query,
	query_landslide_nowcast2	= require("../../lib/query_landslide_nowcast2").query,
	query_quakes				= require("../../lib/query_quakes").query,
	query_vhi					= require("../../lib/query_vhi").query,
	query_vchloa				= require("../../lib/query_vchloa").query,
	query_chirps_30				= require("../../lib/query_chirps_30").query,
	query_chirps_10				= require("../../lib/query_chirps_10").query,
	query_chirps_5				= require("../../lib/query_chirps_5").query
	;
	
	// Queries for all those sources
	productQueries = {
		"dfo": 					[query_dfo.QueryDFO],
//		"digiglobe":			[query_digiglobe.QueryDigiglobe],
		"ef5": 					[query_ef5.QueryAll.bind(query_ef5), query_maxswe.QueryAll.bind(query_maxswe), query_sm.QueryAll.bind(query_sm), query_maxq.QueryAll.bind(query_maxq)],
		"eo1_ali": 				[query_eo1.QueryEO1],
		"landslide_model": 		[query_landslide_nowcast2.QueryAll.bind(query_landslide_nowcast2)],
		"landsat_8": 			[query_l8.QueryLandsat8],
		"landscan": 			[query_pop.QueryAll],
		"modis": 				[query_modis.QueryModis, query_af.QueryAll.bind(query_af)],
		"modis_lst":			[query_modislst.QueryModisLST],
		"usgs": 				[query_quakes.QueryAll.bind(query_quakes)],
		"radarsat_2": 			[query_radarsat2.QueryRadarsat2],
		"trmm": 				[query_trmm_24.QueryAll.bind(query_trmm_24)],
		"gpm": 					[query_gpm_24.QueryAll.bind(query_gpm_24)],
		"noaa": 				[query_vhi.QueryAll.bind(query_vhi)],
		"viirs": 				[query_vchloa.QueryAll.bind(query_vchloa)],
		"chirps": 				[query_chirps_30.QueryAll.bind(query_chirps_30), query_chirps_10.QueryAll.bind(query_chirps_10),query_chirps_5.QueryAll.bind(query_chirps_5),]
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
		//debug(dt.format())
		return dt.isValid()
	}
	
	// takes a polygon and returns a bbox
	// POLYGON((19.154261 -72.334539,19.054651 -72.00994,17.99311 -72.249369,18.092406 -72.571983,19.154261 -72.334539))
	function bbox(g) {
		var str = g.replace("POLYGON((", "")
		str = str.replace("))", "")
		str = str.replace(/ /g, ",")
		var arr = str.split(",")
		var latmin 	= Math.min( parseFloat(arr[0]), parseFloat(arr[2]), parseFloat(arr[4]), parseFloat(arr[6]), parseFloat(arr[8]))
		var latmax 	= Math.max( parseFloat(arr[0]), parseFloat(arr[2]), parseFloat(arr[4]), parseFloat(arr[6]), parseFloat(arr[8]))
		var lonmin 	= Math.max( parseFloat(arr[1]), parseFloat(arr[3]), parseFloat(arr[5]), parseFloat(arr[7]), parseFloat(arr[9]))
		var lonmax 	= Math.max( parseFloat(arr[1]), parseFloat(arr[3]), parseFloat(arr[5]), parseFloat(arr[7]), parseFloat(arr[9]))
		var bbox =  [latmin, lonmin, latmax, lonmax]
		//console.log("bbox", arr, bbox)
		return bbox
	}
	
	function QueryNodes(req, res, query, bbox, lat, lon, startTime, endTime, startIndex, itemsPerPage, limit ) {
		var sources;
		if( req.query['sources']) {
			sources		= req.query['sources'].split(',')
		} else {
			sources 	= _.keys(productQueries)
		}
		var host 		= req.protocol + "://"+req.headers['host']
		var originalUrl	= host + req.originalUrl
		var user		= req.session.user
		var credentials	= req.session.credentials
				
		var items 		= []
		var errMsg		= []

		async.each( sources, function(asset, cb) {

			if( _.contains(sources, asset)) {
				var queries = productQueries[asset]
				logger.info('query source', asset)
				
				function queryProduct(q, callback) {
					q(req, user, credentials, host, query, bbox, lat, lon, startTime, endTime, startIndex, itemsPerPage, limit, function(err, json) {
						if(!err && json) {
							var index = 0
							for( var item in json.replies.items ) {
								debug("added", json.replies.items[item]['@id'])
								items.push(json.replies.items[item])
								index += 1
							}
							logger.info("Added", index, "items to replies")
						}						
						callback(null)
					})	
				}
				
				async.each( queries, queryProduct, function(err ) {
					cb(null)
				})
				
			} else {
				debug(asset, " not selected")
			}
		}, function(err) {	
			res.set("Access-Control-Allow-Origin", "*")
			if( err ) {
				console.log("sending errmsg", errMsg)
				var json = {
					'errCode': err,
					'errMsg': errMsg
				}
			} else {
				function compareDates(a,b) {
					return new Date(b.properties.date['@value']) - new Date(a.properties.date['@value']);
				}
				
				items.sort(compareDates)
				
				var json = {
					"@context": host+"/vocab",
					"@language": req.lang,
					"@id": "urn:ojo:opensearch:"+req.originalUrl.split("?")[1],
					"displayName": "NASA GSFC Product Publisher",
					"@type":"as:Collection",
					"url": originalUrl,
					"mediaType": "application/activity+json",
					"totalItems": items.length,
					"items": items
				}
			}
			res.send(json)
		})
	}
	
module.exports = {
	classic: function(req, res) {
		var host = req.protocol+"://"+req.headers.host
		var region = app.config.regions.d02
		var user= req.session.user

		// set to Gonaives
		region.target=[-18.19,21.07]
		
		res.render( "opensearch/classic", {
			user: user,
			opensearch_url: host+"/opensearch",
			region: region,
			nodes: app.config.nodes,
			social_envs: app.social_envs
		})
	},
	
	gl: function(req, res) {
		var host = req.protocol+"://"+req.headers.host
		var region = app.config.regions.d02
		var user= req.session.user
		
		res.render( "opensearch/gl", {
			layout: "layout_gl",
			user: user,
			opensearch_url: host+"/opensearch",
			region: region,
			nodes: app.config.nodes,
			social_envs: app.social_envs
		})
	},
	
	description: function(req, res) {
		res.contentType('application/xml');
		var host = "http://"+req.headers.host;
		//console.log("Host set to:"+host);
		res.render("opensearch/description.ejs", {layout:false, host:host});
	},
	
  	index: function(req, res) {
		var user			= req.session.user
		var query 			= req.query['q']
		var bbox			= req.query['bbox'] ? req.query['bbox'].split(',').map(parseFloat) : undefined
		var itemsPerPage	= req.query['itemsPerPage'] || 10
		var startIndex		= req.query['startIndex'] || 1
		var startTime		= req.query['startTime'] ? moment(req.query['startTime']) : moment("1970-01-01")
		var endTime			= req.query['endTime'] ? moment(req.query['endTime']) : moment()
		var lat				= req.query['lat']
		var lon				= req.query['lon']
		var limit			= req.query['limit'] || 25
		
		//if( user == undefined ) {
		//	console.log("undefined user!")
		//	return res.send(404)
		//}
		
		logger.info("opensearch",query,bbox,req.query['startTime'], req.query['endTime'], lat, lon, req.locale)
			
		if( bbox && !ValidateBBox(bbox)) {
			return res.send(400, "Invalid BBox")
		}
		if( startTime && !ValidateTime(startTime)) {
			return res.send(400, "Invalid start time: "+req.query['startTime'])
		}
		if( endTime && !ValidateTime(endTime)) {
			return res.send(400, "Invalid end time: "+req.query['endTime'])
		}
		if( startIndex && startIndex < 0 ) {
			return res.send(400, "Invalid startIndex: "+startIndex)			
		}
		if( itemsPerPage && itemsPerPage < 0 ) {
			return res.send(400, "Invalid itemsPerPage: "+itemsPerPage)			
		}
		if( lat && (lat < -90 || lat>90) ) {
			return res.send(400, "Invalid latitude: "+lat)			
		}
		if( lon && (lon < -180 || lon>180) ) {
			return res.send(400, "Invalid longitude: "+lon)			
		}
				
		if( bbox ) {
			lon = (bbox[0]+bbox[2])/2
			lat = (bbox[1]+bbox[3])/2
		}
	
		QueryNodes(req, res, query, bbox, lat, lon, startTime, endTime, startIndex, itemsPerPage, limit )
	}
}