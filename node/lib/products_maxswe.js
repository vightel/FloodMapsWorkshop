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
	query_maxswe	= require("../lib/query_maxswe"),

	debug			= require('debug')('swe');
	
	var bbox 		= 	[60, 20, 80, 40]
	var centerlon	= (bbox[0]+bbox[2])/2
	var centerlat	= (bbox[1]+bbox[3])/2
	var target		= [centerlon, centerlat]
	
	
	function render_map(region, url, req, res) {
		debug("render_map", url)
		res.render("products/map_api", {
			region: region,
			url: url,
			layout: false
		})
	}
	
	module.exports = {

		browse: function(req,res) {
			var year 	= req.params['year']
			var doy 	= req.params['doy']
			var date 	= moment(year+"-"+doy)
			var host 	= "http://"+req.headers.host
			var region 	= {
				name: 	req.gettext("legend.snow_water_equivalent.title"),
				scene: 	year+"-"+doy,
				bbox: bbox,
				target: target
			}
			
			var jday	= date.dayOfYear()
			if( jday < 10 ) {
				jday = "00"+jday
			} else if( jday < 100 ) jday = "0"+jday

			var month = date.month() + 1
			if( month < 10 ) month = "0"+ month

			var day		= date.date();
			if( day < 10 ) day = "0"+day
			
			var s3host				= "https://s3.amazonaws.com/ojo-workshop/maxswe/" + year + "/" + jday + "/"
			var browse_img_url		= s3host+"maxswe."+date.year()+month+day+".120000_thn.jpg"
			var topojson_url		= s3host+"maxswe."+date.year()+month+day+".120000_levels.topojson"
			var topojson_file		= s3host+"maxswe."+date.year()+month+day+".120000_levels.topojson.gz"
			
			res.render("products/maxswe", {
				social_envs: 	app.social_envs,
				description: 	req.gettext("legend.snow_water_equivalent.title") +" - "+date.format("YYYY-MM-DD"),
				image: 			browse_img_url,
				url: 			host+"/products/maxswe/browse/"+year+"/"+doy,
				map_url: 		host+"/products/maxswe/map/"+year+"/"+doy,
				date: 			date.format("YYYY-MM-DD"),
				region: 		region,
				data: 			"http://flash.ou.edu/pakistan",
				topojson: 		topojson_file,
				layout: 		false
			})
		},

		map: function(req,res) {
			var year 	= req.params['year']
			var doy 	= req.params['doy']
			var date 	= moment(year+"-"+doy)
			var host 	= "http://"+req.headers.host
			var bbox	= bbox
			var id		= year+"-"+doy
			
			var region 	= {
				name: 	req.gettext("legend.snow_water_equivalent.title")+" "+date.format(req.gettext("formats.date")),
				scene: 	id,
				bbox: 	undefined,	// feature.bbox,
				target: target,
				min_zoom: 6
			}
			var url = "/products/maxswe/query/"+year+"/"+doy
			render_map(region, url, req, res )
		},
		
		query: function(req, res) {
			var year 		= req.params['year']
			var doy 		= req.params['doy']
			var user		= req.session.user
			var credentials	= req.session.credentials
			
			query_maxswe.QueryByID(req, user, year, doy, credentials, function(err, entry) {
				res.send(entry)
			}) 
		},
		
		process: function(req,res) {
	
		}
	};