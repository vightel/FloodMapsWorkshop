var express 		= require('express'),
	util			= require('util'),
	partials 		= require('express-partials'),
	assert			= require('assert'),
	fs				= require('fs'),
	path			= require('path'),
	debug 			= require('debug')('server'),
	engines			= require('consolidate'),
	pg 				= require('pg'),
	//PGStore 		= require('connect-pg'),
	ejs				= require('ejs'),
	crypto 			= require('crypto'),
	eyes			= require('eyes'),
	winston			= require('winston'),
	_				= require('underscore'),
	i18n			= require('./lib/i18n-abide'),
	filesize 		= require('filesize'),
	aws				= require("aws-sdk"),
	facebook		= require('./lib/facebook');
	
	global.logger = new winston.Logger({
		transports: [
			new (winston.transports.Console)(),
			new (winston.transports.File)({ filename: 'ojo-publisher.log' })
		]
	});
	
	// AWS Amazon
	app.s3_config = {
		accessKeyId: 		process.env.AWS_ACCESSKEYID, 
		secretAccessKey: 	process.env.AWS_SECRETACCESSKEY,
		region:				process.env.AWS_REGION || 'us-east-1',
		cache_dir: 			"./tmp",
	}

	assert( app.s3_config.accessKeyId, "Missing S3 accessKeyID env" )
	assert( app.s3_config.secretAccessKey, "Missing S3 secretAccessKey env")
	assert( app.s3_config.region, "Missing S3 region env" )

	aws.config.update(app.s3_config);

	app.s3 = new aws.S3();

	logger.info("Connected to S3...")
	
	// Pick a secret to secure your session storage
	app.sessionSecret = process.env.COOKIEHASH || 'OJO-PUBLISHER-PGC-2014-06';

	exports.boot = function(app){

		// The port that this express app will listen on
		debug("app_port:"+app_port)
		
		var port

		if( app.settings.env === 'development') {
			port 	= app_port;
		} else {
			port 	= app.config.PORT;		
		}
		app.set('port', port)
		
		bootApplication(app)
		
		var social_envs = [
			'FACEBOOK_APP_SECRET',
			'FACEBOOK_APP_ID',
			'FACEBOOK_PROFILE_ID',
			'TWITTER_SITE',
			'TWITTER_SITE_ID',
			'TWITTER_CREATOR',
			'TWITTER_CREATOR_ID',
			'TWITTER_DOMAIN',
			'MAPBOX_PUBLIC_TOKEN'
		]
		
		app.social_envs = {}
		
		_.each(social_envs, function(e) {
			var env_var = process.env[e]
			assert(env_var, "Missing env:"+e)
			app.social_envs[e] = env_var
			console.log(e, env_var)
		})
		
		var appId		= process.env.FACEBOOK_APP_ID
		var appSecret	= process.env.FACEBOOK_APP_SECRET
		assert(appId)
		assert(appSecret)
		
		app.facebook	= facebook.init(appId, appSecret)

		app.facebook.GenerateSecret(function(err, secret) {
			logger.info("Application Hawk Key:", err,secret)
			app.hawk_secret = secret
			app.hawk_id 	= appId
		})		
	}
	
// ===============================	
// Helper to set env in app global
//
function app_set_env( env_var ) {
	app[env_var] = process.env[env_var]
	assert( app[env_var], env_var + " env is missing")
}
	
