var util		= require('util'),
	async		= require('async'),
	eyes		= require('eyes'),
	debug		= require('debug')('geonames'),
	request 	= require('request'),
	moment		= require('moment'),
	fs			= require('fs'),
	path		= require('path');
	

module.exports={
	
	get_info: function( lat, lng, cb) {
		debug("get geonames info", lat, lng)
		var url = "http://api.geonames.org/findNearbyPlaceNameJSON?lat="+lat+"&lng="+lng+"&radius=300&style=FULL&cities=cities1000&maxRows=1&username=cappelaere"
		request(url, function(err, status, body) {
			//console.log(err, status.statusCode)
			if( !err && (status.statusCode == 200) && (body != undefined)) {
				var json = JSON.parse(body)
				//console.log("geonames", json)
				if( json.geonames && (json.geonames.length == 0) ) {
					debug("no geonames for ", id)
				
					// fallback
					var url = "http://api.geonames.org/findNearbyJSON?lat="+lat+"&lng="+lng+"&style=FULL&username=cappelaere"
					request(url, function(err, status, body) {
						var json = JSON.parse(body)
					
						if( json.geonames.length == 0 ) {
							logger.error("geonames getinfo - Please fix this record later...")
							return cb(null,null)
						}
					
						cb(err, json)
					})
				} else {
					cb(err, json)
				}
			} else {
				logger.error(err, status)
				cb(err, "Error accessing geonames for:", lat, lng)
			}	
		})
	}
}
