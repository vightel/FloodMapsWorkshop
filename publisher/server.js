/**
 * Module dependencies.
 */

var express 		= require('express'),
	path			= require('path'),
	util			= require('util'),
	fs				= require('fs'),
  	debug 			= require('debug')('server'),
	eyes			= require('eyes'),
	glob			= require('glob'),
	//mkdirp		= require('mkdirp'),
	crypto			= require('crypto'),
	Hawk			= require('hawk'),
	
	home			= require('./app/controllers/home'),
	users			= require('./app/controllers/users'),
	opensearch		= require('./app/controllers/opensearch'),
	persona			= require('./app/controllers/persona'),
	App				= require('./models/app'),
	User			= require('./models/user'),
	apps			= require('./app/controllers/apps'),
	products		= require('./app/controllers/products'),
	jsonld			= require('./app/controllers/jsonld')
	
	//mapinfo			= require('./app/controllers/mapinfo');

	var mapinfo_pop				= require('./lib/mapinfo_pop');
	var	products_pop			= require('./lib/products_pop');

	// var	products_digiglobe	= require('./lib/products_digiglobe');
	
	//
	// NOTE: All those products need to be refactored to use S3
	//
	var	products_frost		= require('./lib/products_frost');
	var	products_radarsat2	= require('./lib/products_radarsat2');
	var	products_l8			= require('./lib/products_l8');
	var	products_eo1_ali	= require('./lib/products_eo1_ali');
	var	products_dfo		= require('./lib/products_dfo');
	var	products_modis		= require('./lib/products_modis');
	
	var mapinfo_dfo			= require('./lib/mapinfo_dfo');
	var mapinfo_eo1_ali		= require('./lib/mapinfo_eo1_ali');
	var mapinfo_frost		= require('./lib/mapinfo_frost');
	var mapinfo_l8			= require('./lib/mapinfo_landsat8');
	var mapinfo_modis		= require('./lib/mapinfo_modis');
	var mapinfo_radarsat2	= require('./lib/mapinfo_radarsat2');

	var s3_products = {}
	
	//
	// Add all s3 queries from 
	//
	var s3dir = path.join(process.cwd(),"lib","s3queries","*.js")	
	glob(s3dir, function(err, files){
		try {
			for( f in files ) {
				var fname 	= files[f]
				if( fname.indexOf("query_s3.js") < 0 )  {
					var rq 			= require(fname).query
					var subfolder	= rq.options.subfolder
					s3_products[subfolder] = rq
				}
			}
		} catch(e) {
			logger.error("Error reading ", fname, e)
		}
	})
	
	var app 					= module.exports = express();
	
	global.app 					= app;
	app.root 					= process.cwd();

	var mainEnv 				= app.root + '/config/environment'+'.js';
	var supportEnv 				= app.root + '/config/environments/' + app.settings.env+'.js';


require(mainEnv)
require(supportEnv)

// load settings
require('./settings').boot(app)  

// load controllers
	//require('./lib/boot')(app, { verbose: !module.parent });

// =========================================
// ROUTING
//
 
function if_authorized(req, res, next) {
	//console.log("if_authorized headers", req.headers)
	//console.log("if_authorized session", req.session)
	
	//if (req.session.user()) { 
		return next();
	//}
	//logger.info("auth not authenticated... please login...")
	//res.redirect('/login')
}

function SendOAuthUnAuthorizedResponse( res, err ) {
	var headers = {
		'Status': "Unauthorized",
		"WWW-Authenticate": "Hawk"
	}
	res.send("Unauthorized:"+err, headers, 401)
}

// Check that app is registered with us
function FindCredentialsFunc(id, callback) {
	console.log("Checking credentials for", id)
	App.get_by_fbappid(id, function(err, data) {
		console.log("App.get_by_fbappid", err, data)
		if(!err && data ) {
			var credential = {
				id: id,
				key: data.secret,
				algorithm: 'sha256',
			}
		    callback(null, credential);
		} else {
			console.log("Cannot find appid:", id)
		    callback(null, undefined);			
		}
	})
}

function SetSessionCredential( req, res, err, credentials, artifacts, next ) {
	console.log('hawk.server.authenticate', err)
	if( err ) {
		SendOAuthUnAuthorizedResponse(res, err)
	} else {
		req.session.credentials = credentials
		var email = artifacts.ext
        // check valid email
        if( (email == null) || (email == undefined) || (email.indexOf('@') < 0) ) {
            return SendOAuthUnAuthorizedResponse(res, "Invalid email")
        }
		User.get_by_email(email, function(err, user) {
			if( !err && user) {
				req.session.user = user
				console.log("hawk passed for ", email)
				next()
			} else {
				var md5 = crypto.createHash('md5').update(email + app.secret).digest("hex");

				var json = {
					singly_id: md5,
					md5: 	md5,
					name: 	email,
					email: 	email,
					organization: 'TBD',
					created_at: new Date(),
					updated_at: new Date(),
					gravatar: new_avatar(md5)
				}

				User.save(json, function(err, user) {
					if (!err) {
						req.session.user = user
						next()
					}
				})
			}
		})
	}
}

