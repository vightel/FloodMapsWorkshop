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
	query_radarsat2	= require("../lib/query_radarsat2"),
	scene_model		= require('../models/scene.js'),
	debug			= require('debug')('radarsat2');
	
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
		
			var product	= app.root+"/../data/radarsat2/"+scene+"/"+id
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
		
			scene_model.getScene('radarsat2', scene, function(err, record) {
				var date    = record.date
				var host = "http://"+req.headers.host
				var region = {
					name: 	"Radarsat-2 Flood Map",
					scene: 	scene,
					bbox: 	scene_model.bboxFromGeom(record.g),
					target: [record.center_lat, record.center_lon]
				}
		
				res.render("products/radarsat2", {
					social_envs: 	app.social_envs,
					description: 	"Radarsat2 Flood Map",
					image: 			host+"/products/radarsat2/"+scene+"/surface_water_osm.png",
					url: 			host+"/products/radarsat2/browse/"+scene,
					date: 			date,
					region: 		region,
					data: 			"http://www.asc-csa.gc.ca/eng/satellites/radarsat2/order-contact.asp",
					topojson: 		host+"/products/radarsat2/"+scene+"/surface_water.topojson.gz",
					layout: 		false
				})
			})
		},

		map: function(req,res) {
			var scene 	= req.params['scene']
			scene_model.getScene('radarsat2', scene, function(err, record) {
				if( !err && record ) {
					var date    = record.date
					var host 	= "http://"+req.headers.host
					var region 	= {
						name: 	"Radarsat-2 Flood Map",
						scene: 	scene,
						bbox: 	undefined, //scene_model.bboxFromGeom(record.g),
						target: [record.center_lat, record.center_lon],
						min_zoom: 6
					}
					//var topojson=	host+"/products/radarsat2/"+scene+"/surface_water.topojson"
					var url = "/products/radarsat2/query/"+scene
					render_map(region, url, req, res )
				}
			})
		},
		
		query: function(req, res) {
			var scene 		= req.params['scene']
			var user		= req.session.user
			var credentials	= req.session.credentials
	
			scene_model.getScene('radarsat2', scene, function(err, record) {
				if( !err ) {
					debug("query record", record)
					var entry = query_radarsat2.QueryByID(req, user, record, credentials) 
					res.send(entry)
				} else {
					res.send(400, "Radarsat-2 query error")
				}
			})
		},
		
		list: function(req, res) {
			var user 		= req.session.user
			var base_dir	= app.root+"/../data/radarsat2/"
			scene_model.getAllScenes('radarsat2', function(err, records) {
				var results = _.filter(records, function(r) {
					console.log(r.scene)
					return fs.existsSync(base_dir+ r.scene)
				})
				debug("radarsat2_list", records.length, results.length)

				res.render("products/list", {
					user: 			user,
					description: 	"Radarsat-2 Scenes",
					base_href: 		"/products/radarsat2/browse/",
					records: 		results
				})
			})
		},
		
		process: function(req,res) {
			res.send(400, "Radarsat-2 Processing Not Implemented")
		}
	};