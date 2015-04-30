var Hawk		= require('hawk'),
	moment		= require('moment'),
	Request		= require('request')
;

/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', { title: 'Open GeoSocial Consumer' })
};

exports.floods = function(req, res){
  res.render('flood', { title: 'Floods' })
};

exports.quakes = function(req, res){
  res.render('quakes', { title: 'Quakes' })
};

exports.snow = function(req, res){
  res.render('snow', { title: 'Snow' })
};

exports.fires = function(req, res){
	var region = {
		"name":		"Central America",
		"bbox":     [-92.68, 6.17, -75.85, 19.08 ],
		"target":   [-84.14, 9.84],
		"min_zoom":  1,
		"max_zoom":  18,
		"zoom": 5
	}
	var appId			= process.env.FACEBOOK_APP_ID
	var appSecret		= process.env.FACEBOOK_APP_SECRET
	var mapbox_token	= process.env.MAPBOX_PUBLIC_TOKEN
	
	res.render('fires', { title: 		'Active Fires',
	 					region: 		region,
						map_id: 		process.env.MAPID,
						fbAppId: 	    app.hawk_id,
						fbAccessToken:  app.hawk_secret,
						mapbox_token: 	mapbox_token,
						user_email: 	"pat@cappelaere.com"
						})
};

exports.opensearch = function(req, res){
	
	var query 			= req.query['q']
	var itemsPerPage	= req.query['itemsPerPage'] || 10
	var startIndex		= req.query['startIndex'] || 1
	var startTime		= req.query['startTime'] ? moment(req.query['startTime']) : moment("1970-01-01")
	var endTime			= req.query['endTime'] ? moment(req.query['endTime']) : moment()
	var lat				= req.query['lat']
	var lon				= req.query['lon']
	var limit			= req.query['limit']
	var sources			= req.query['sources']

	var email = "pat@cappelaere.com"
	// console.log("OpenSearch", query)
	
	// got the query from browser, send it to publishers
	var credentials = {
		id:  		app.hawk_id,
		key: 		app.hawk_secret,
		algorithm: 'sha256'
	}
	
	var url = "http://localhost:7465/opensearch"
	url += "?q="+query;
	url += "&lat="+lat;
	url += "&lon="+lon;
	url += "&startTime="+startTime.format("YYYY-MM-DD");
	url += "&endTime="+endTime.format("YYYY-MM-DD");
	url += "&limit="+limit;
	url += "&sources="+sources;
	
    var header = Hawk.client.header(url, 'GET', { credentials: credentials, ext: email });
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
					res.send(json)
				} catch(e) {
					console.log("parse err", e)
					res.sendStatus(500)
				}
			} else {
				console.log("Invalid Hawk return")
		        console.log(response.statusCode + ': ' + body + (isValid ? ' (valid)' : ' (invalid)'));
				res.sendStatus(500);
			}
		} else {
			console.log("Request error", err)
			res.sendStatus(500);
		}
	})
};