/**
 * Module dependencies.
 */

var express 		= require('express'),
	path			= require('path'),
	util			= require('util'),
	fs				= require('fs'),
  	debug 			= require('debug')('server'),
	eyes			= require('eyes'),
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
	mapinfo			= require('./app/controllers/mapinfo');
	
var app = module.exports = express();

global.app 			= app;
app.root 			= process.cwd();

var mainEnv 		= app.root + '/config/environment'+'.js';
var supportEnv 		= app.root + '/config/environments/' + app.settings.env+'.js';

require(mainEnv)
require(supportEnv)

// load settings
require('./settings').boot(app)  

// load controllers
require('./lib/boot')(app, { verbose: !module.parent });

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
app.get('/', 									home.index);
app.get('/about', 								home.about);
app.get('/contact', 							home.contact);
app.get('/privacy', 							home.privacy);
app.get('/terms',	 							home.terms);
app.get('/support', 							home.support);

app.get('/users', 								users.index);
app.get('/users/:id',	 						users.show);
app.post('/users/:id',	 						users.update);
app.get('/users', 								users.list);

app.get('/opensearch',							if_authorized, opensearch.index);
app.get('/opensearch/classic',					if_authorized, opensearch.classic);
app.get('/opensearch/gl',						if_authorized, opensearch.gl);


app.all('/persona/verify',						persona.verify);
app.all('/persona/logout',						persona.logout);

//app.get('/social/facebook',					social.facebook);
//app.get('/social/twitter',					social.twitter);

app.get('/products/opensearch',					hawk_restrict, products.opensearch);
app.get('/products',							products.index);

app.get('/products/eo1_ali/:scene',					products.process_eo1_ali);
app.get('/products/eo1_ali/browse/:scene',			products.browse_eo1_ali);
app.get('/products/eo1_ali/map/:scene',				products.mapclassic_eo1_ali);
app.get('/products/eo1_ali/mapgl/:scene',			products.mapgl_eo1_ali);
app.get('/products/eo1_ali/:scene/:id',				products.eo1_ali_product);

app.get('/products/modis/map/:year/:doy/:tile', 	products.mapclassic_modis);
app.get('/products/modis/mapgl/:year/:doy/:tile', 	products.mapgl_modis);
app.get('/products/modis/browse/:year/:doy/:tile', 	products.browse_modis);
app.get('/products/modis/:year/:doy/:tile/:id',		products.modis_product);
app.get('/products/modis/:year/:doy/:tile',			products.process_modis);

app.get('/products/radarsat2/map/:scene',			products.mapclassic_radarsat2);
app.get('/products/radarsat2/mapgl/:scene',			products.mapgl_radarsat2);
app.get('/products/radarsat2/browse/:scene',		products.browse_radarsat2);
app.get('/products/radarsat2/:scene/:id',			products.radarsat2_product);

app.get('/products/l8/map/:scene',					products.mapclassic_l8);
app.get('/products/l8/mapgl/:scene',				products.mapgl_l8);
app.get('/products/l8/browse/:scene',				products.browse_l8);
app.get('/products/l8/:scene/:id',					products.l8_product);
app.get('/products/l8/:scene',						products.process_l8);

app.get('/products/dfo/map/:scene',					products.mapclassic_dfo);
app.get('/products/dfo/browse/:scene',				products.browse_dfo);
app.get('/products/dfo/:event/:date/:scene',		products.dfo_product);


app.options('/products/opensearch',				function(req, res) {
	console.log("OPTIONS on opensearch");
	setOptionsHeaders(req, res)
})

// Applications

app.get('/apps',								hawk_restrict, apps.index);
app.post('/apps',								hawk_restrict, apps.create);
app.get('/apps/form',							hawk_restrict, apps.form);
app.get('/apps/:id',							hawk_restrict, apps.show);
app.get('/apps/edit/:id',						hawk_restrict, apps.edit);
app.get('/apps/delete/:id',						hawk_restrict, apps.delete);
app.put('/apps/:id',							hawk_restrict, apps.update);
app.delete('/apps/:id',							hawk_restrict, apps.delete);

app.get('/mapinfo/modis',						mapinfo.modis);
app.get('/mapinfo/modis/style',					mapinfo.modis_style);
app.get('/mapinfo/modis/legend',				mapinfo.modis_legend);
app.get('/mapinfo/modis/credits',				mapinfo.modis_credits);

app.get('/mapinfo/landsat8',					mapinfo.landsat8);
app.get('/mapinfo/landsat8/style',				mapinfo.landsat8_style);
app.get('/mapinfo/landsat8/legend',				mapinfo.landsat8_legend);
app.get('/mapinfo/landsat8/credits',			mapinfo.landsat8_credits);

app.get('/mapinfo/modis',						mapinfo.modis);
app.get('/mapinfo/modis/style',					mapinfo.modis_style);
app.get('/mapinfo/modis/legend',				mapinfo.modis_legend);
app.get('/mapinfo/modis/credits',				mapinfo.modis_credits);

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