var util 			= require('util'),
	fs				= require('fs'),
	async	 		= require('async'),
	path			= require('path'),
	moment			= require('moment'),
	request			= require('request'),
	xml2js 			= require('xml2js'),
	_				= require('underscore'),
	mime			= require('mime-types'),
	Hawk			= require('hawk'),
	query_eo1_ali	= require("../lib/query_eo1"),
	scene_model		= require('../models/scene.js'),
	childProcess 	= require('child_process'),
	debug			= require('debug')('eo1');
	
	function sendFile( res, file ) {
		var ext 		= path.extname(file)
		var basename 	= path.basename(file)
		var dirname 	= path.dirname(file)
		var ext			= path.extname(file)
		
		var mime_type 	= mime.lookup(path.basename(file))

		debug( "sendFile", ext, mime_type)
		
		if( ext == ".topojson") {
			res.header("Content-Type", "application/json")
			res.header("Content-Encoding", "gzip")
			basename += ".gz"
			debug("sending .topojson application/json gzip", basename)
		} else {
			debug("sending ", mime_type, basename, dirname)
			res.header("Content-Type", mime_type, basename)
			debug(ext, mime_type, "no encoding")
		}
		
		res.header("Access-Control-Allow-Origin", "*")
		res.sendfile(basename, {root: dirname})
	}
	
	function render_map(region, url, req, res) {
		debug("render_map", url)
		res.render("products/map_api", {
			region: region,
			url: url,
			layout: false
		})
	}
	
	module.exports = {

		product: function(req,res) {
			var scene 		= req.params['scene']
			var id 			= req.params['id']
		
			var product	= app.root+"/../data/eo1_ali/"+scene+"/"+id
			if( !fs.existsSync(product)) {
				if( fs.existsSync(product+".gz")) {
					debug("sending as topojson gzip encoded")
					sendFile(res, product)				
				} else {
					debug("Product does not exist")
					return res.send(400)
				}
			} else {
				sendFile(res, product)
			}
		},

		browse: function(req,res) {
			var scene 	= req.params['scene']
			var path	= parseInt(scene.substring(4,7))
			var row		= parseInt(scene.substring(7,10))
			var year	= scene.substring(10,14)	
		
			scene_model.getScene('eo1_ali', scene, function(err, record) {
				var date    = record.date
				var host 	= "http://"+req.headers.host
				var short	= record.scene.split('_')[0]
				
				var region	= {
					name: 	"EO-1 ALI Flood Map",
					scene: 	scene,
					bbox: 	scene_model.bboxFromGeom(record.g),
					target: [record.center_lat, record.center_lon]
				}
		
				res.render("products/eo1", {
					social_envs: 	app.social_envs,
					description: 	"EO-1 ALI Flood Map",
					image: 			host+"/products/eo1_ali/"+scene+"/"+ short+"_watermap_browseimage.thn.png",
					url: 			host+"/products/eo1_ali/browse/"+scene,
					date: 			date,
					region: 		region,
					data: 			"http://earthexplorer.usgs.gov/browse/eo1_ali/"+year+"/"+path+"/"+row+"/"+record.scene+".jpg",
					topojson: 		host+"/products/eo1_ali/"+scene+"/"+short+"_WATERMAP.tif.hand.tif.pgm.topojson.gz",
					layout: 		false
				})
			})
		},

		map: function(req,res) {
			var host 	= "http://"+req.headers.host
			var scene 	= req.params['scene']
			scene_model.getScene('eo1_ali', scene, function(err, record) {
				if( !err && record ) {
					var date    = record.date
					var host 	= "http://"+req.headers.host
					var region 	= {
						name: 	"EO-1 ALI Flood Map",
						scene: 	scene,
						bbox: 	undefined, //scene_model.bboxFromGeom(record.g),
						target: [record.center_lat, record.center_lon],
						min_zoom: 6
					}
					//var topojson=	host+"/products/radarsat2/"+scene+"/surface_water.topojson"
					var url = "/products/eo1_ali/query/"+scene
					render_map(region, url, req, res )
				}
			})
		},
		
		query: function(req, res) {
			var scene 		= req.params['scene']
			var user		= req.session.user
			var credentials	= req.session.credentials
	
			scene_model.getScene('eo1_ali', scene, function(err, record) {
				if( !err ) {
					debug("query record", record)
					var entry = query_eo1_ali.QueryByID(req, user, record, credentials) 
					res.send(entry)
				} else {
					res.send(400, "EO-1 ALI Query Error")
				}
			})
		},
		
		list: function(req, res) {
			var user 		= req.session.user
			var base_dir	= app.root+"/../data/eo1_ali/"
			scene_model.getAllScenes('eo1_ali', function(err, records) {
				var results = _.filter(records, function(r) {
					return fs.existsSync(base_dir+ r.scene)
				})
		
				debug("eo1_ali_list", records.length, results.length)

				res.render("products/list", {
					user: 			user,
					description: 	"EO-1 ALI Scenes",
					base_href: 		"/products/eo1_ali/browse/",
					records: 		results
				})
			})
		},
		
		process: function(req,res) {
			var scene 	= req.params['scene']
			var cmd 	= app.root + "/../python/download_eo1.py --scene "+scene
			debug(cmd)
			var child = childProcess.exec(cmd, function (error, stdout, stderr) {
				if (error) {
			  	   debug(error.stack);
			  	   debug('Error code: '+error.code);
			  	   debug('Signal received: '+error.signal);
			   	}
				debug('Child Process STDOUT: '+stdout);
				debug('Child Process STDERR: '+stderr);
			});

			child.on('exit', function (code) {
				debug('Child process exited with exit code '+code);
			}); 
		}
	};