// ===========================
// App settings and middleware
function bootApplication(app) {

	// load config
	app.config 	= JSON.parse(fs.readFileSync("./config/config.yaml"));
	
	// define a custom res.message() method
	// which stores messages in the session
	app.response.message = function(msg){
	  // reference `req.session` via the `this.req` reference
	  var sess = this.req.session;
	  // simply add the msg to an array for later
	  sess.messages = sess.messages || [];
	  sess.messages.push(msg);
	  return this;
	};
	
	// serve static files
	app.use(express.static(__dirname + '/public'));
	app.use(partials());

	app.set('views', __dirname + '/app/views')
	app.set('helpers', __dirname + '/app/helpers/')
   	app.set('view engine', 'ejs');
	app.engine('html', engines.ejs);
	
	app.set('view options', { layout: 'layout.ejs' })

	// cookieParser should be above session
	app.use(express.cookieParser(app.sessionSecret))

	// bodyParser should be above methodOverride
	// app.use(express.bodyParser())
	app.use(express.json());
	app.use(express.urlencoded());
	
	app.use(express.methodOverride())

	var conString 	= process.env.DATABASE_URL || "tcp://nodepg:password@localhost:5432/dk";
	logger.info("Connecting to db:", conString)
		
 	function pgConnect (callback) {
		pg.connect(conString, function (err, client, done) {			
			if (err) {
				logger.info("database:", conString);
				logger.info(JSON.stringify(err));
			}
			if (client) {
				callback(client);
			}
			done()	// THIS IS CRITICAL TO RETURN CLIENT TO THE POOL.... GRRRR!
		});
    };	
		
	//app.use(express.session({
	//	  secret: app.sessionSecret,
	//	  cookie: { maxAge: 1 * 360000}, //1 Hour*24 in milliseconds
	//	  store: new PGStore(pgConnect)
	//}))
	
	// DO NOT DO THIS IN PRODUCTION - USE A DATABASE STORE
	// Just use cookies for example
	app.use(express.session());
	
	app.use(i18n.abide({
		supported_languages: ['en', 'es', 'fr', 'pt'],
		//supported_languages: ['en', 'fr', 'es', 'pt', 'de'],
		default_lang: 'en',
		translation_directory: 'locale',
		translation_type: 'transiflex',
		logger: console
	}));
	
	// localize GetFileSize
	app.locals.GetFileSize = function(fileName, t) {
		try {
			var stats	= fs.statSync( fileName )
			return filesize( stats.size, 
								{round:2, suffixes: {
											"B": t("filesize.B"), 
											"kB": t("filesize.KB"), 
											"MB": t("filesize.MB"), 
											"GB": t("filesize.GB"), 
											"TB": t("filesize.TB")
										}
								}
							)
		} catch( e ) {
			return "NA"
		}
	}
	
	app.locals.filesize = function(size, req ) {
		return filesize( size, {round:2, suffixes: {
										"B": req.gettext("filesize.B"), 
										"kB": req.gettext("filesize.KB"), 
										"MB": req.gettext("filesize.MB"), 
										"GB": req.gettext("filesize.GB"), 
										"TB": req.gettext("filesize.TB")}})
									}
	app.locals.format = util.format
	
	app.client = new pg.Client(conString);
	app.client.connect(function(err) {
		if(err) {
			return logger.error('could not connect to ', conString, err);
	  	}
		app.client.query('SELECT NOW() AS "theTime"', function(err, result) {
			if(err) {
				logger.error('error running query', err);
			} else {
				logger.info("startup time: " + result.rows[0].theTime);
			}
		});	
	});
	
	app.use(express.favicon())
		
	//app.use(express.csrf());
	app.use(function(req, res, next) {
		//res.locals.token = req.csrfToken();
		//console.log('csrf:', res.locals.token);
		next()
	});

	app.use(function(req, res, next) {
	  req.raw_post = '';
	  req.setEncoding('utf8');

	  req.on('data', function(chunk) { 
	    req.raw_post += chunk;
	  });

	  next();
	});
	
	// expose the "messages" local variable when views are rendered
	app.use(function(req, res, next){

	  var msgs = req.session.messages || [];

	  // expose "messages" local variable
	  res.locals.messages = msgs;

	  // expose "hasMessages"
	  res.locals.hasMessages = !! msgs.length;

	  /* This is equivalent:
	   res.locals({
	     messages: msgs,
	     hasMessages: !! msgs.length
	   });
	  */

	  // empty or "flush" the messages so they
	  // don't build up
	  req.session.messages = [];
	  next();
	});
	
	app.use(app.router)
	
	// Error Handling
	app.use(function(err, req, res, next){
	  // treat as 404
	  if (~err.message.indexOf('not found')) return next()

	  // log it
	  console.error(err.stack)

	  // error page
	  res.status(500).render('500', { layout: false })
	})

	// assume 404 since no middleware responded
	app.use(function(req, res, next){
	  res.status(404).render('404', { layout: false, url: req.originalUrl })
	})
}
