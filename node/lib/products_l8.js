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
	query_l8		= require("../lib/query_l8"),
	scene_model		= require('../models/scene.js'),
	childProcess 	= require('child_process'),
	debug			= require('debug')('l8');
	
	function sendFile( res, file ) {
		var ext 		= path.extname(file)
		var basename 	= 	path.basename(file)
		var dirname 	= 	path.dirname(file)
		var ext			= 	path.extname(file)
		
		var mime_type = mime.lookup(path.basename(file))

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
		
			var product	= app.root+"/../data/l8/"+scene+"/"+id
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
			var path	= scene.substring(3,6)
			var row		= scene.substring(6,9)
			var year	= scene.substring(9,13)		
		
			scene_model.getScene('l8', scene, function(err, record) {
				var date    = record.date
				var host 	= "http://"+req.headers.host
				var region	= {
					name: 	"Landsat-8 Flood Map",
					scene: 	scene,
					bbox: 	scene_model.bboxFromGeom(record.g),
					target: [record.center_lat, record.center_lon]
				}
		
				res.render("products/l8", {
					social_envs: 	app.social_envs,
					description: 	"Landsat-8 Flood Map",
					image: 			host+"/products/l8/"+scene+"/"+scene+"_watermap_browseimage.thn.png",
					url: 			host+"/products/l8/browse/"+scene,
					date: 			date,
					region: 		region,
					data: 			"http://earthexplorer.usgs.gov/browse/landsat_8/"+year+"/"+path+"/"+row+"/"+record.scene+".jpg",
					topojson: 		host+"/products/l8/"+scene+"/"+scene+"_WATERMAP.tif.hand.tif.pgm.topojson",
					layout: 		false
				})
			})
		},

		map: function(req,res) {
			var host 	= "http://"+req.headers.host
			var scene 	= req.params['scene']
			scene_model.getScene('l8', scene, function(err, record) {
				if( !err && record ) {
					var date    = record.date
					var host 	= "http://"+req.headers.host
					var region 	= {
						name: 	"Landsat-8 Flood Map",
						scene: 	scene,
						bbox: 	undefined, //scene_model.bboxFromGeom(record.g),
						target: [record.center_lon, record.center_lat],
						min_zoom: 6
					}
					//var topojson=	host+"/products/radarsat2/"+scene+"/surface_water.topojson"
					var url = "/products/l8/query/"+scene
					render_map(region, url, req, res )
				}
			})
		},
		
		query: function(req, res) {
			var scene 		= req.params['scene']
			var user		= req.session.user
			var credentials	= req.session.credentials
	
			scene_model.getScene('l8', scene, function(err, record) {
				if( !err ) {
					debug("query record", record)
					var entry = query_l8.QueryByID(req, user, record, credentials) 
					res.send(entry)
				} else {
					res.send(400, "Landsat-8 Query Error")
				}
			})
		},
		
		list: function(req, res) {
			var user = req.session.user
			var base_dir	= app.root+"/../data/l8/"
			scene_model.getAllScenes('l8', function(err, records) {
				var results = _.filter(records, function(r) {
					return fs.existsSync(base_dir+ r.scene)
				})
				debug("l8_list", records.length, results.length)

				res.render("products/list", {
					user: 			user,
					description: 	"Landsat-8 Scenes",
					base_href: 		"/products/l8/browse/",
					records: 		results
				})
			})
		},
		process: function(req,res) {
			var scene = req.params['scene']
			var cmd = app.root + "/../python/download_landsat8.py --scene "+scene
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