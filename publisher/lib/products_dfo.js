var util 			= require('util'),
	fs				= require('fs'),
	async	 		= require('async'),
	path			= require('path'),
	moment			= require('moment'),
	request			= require('request'),
	// xml2js 			= require('xml2js'),
	_				= require('underscore'),
	mime			= require('mime-types'),
	Hawk			= require('hawk'),
	query_dfo		= require("../lib/query_dfo"),
	scene_model		= require('../models/scene.js'),
	debug			= require('debug')('dfo');
	
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
			var eventNum	= req.params['event']
			var date		= req.params['date']
	
			var product	= app.root+"/../data/dfo/"+eventNum+"/"+date+"/"+scene
		
			debug("dfo_product", product)
		
			if( (product.indexOf("topojson")>0) || !fs.existsSync(product)) {
				if( fs.existsSync(product+".gz")) {
					debug("sending as topojson gzip encoded")
					sendFile(res, product)				
				} else {
					logger.error("DFO Product does not exist", product)
					return res.send(400)
				}
			} else {
				sendFile(res, product)
			}
		},

		browse: function(req,res) {
			var scene 		= req.params['scene']
			var arr			= scene.split("_")
			var dt			= arr[0]
			var eventNum	= arr[2]
			var year		= dt.substring(0,4)	
		
			debug("browse_dfo", eventNum, dt, scene)
		
			scene_model.getScene('dfo', scene, function(err, record) {
				var date    = record.date
				var host 	= "http://"+req.headers.host
				var region 	= {
					name: 	"DFO Flood Map",
					scene: 	scene,
					bbox: 	scene_model.bboxFromGeom(record.g),
					target: [record.center_lat, record.center_lon]
				}
		
				res.render("products/dfo", {
					social_envs:	app.social_envs,
					description: 	"Dartmouth Flood Observatory Map",
					image: 			host+"/products/dfo/"+eventNum+"/"+dt+"/browseimage.png",
					url: 			host+"/products/dfo/browse/"+scene,
					date: 			date,
					region: 		region,
					data: 			"http://floodobservatory.colorado.edu/Version3/"+year+arr[1]+arr[2]+".html",
					topojson: 		host+"/products/dfo/"+eventNum+"/"+dt+"/watermap.topojson",
					layout: 		false
				})
			})
		},

		map: function(req,res) {
			var host 	= "http://"+req.headers.host
			var scene 	= req.params['scene']
			scene_model.getScene('dfo', scene, function(err, record) {
				if( !err && record ) {
					var date    = record.date
					var host 	= "http://"+req.headers.host
					var region 	= {
						name: 	"DFO Flood Map",
						scene: 	scene,
						bbox: 	undefined, //scene_model.bboxFromGeom(record.g),
						target: [record.center_lon,record.center_lat],
						min_zoom: 6
					}
					//var topojson=	host+"/products/radarsat2/"+scene+"/surface_water.topojson"
					var url = "/products/dfo/query/"+scene
					render_map(region, url, req, res )
				}
			})
		},
		
		query: function(req, res) {
			var scene 		= req.params['scene']
			var user		= req.session.user
			var credentials	= req.session.credentials
	
			scene_model.getScene('dfo', scene, function(err, record) {
				if( !err ) {
					debug("query record", record)
					var entry = query_dfo.QueryByID(req, user, record, credentials) 
					res.send(entry)
				} else {
					res.send(400, "DFO Query Error")
				}
			})
		},
		
		list: function(req, res) {
			var user 		= req.session.user
			var base_dir	= app.root+"/../data/dfo/"
			scene_model.getAllScenes('dfo', function(err, records) {
				var results = _.filter(records, function(r) {
					return fs.existsSync(base_dir+ r.scene)
				})
		
				debug("dfo_list", records.length, results.length)

				res.render("products/list", {
					user: 			user,
					description: 	"DFO ALI Scenes",
					base_href: 		"/products/dfo/browse/",
					records: 		results
				})
			})
		},
		
		process: function(req,res) {
			res.send(400, "No DFO Processing available")
		}
	};