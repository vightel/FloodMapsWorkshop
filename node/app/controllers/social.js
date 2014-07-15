var util 		= require('util');
var fs	 		= require('fs');
var path		= require('path');
var eyes		= require('eyes');
var debug		= require('debug')('tests');
var graph 		= require('fbgraph');

module.exports = {
	
	// post on user's wall
	facebook: function(req, res) {  
		var user 			= req.session.user;
		var url 			= req.query['url'];
		var host			= req.headers['host'];
		
		var redirect_uri 	= "http://"+host+"/social/facebook?url="+url;
		console.log(redirect_uri)
		// we don't have a code yet
		// so we'll redirect to the oauth dialog
		  if (!req.query.code) {
		    var authUrl = graph.getOauthUrl({
		        "client_id":     app.config.fbAppId
		      , "redirect_uri":  redirect_uri
		      , "scope":         'email'
		    });

		    if (!req.query.error) { //checks whether a user denied the app facebook login/permissions
				console.log("FB user accepts...")
				res.redirect(authUrl);
		    } else {  //req.query.error == 'access_denied'
		      res.send('access denied');
		    }
		    return;
		  }

		  // code is set
		  // we'll send that and get the access token
		  graph.authorize({
		      "client_id":      app.config.fbAppId
		    , "redirect_uri":   redirect_uri
		    , "client_secret":  app.config.fbSecret
		    , "code":           req.query.code
		  }, function (err, facebookRes) {
			eyes.inspect(err);
			eyes.inspect(facebookRes);
			console.log("User has logged in")
			res.redirect(redirect_uri);
		  });
		     
		var url = req.query['url'];
		console.log("FB Post:", url) 
			
		res.send("ok");
	},
	
	twitter: function(req, res) {       
		var url = req.query['url'];
		console.log("Twitter Post:", url) 
			
		res.send("ok");
	}
};