function hawk_restrict(req, res, next) {
	if( req.session.user ) return next()
	console.log("hawk_restrict client check...")
	Hawk.server.authenticate(req, FindCredentialsFunc, {}, function(err, credentials, artifacts) {
		SetSessionCredential( req, res, err, credentials, artifacts, next )
	})
}
// Home page -> app
app.get('/', 										home.index);
app.get('/about', 									home.about);
app.get('/contact', 								home.contact);
app.get('/privacy', 								home.privacy);
app.get('/terms',	 								home.terms);
app.get('/support', 								home.support);
app.get('/vocab',	 								jsonld.context);

app.get('/users', 									users.index);
app.get('/users/:id',	 							users.show);
app.post('/users/:id',	 							users.update);
app.get('/users', 									users.list);

app.get('/opensearch',								if_authorized, opensearch.index);
app.get('/opensearch/classic',						if_authorized, opensearch.classic);
app.get('/opensearch/gl',							if_authorized, opensearch.gl);
app.get('/opensearch/description',					opensearch.description);

app.options('/opensearch',							function(req, res) { setOptionsHeaders(req, res)})

app.all('/persona/verify',							persona.verify);
app.all('/persona/logout',							persona.logout);

//app.get('/social/facebook',						social.facebook);
//app.get('/social/twitter',						social.twitter);

app.get('/products/opensearch',						hawk_restrict, opensearch.index);
app.get('/products',								products.index);

app.get('/products/modis/list',					 	products_modis.list);
app.get('/products/modis/map/:year/:doy/:tile', 	products_modis.map);
app.get('/products/modis/browse/:year/:doy/:tile', 	products_modis.browse);
app.get('/products/modis/query/:year/:doy/:tile', 	products_modis.query);
app.get('/products/modis/:year/:doy/:tile/:id',		products_modis.product);
app.get('/products/modis/:year/:doy/:tile',			products_modis.process);

app.get('/products/dfo/list',						products_dfo.list);
app.get('/products/dfo/map/:scene',					products_dfo.map);
app.get('/products/dfo/browse/:scene',				products_dfo.browse);
app.get('/products/dfo/query/:scene',				products_dfo.query);
app.get('/products/dfo/:event/:date/:scene',		products_dfo.product);

app.get('/products/eo1_ali/list',					products_eo1_ali.list);
app.get('/products/eo1_ali/browse/:scene',			products_eo1_ali.browse);
app.get('/products/eo1_ali/query/:scene',			products_eo1_ali.query);
app.get('/products/eo1_ali/map/:scene',				products_eo1_ali.map);
app.get('/products/eo1_ali/:scene/:id',				products_eo1_ali.product);
app.get('/products/eo1_ali/:scene',					products_eo1_ali.process);

app.get('/products/l8/map/:scene',					products_l8.map);
app.get('/products/l8/browse/:scene',				products_l8.browse);
app.get('/products/l8/query/:scene',				products_l8.query);
app.get('/products/l8/list',						products_l8.list);
app.get('/products/l8/:scene/:id',					products_l8.product);
app.get('/products/l8/:scene',						products_l8.process);

app.get('/products/radarsat2/map/:scene',			products_radarsat2.map);
app.get('/products/radarsat2/browse/:scene',		products_radarsat2.browse);
app.get('/products/radarsat2/query/:scene',			products_radarsat2.query);
app.get('/products/radarsat2/list',					products_radarsat2.list);
app.get('/products/radarsat2/:scene/:id',			products_radarsat2.product);

//app.get('/products/digiglobe/browse/:scene',		products_digiglobe.browse);
//app.get('/products/digiglobe/map/:scene',			products_digiglobe.map);
//app.get('/products/digiglobe/:scene/:id',			products_digiglobe.product);
//app.get('/products/digiglobe/:scene',				products_digiglobe.process);

app.get('/products/frost/browse/:year/:doy',		products_frost.browse);
app.get('/products/frost/map/:year/:doy',			products_frost.map);
app.get('/products/frost/query/:year/:doy',			products_frost.query);
app.get('/products/frost/:year/:doy/:id',			products_frost.product);

//app.options('/products/opensearch',					function(req, res) {
//	console.log("OPTIONS on opensearch");
//	setOptionsHeaders(req, res)
//})

// Applications

app.get('/apps',									hawk_restrict, apps.index);
app.post('/apps',									hawk_restrict, apps.create);
app.get('/apps/form',								hawk_restrict, apps.form);
app.get('/apps/:id',								hawk_restrict, apps.show);
app.get('/apps/edit/:id',							hawk_restrict, apps.edit);
app.get('/apps/delete/:id',							hawk_restrict, apps.delete);
app.put('/apps/:id',								hawk_restrict, apps.update);
app.delete('/apps/:id',								hawk_restrict, apps.delete);

