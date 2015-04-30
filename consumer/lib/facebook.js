// Facebook interface
//(function() {

//    var FB = (function() {
		
		var graph 	= require('fbgraph');
		var request = require('request');
		
		var fbAppId
			, fbAppSecret	
			, fAppToken	
			;

		// Module initialization
		init = function(appId, appSecret) {
			fbAppId 	= appId
			fbAppSecret	= appSecret
	
			fAppToken	= fbAppId + "|" + fbAppSecret
	
			graph.setAccessToken( fAppToken )
			return this;
		};
		
		//
		// Exchange AppToken for AccessToken to use as veryfiable key
		//
		GenerateSecret = function( cb ) {
			graph.authorize({
				"client_id":      fbAppId,
				"client_secret":  fbAppSecret,
				"grant_type": 	  "client_credentials"
			}, function (err, result) {
				//console.log("new access token:", result.access_token);
				cb(err, result.access_token)
			})
		};
	
		GetAppInfo = function(accessToken, cb) {
			// if we had the AppToken we could get a fql query to get the good stuff but we don't
			var arr 	= accessToken.split('|')
			var appid	= arr[0]
			graph.get(appId, function(err, result) {
				var json = JSON.parse(result)
				//console.log("GetAppInfo", err, json)
				cb(err, json)
			})
		};
		
		// ValidateSecret
		// 	Check if token is valid and retrieve app information
		ValidateSecret = function(accessToken, cb) {
			var arr 	= accessToken.split('|')
			var appid	= arr[0]
			var url		= "https://graph.facebook.com/"+appid+"?access_token="+accessToken
			request.get(url, function(err,res,body) {
				var json = err==null ? JSON.parse(body) : { error: err }
				
				//console.log("ValidateSecret", err, json)
				cb(err, json)
			})		
		};
		

//	})();
	
module.exports.init = init;
module.exports.GenerateSecret = GenerateSecret;
module.exports.GetAppInfo = GetAppInfo;
module.exports.ValidateSecret = ValidateSecret;
//})();
