var util 		= require('util');
var fs	 		= require('fs');
var path		= require('path');
var eyes		= require('eyes');
var debug		= require('debug')('db');

module.exports = {
	// retrieve all users
	all: function(cb) {
		var query = app.client.query("SELECT * FROM users", function(err, result) {
			if( !err ) {
				cb(err, result.rows)
			}
		})
	},
	
	get_by_email: function(email, cb) {
		var query = app.client.query("SELECT * FROM users where email= $1", [ email ], function(err, result) {
			if( err || (result == undefined) || (result.rows[0]== undefined)) {
				cb(err, null)
			} else {
				var user = result.rows[0]
				cb(err, user)
			}
		})
	},
	get_by_id: function(id, cb) {
		var query = app.client.query("SELECT * FROM users where id= $1", [ id ], function(err, result) {
			if( err || (result == undefined) || (result.rows[0]== undefined)) {
				cb(err, null)
			} else {
				var user = result.rows[0]
				cb(err, user)
			}
		})
	},
	get_by_name: function(name, cb) {
		var query = app.client.query("SELECT * FROM users where name= $1", [ name ], function(err, result) {
			if( err || (result == undefined) || (result.rows[0]== undefined)) {
				cb(err, null)
			} else {
				var user = result.rows[0]
				cb(err, user)
			}
		})
	},
	update: function(json, cb ) {       
		console.log("Update user ", json)
		app.client.query("UPDATE users SET (is_admin, is_banned, name, organization, updated_at ) = ($1, $2, $3, $4, $5 ) WHERE id= $6;", 
				[json.is_admin, json.is_banned, json.name, json.organization, json.updated_at, json.id], function(err, result) {
					console.log("update_local_record", err)
					if( !err ) {
						cb(err, result.rows[0])
					} else {
						cb(err, result)
					}
		})
	},
	
	// Save user in Postgres Database
	save: function(json, cb ) {       
		eyes.inspect(json, "saving user")
		// check if it exists
		var query = app.client.query("SELECT id, is_admin, is_banned FROM users where id= $1", [json.id], function(err, result) {
			if( (result == undefined) || (result.rows[0]== undefined)) {
				console.log("inserting new user...")
				json.is_admin 	= false;
				json.is_banned 	= false;

				for( email in app.config.admins ) {
					if( app.config.admins[email] === json.email) {
						console.log("Admin user")
						json.is_admin = true;
						break;
					}
				}

				console.log("Save it into PG")
				var str = "INSERT INTO users( email, name, organization, gravatar, created_at, updated_at, is_admin, is_banned) ";
				str += "VALUES ($1, $2, $3, $4, $5, $6, $7, $8 );"
				console.log(str)
				var insert = app.client.query(str, 
					[json.email, json.name, json.organization, json.gravatar, json.created_at, json.updated_at, json.is_admin, json.is_banned ])
				insert.on('end', function(err) {
					console.log("user insert:", err)
					cb(null, json)
				})
			} else {
				// user exists so check if admin or banned
				var user 		= result.rows[0]
				json.is_admin 	= user.is_admin
				json.is_banned 	= user.is_banned
				
				console.log(user)
				cb(null, json)
			}
		});
	},
};