var fs  		= require('fs'),
	util		= require('util'),
	async		= require('async'),
	moment		= require('moment'),
	eyes		= require('eyes'),
	Hawk		= require('hawk'),
	Request		= require('request'),
	_			= require('underscore'),
	debug		= require('debug')('opensearch')
	;
	
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
	
	function QueryNode(req, res, url, query, lat, lon, startTime, endTime, cb ) {
		var user			= req.session.user

		url += "?q="+query;
		url += "&lat="+lat;
		url += "&lon="+lon;
		url += "&startTime="+startTime.format("YYYY-MM-DD");
		url += "&endTime="+endTime.format("YYYY-MM-DD");
		
		console.log("opensearch query url", url)
		
		var credentials = {
			id:  		app.hawk_id,
			key: 		app.hawk_secret,
			algorithm: 'sha256'
		}
		
	    var header = Hawk.client.header(url, 'GET', { credentials: credentials, ext: user.email });
	    var options = {
	        uri:  	url,
	        method: 'GET',
	        headers: {
	            authorization: header.field
	        }
	    };
		
		Request(options, function(err, response, body){
			if( !err ) {
		        var isValid = Hawk.client.authenticate(response, credentials, header.artifacts, { payload: body });
				if( isValid ) {
					//console.log("Hawk body:"+body)
					try{
						var json = JSON.parse(body)
						cb(null, json)
					} catch(e) {
						console.log("parse err", e)
						cb(-1,nukk)
					}
				} else {
					console.log("Invalid Hawk return")
			        console.log(response.statusCode + ': ' + body + (isValid ? ' (valid)' : ' (invalid)'));
					cb(-1,null);
				}
			} else {
				console.log("Request error", err)
				cb(err, null)
			}
		})
	}
	
	function QueryNodes(req, res, query, lat, lon, startTime, endTime ) {
		var sources			= req.query['sources'].split(',')
		
		console.log('sources', sources)
		
		results = {	replies: {
						items: []
					}}
		
		async.each( app.config.nodes, function(node, cb) {
			console.log("Trying to query", node)
			// check if selected
			if( _.find(sources, function(s) { return s == node.source }) ) {
				console.log("checked ", node.source)
			
				var url = node.href
				console.log("checking url:", url)
				// try to see if node is up
				Request.head(url, function(error, response, body) {
					if( error != null ) {
						console.log("Error with ", url)
						cb(null)
					} else {
						QueryNode(req, res, url, query, lat, lon, startTime, endTime, function(err, json) {
							if(json) {
								var index = 0
								for( var item in json.replies.items ) {
									results.replies.items.push(json.replies.items[item])
									index += 1
								}
								console.log("Added", index, "items to replies")
							}						
							cb(null)
						})
					}
				})
			} else {
				console.log("Source unchecked:", node.source)
				cb(null)
			}
		}, function(err) {
			console.log("sending results items...", results.replies.items.length)
			res.send(results)
		})
	}
	
module.exports = {

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
	
		QueryNodes(req, res, query, lat, lon, startTime, endTime )
	}
}