app.get('/mapinfo/modis',							mapinfo_modis.modis);
app.get('/mapinfo/modis/style',						mapinfo_modis.modis_style);
app.get('/mapinfo/modis/legend',					mapinfo_modis.modis_legend);
app.get('/mapinfo/modis/credits',					mapinfo_modis.modis_credits);

app.get('/mapinfo/l8',								mapinfo_l8.landsat8);
app.get('/mapinfo/l8/style',						mapinfo_l8.landsat8_style);
app.get('/mapinfo/l8/legend',						mapinfo_l8.landsat8_legend);
app.get('/mapinfo/l8/credits',						mapinfo_l8.landsat8_credits);

app.get('/mapinfo/frost',							mapinfo_frost.frost);
app.get('/mapinfo/frost/style',						mapinfo_frost.frost_style);
app.get('/mapinfo/frost/legend',					mapinfo_frost.frost_legend);
app.get('/mapinfo/frost/credits',					mapinfo_frost.frost_credits);

app.get('/mapinfo/radarsat2',						mapinfo_radarsat2.radarsat2);
app.get('/mapinfo/radarsat2/style',					mapinfo_radarsat2.radarsat2_style);
app.get('/mapinfo/radarsat2/legend',				mapinfo_radarsat2.radarsat2_legend);
app.get('/mapinfo/radarsat2/credits',				mapinfo_radarsat2.radarsat2_credits);

app.get('/mapinfo/eo1_ali',							mapinfo_eo1_ali.eo1_ali);
app.get('/mapinfo/eo1_ali/style',					mapinfo_eo1_ali.eo1_ali_style);
app.get('/mapinfo/eo1_ali/legend',					mapinfo_eo1_ali.eo1_ali_legend);
app.get('/mapinfo/eo1_ali/credits',					mapinfo_eo1_ali.eo1_ali_credits);

app.get('/mapinfo/dfo',								mapinfo_dfo.dfo);
app.get('/mapinfo/dfo/style',						mapinfo_dfo.dfo_style);
app.get('/mapinfo/dfo/legend',						mapinfo_dfo.dfo_legend);
app.get('/mapinfo/dfo/credits',						mapinfo_dfo.dfo_credits);

app.get('/products/:subfolder/browse/pop/:year',		products_pop.browse);
app.get('/products/:subfolder/map/pop/:year',			products_pop.map);
app.get('/products/:subfolder/query/pop/:year',			products_pop.query);
app.get('/products/:subfolder/query/pop/:year/:id',		products_pop.product);

app.get('/mapinfo/pop',								mapinfo_pop.pop);
app.get('/mapinfo/pop/style',						mapinfo_pop.pop_style);
app.get('/mapinfo/pop/legend',						mapinfo_pop.pop_legend);
app.get('/mapinfo/pop/credits',						mapinfo_pop.pop_credits);

app.get('/products/:subfolder/browse/:regionKey/:year/:doy',	function(req,res) { var subfolder = req.params.subfolder; s3_products[subfolder].Browse(req, res); })
app.get('/products/:subfolder/map/:regionKey/:year/:doy',		function(req,res) { var subfolder = req.params.subfolder; s3_products[subfolder].Map(req, res); })
app.get('/products/:subfolder/query/:regionKey/:year/:doy',		function(req,res) { var subfolder = req.params.subfolder; s3_products[subfolder].QueryProduct(req, res); })

app.get('/products/s3/:regionKey/:subfolder/:year/:doy/:id',	function(req,res) { var subfolder = req.params.subfolder; s3_products[subfolder].S3(req, res); })

app.get('/mapinfo/:subfolder',				function(req,res) { var subfolder = req.params.subfolder; s3_products[subfolder].MapInfo(req, res); })
app.get('/mapinfo/:subfolder/style',		function(req,res) { var subfolder = req.params.subfolder; s3_products[subfolder].Style(req, res); })
app.get('/mapinfo/:subfolder/legend',		function(req,res) { var subfolder = req.params.subfolder; s3_products[subfolder].Legend(req, res); })
app.get('/mapinfo/:subfolder/credits',		function(req,res) { var subfolder = req.params.subfolder; s3_products[subfolder].Credits(req, res); })

//app.get('/products/:region/:ymd/:id.:fmt?',			products.distribute);
//app.get('/products/map/:region/:ymd/:id.:fmt?',		products.map);
app.get('/products',								products.index);

//
// returned to OPTIONS
//
function setOptionsHeaders(req, res) {	
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");	
    res.header("Access-Control-Allow-Methods", "POST,GET,PUT");	
    res.header("Allow", "POST,GET,PUT");	
    //res.header("Content-Length", "0");	
    //res.header("Content-Type", "text/html; charset=utf-8");	
	res.send(200)
}

function setAuthHeaders(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Authorization");
	next()
}

// ===========================================================
// port set based on NODE_ENV settings (production, development or test)
logger.info("trying to start on port:"+ app.get('port'));

if (!module.parent) {
	app.listen(app.get('port'));
	
	logger.info( "**** "+app.config.application+' started on port:'+app.get('port'));
}