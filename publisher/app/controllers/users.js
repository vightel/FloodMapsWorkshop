var util 		= require('util');
var fs	 		= require('fs');
var path		= require('path');
var eyes		= require('eyes');
var crypto		= require('crypto');
var User		= require('../../models/user');

var debug		= require('debug')('tests');

// generate new_avatar
function new_avatar( str ) {
	var md5 	= crypto.createHash('md5').update(str).digest("hex");
	grav_url 	= 'http://www.gravatar.com/avatar.php/'+md5
	grav_url	+= "?s=32&d=identicon"
	//console.log("Made gravatar:", grav_url)
	return grav_url
}

module.exports = {
	
	index: function(req, res) {    
		var user 	= req.session.user   
		var id 		= req.params['id'];
		res.render("users/index.ejs", { user: user })
	},
	
	update: function(req, res ) {
		var id 				= req.params['id']
		var current_user	= req.session.user
		 
		var json = {
			id: 			id,
			name: 			req.body.name,
			organization: 	req.body.organization,
			is_admin: 	 	req.body.is_admin,
			is_banned: 		req.body.is_banned,
			updated_at: 	new Date()
		}
		eyes.inspect(json, "update")
		
		User.update(json, function(err, user){
			if( !err ) {
				eyes.inspect(user, "updated user")
				if( current_user.id == id ) {
					current_user.name 			= json.name
					current_user.organization 	= json.organization
					current_user.is_banned		= json.is_banned,
					current_user.is_admin		= json.is_admin
					
					req.session.user = current_user
					console.log("Session user set to ", current_user)
				} else {
					console.log("Different users", current_user.id, id )
				}
			} else {
				console.log("Error updating user", err)
			}
			res.redirect("/")
		})
	},
	
	show: function(req, res) {      
		var current_user = req.session.user
		if( !current_user ) return res.redirect("/")
		
		var id = req.params['id']
		if( current_user.id != id || !current_user.is_admin ) return res.redirect("/")
		
		console.log("show user", id)
		User.get_by_id(id, function(err, user){
			eyes.inspect(user, "user")
			res.render("users/profile.ejs", { 
				user: current_user,
				u: user })
		})
	},
	
	show_by_name: function(req, res) {      
		var current_user 	= req.session.user
		var name			= req.params['name']
		if( current_user == undefined ) return res.send("User not logged in")
		
		console.log("show user by name", name)
		User.get_by_name(name, function(err, user){
			if( err ) return res.send("Invalid user name", name)
			
			if( user.gravatar == null ) {
				user.gravatar = new_avatar(name+user.email)
			}
			eyes.inspect(user, "user")
			res.render("users/profile.ejs", { 
				user: current_user,
				u: user })
		})
	},
	
	list: function(req, res) {
		var user = req.session.user
		User.all( function(err, users) {
			eyes.inspect(users, "users")
			res.render("users/list.ejs", {list: users, user:user })
		})
	}
};