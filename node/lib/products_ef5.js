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
	query_ef5		= require("../lib/query_ef5"),
	debug			= require('debug')('frost');
	
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
			var year 	= req.params['year']
			var doy 	= req.params['doy']
			var id 		= req.params['id']
			var product	= app.root+"/../data/ef5/"+year+"/"+doy+"/"+id
		
		
			if( !fs.existsSync(product)) {
				if( fs.existsSync(product+".gz")) {
					logger.info("sending as topojson gzip encoded")
					sendFile(res, product)				
				} else {
					logger.error("Product does not exist", product)
					return res.send(400)
				}
			} else {
				logger.info("sending floodmap product", product)
				sendFile(res, product)
			}
		},

		browse: function(req,res) {
			var year 	= req.params['year']
			var doy 	= req.params['doy']
			var date 	= moment(year+"-"+doy)
			var host 	= "http://"+req.headers.host
			var region 	= {
				name: 	req.gettext("legend.flood_forecast.title"),
				scene: 	year+"-"+doy,
				bbox: [10,-10,33,-25],
				target: [1, 14]
			}
			
			res.render("products/flood_forecast", {
				social_envs: 	app.social_envs,
				description: 	req.gettext("legend.flood_forecast.title") +" - "+date.format("YYYY-MM-DD"),
				image: 			host+"/thn/ef5/"+year+"/"+doy+"/thn.jpg",
				url: 			host+"/products/flood_forecast/browse/"+year+"/"+doy,
				map_url: 		host+"/products/flood_forecast/map/"+year+"/"+doy,
				date: 			date.format("YYYY-MM-DD"),
				region: 		region,
				data: 			" http://flash.ou.edu/namibia",
				topojson: 		host+"/products/flood_forecast/"+year+"/"+doy+"/"+ year+doy+"_flood_forecast.topojson",
				layout: 		false
			})
		},

		map: function(req,res) {
			var year 	= req.params['year']
			var doy 	= req.params['doy']
			var date 	= moment(year+"-"+doy)
			var host 	= "http://"+req.headers.host
			var bbox	= [10,-10,33,-25]
			var id		= year+"-"+doy
						
			var centerlon	= (bbox[0]+bbox[2])/2
			var centerlat	= (bbox[1]+bbox[3])/2
			
			var region 	= {
				name: 	req.gettext("legend.flood_forecast.title")+" "+date.format(req.gettext("formats.date")),
				scene: 	id,
				bbox: 	undefined,	// feature.bbox,
				target: [centerlat, centerlon],
				min_zoom: 6
			}
			var url = "/products/flood_forecast/query/"+year+"/"+doy
			render_map(region, url, req, res )
		},
		
		query: function(req, res) {
			var year 		= req.params['year']
			var doy 		= req.params['doy']
			var user		= req.session.user
			var credentials	= req.session.credentials
			
			var entry = query_ef5.QueryByID(req, user, year, doy, credentials) 
			res.send(entry)
		},
		
		process: function(req,res) {
	
		}
	};