var util	= require('util'),
	async	= require('async'),
	eyes	= require('eyes'),
	debug	= require('debug')('home'),
	request = require('request'),
	fs		= require('fs'),
	user	= require('../../models/user');

	function render_region(dx, req, res) {
		var user			= req.session.user
		var region 			= app.config.regions[dx]
		var ymd				= "20131204"
		var trmm24			= "trmm_24_"+dx+"_"+ymd 
		var wrfqpe			= "wrf_precip_"+dx+"_"+ymd
		var landslide		= "landslide_estimate_"+dx+"_"+ymd
		var susceptibility	= "susmap_"+dx
		
		res.render ("home/regional.ejs", {
			user: 		user,
			region: 	region,
			worldmapid: app.config.worldmapid,
			trmm24: 	trmm24,
			wrfqpe: 	wrfqpe,
			landslide:  landslide,
			susceptibility: susceptibility
		})
	}
	
	
module.exports = {
	index: function(req, res) {  
		var region 	= app.config.regions['d02']
		var user	= req.session.user
		var host	= req.protocol +"://" + req.headers.host
				
		//console.log("home index user:", user)		
		if( req.session.returnTo ) {
			console.log("redirect to:", req.session.returnTo)
			res.redirect(req.session.returnTo)
			req.session.returnTo = undefined
			return
		} 
		
		res.render ("home/index.ejs", {
			// layout: "layout.ejs",
			host: 		host,
			user: 		user
		})
	},
	
	// About
	about: function(req, res) {
		var user = req.session.user
		res.render ("home/about.ejs", {user: user})		
	},
	
	// Contact Info
	contact: function(req, res) {    	
		var user = req.session.user
		res.render ("home/contact.ejs", {user: user})		
	},
	
	// Terms Statement
	terms: function(req, res) {    	
		var user = req.session.user
		res.render ("home/terms.ejs", {user: user})			
	},

	// Support Statement
	support: function(req, res) {    	
		var user = req.session.user
		res.render ("home/support.ejs", {user: user})		
	},

	// Privacy Statement
	privacy: function(req, res) {    	
		var user = req.session.user
		res.render ("home/privacy.ejs", {user: user})			
	}
}
