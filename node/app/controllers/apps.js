// Applications
var Appl = require("./../../models/app.js");

module.exports = {
  
  	// List all
	index: function(req, res) {
		var user	= req.session.user;
		
		Appl.all(function(err, data) {
			console.log("apps", err, data)
			res.render("apps/index.ejs", {
				user: user,
				menu: "#apps_menu",
				apps: data
			})			
		})
	},

	show: function(req, res) {
		var user	= req.session.user;
		var id		= req.params['id']
		
		Appl.get_by_id(id, function(err, data) {	
			console.log("Show", data)
			res.render("apps/show.ejs", {
				user: 	user,
				app: 	data,
				menu: 	"#apps_menu"
			});			
		})
	},
	
	edit: function(req, res) {
		var user	= req.session.user;
		var id		= req.params['id']
		
		Appl.get_by_id(id, function(err, data) {	
			console.log("edit", data)
			res.render("apps/edit.ejs", {
				user: 	user,
				app: 	data,
				menu: 	"#apps_menu"
			});			
		})
	},
	
	form: function(req, res) {
		var user	= req.session.user;
		res.render("apps/form.ejs", {
				user: user,
				menu: "#apps_menu"
			});			
	},
	
	create: function(req, res) {
		var user		= req.session.user;
		
		console.log(req.body)
		var app_id		= req.body.app_id
		var app_secret	= req.body.app_secret

		// let's validate the secret and get app metadata
		app.facebook.ValidateSecret( app_secret, function(err, data) {
			console.log(err, data)
			data['secret'] = app_secret
			if( !err && !data.error) {
				var json = Appl.new(user.id, data)
				Appl.save(json, function(err, data) {
					console.log("saved", err)
					res.redirect("/apps")
				})
			} else {
				res.send('Sorry! App Registration Failed')
			}
		})
	},
	
	update: function(req, res) {
		var user		= req.session.user;
		
		console.log("Appl update", req.body)
		
		var id			= req.body.id
		var description	= req.body.description
		var company		= req.body.company
		var secret		= req.body.secret
		
		Appl.get_by_id(id, function(err, json) {	
			if( !err ) {
				json.description 	= description
				json.company		= company
				json.secret			= secret
				
				//var appl = Appl.newInstance(json)
				console.log("Update", json)
				Appl.update(json, function(err, d) {
					console.log("updated", err)
					res.redirect("/apps")
				})
			} else {
				res.send("Err fetching app:", id)
			}
		})
	},
	
	delete: function(req, res) {
		var user		= req.session.user;
		var id			= req.params.id
		
		console.log("Appl delete", id)
		Appl.destroy(id, function(err, json) {	
			if( !err ) {
				res.redirect("/apps/")
			} else {
				res.send("Error deleting "+id)
			}
		})		
	}
};