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
	
	query_eo1		= require("../../lib/query_eo1"),
	query_l8		= require("../../lib/query_l8"),
	query_modis		= require("../../lib/query_modis.js"),
	query_radarsat2	= require("../../lib/query_radarsat2")
	;
	
	productQueries = {
		"eo1_ali": 		query_eo1.QueryEO1,
		"l8": 			query_l8.QueryLandsat8,
		"modis": 		query_modis.QueryModis,
		"radarsat2": 	query_radarsat2.QueryRadarsat2
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
	
	function QueryNodes(req, res, query, bbox, lat, lon, startTime, endTime, startIndex, itemsPerPage ) {
		var sources		= req.query['sources'].split(',')
		var host 		= req.protocol + "://"+req.headers['host']
		var originalUrl	= host + req.originalUrl
		var user		= req.session.user
		var credentials	= req.session.credentials
		
		console.log('query sources', sources)
		
		var items = []

		async.each( sources, function(asset, cb) {

			if( _.contains(sources, asset)) {
				var productQuery = productQueries[asset]
				console.log("Trying to query", asset)
				productQuery(user, credentials, host, query, bbox, lat, lon, startTime, endTime, startIndex, itemsPerPage, function(err, json) {
					if(!err && json) {
						var index = 0
						for( var item in json.replies.items ) {
							items.push(json.replies.items[item])
							index += 1
						}
						console.log("Added", index, "items to replies")
					}						
					cb(null)
				})
			} else {
				console.log(asset, " not selected")
			}
		}, function(err) {	
			res.set("Access-Control-Allow-Origin", "*")
			var json = {
				"objectType": 'query',
				"id": "urn:ojo:opensearch:"+req.originalUrl.split("?")[1],
				"displayName": "OJO Publisher Flood Surface Water Products",
				"replies": {
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
		var limit			= req.query['limit']
		
		//if( user == undefined ) {
		//	console.log("undefined user!")
		//	return res.send(404)
		//}
		console.log("opensearch")
		
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
	
		QueryNodes(req, res, query, bbox, lat, lon, startTime, endTime, startIndex, itemsPerPage )
	}
}