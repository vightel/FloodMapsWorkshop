var util 			= require('util'),
	fs				= require('fs'),
	async	 		= require('async'),
	path			= require('path'),
	moment			= require('moment'),
	request			= require('request'),
	xml2js 			= require('xml2js'),
	glob			= require('glob'),
	_				= require('underscore'),
	mime			= require('mime-types'),
	Hawk			= require('hawk'),
	query_modis		= require("../lib/query_modis"),
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
			var year 	= req.params['year']
			var doy 	= req.params['doy']
			var tile 	= req.params['tile']
			var id 		= req.params['id']
		
			var product	= app.root+"/../data/modis/"+year+"/"+doy+"/"+tile+"/"+id
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
			var year 	= req.params['year']
			var doy 	= req.params['doy']
			var tile 	= req.params['tile']
			var id		= year.toString() + doy+"_"+tile
			var date    = moment(year+"-"+doy)
		
			var lon 	= parseFloat(tile.substring(0,3))
			var ew  	= tile[3]
			var ns 		= tile[7]
			var lat 	= parseFloat(tile.substring(4,7))
		
			if( ew == 'W') lon = -lon
			if( ns == 'S') lat = -lat
		
			var centerlat 	= lat - 5.0
			var centerlon 	= lon - 5.0
			var bbox		= [lon, lat-10.0, lon+10.0,lat]
		
			var host = "http://"+req.headers.host
			var region = {
				name: 	"Haiti",
				scene: 	tile,
				bbox: 	bbox,
				target: [centerlat, centerlon]
			}
		
			res.render("products/modis", {
				social_envs:	app.social_envs,
				description: 	"MODIS Flood Map",
				image: 			host+"/products/modis/"+year+"/"+doy+"/"+tile+"/OSM_SWP_"+id+".png",
				url: 			host+"/products/modis",
				date: 			date.format("YYYY-MM-DD"),
				year: 			year,
				doy: 			doy,
				region: 		region,
				data: 			"http://oas.gsfc.nasa.gov/floodmap/getTile.php?location="+tile+"&day="+doy+"&year="+year+"&product=2",
				topojson: 		app.root+"/../data/modis/"+year+"/"+doy+"/"+tile+"/SWP_"+id+"_2D2OT.topojson.gz",
				layout: 		false
			})
		
		},

		map: function(req,res) {
			var host = "http://"+req.headers.host
			var year 	= req.params['year']
			var doy 	= req.params['doy']
			var tile 	= req.params['tile']
			var id		= year.toString() + doy+"_"+tile
			var date    = moment(year+"-"+doy)
			var lon 	= parseFloat(tile.substring(0,3))
			var ew  	= tile[3]
			var ns 		= tile[7]
			var lat 	= parseFloat(tile.substring(4,7))
	
			if( ew == 'W') lon = -lon
			if( ns == 'S') lat = -lat
	
			var centerlat 	= lat - 5.0
			var centerlon 	= lon + 5.0
			var bbox		= [lon, lat-10.0, lon+10.0,lat]
	
			var region = {
				name: 	"MODIS Flood Map",
				scene: 	tile,
				bbox: 	undefined, //bbox,
				target: [centerlat, centerlon]
			}
			debug("map_modis", region)
	
			var url=	host+"/products/modis/query/"+year+"/"+doy+"/"+tile
			render_map(region, url, req, res )
		},
		
		query: function(req, res) {
			var year 		= req.params['year']
			var doy 		= req.params['doy']
			var tile 		= req.params['tile']
			var user		= req.session.user
			var credentials	= req.session.credentials
			
			var entry 		= query_modis.QueryByID(req, user, year, doy, tile, credentials) 
			res.send(entry)
		},
		
		list: function(req, res) {
			var user 		= req.session.user
			var base_dir	= app.root+"/../data/modis/"
			var pattern		= base_dir+"*/*/*/*.gz"
				
			var records = []

			glob(pattern, function(err, files) {
			
				for( var f in files) {
					var nf 	= files[f].replace(fs.realpathSync(base_dir), '')
					var arr = nf.split('/') 
					var el	= { 	year: arr[1],
									doy: arr[2],
									tile: arr[3],
									scene: path.join(arr[1], arr[2], arr[3]) 
								}
					records.push( el )
				}
			
				res.render("products/list", {
					user: user,
					description: 	"MODIS Scenes",
					base_href: 		"/products/modis/browse/",
					records: records
				})
			})
		},
		
		process: function(req,res) {
			console.log("Process MODIS Tile")
			var year 	= req.params['year']
			var doy 	= req.params['doy']
			var tile 	= req.params['tile']
		
			var cmd = app.root + "/../python/modis.py -p 2 -y "+year+" -d "+doy+" -t "+tile
			console.log(cmd)

			var child = childProcess.exec(cmd, function (error, stdout, stderr) {
				if (error) {
			  	   console.log(error.stack);
			  	   logger.error('Error code: '+error.code);
			  	   logger.error('Signal received: '+error.signal);
				   res.send(500)
			   	} else {
					logger.info('Child Process STDOUT: '+stdout);
					debug('Child Process STDERR: '+stderr);
					res.send(200)
				}
			});

			child.on('exit', function (code) {
				debug('Child process exited with exit code '+code);
			}); 
		}
	};