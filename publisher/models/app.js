var util 		= require('util');
var fs	 		= require('fs');
var path		= require('path');
var eyes		= require('eyes');
var debug		= require('debug')('db');

module.exports = {
	new: function(id, params) {
		var json = {}
		json.userid			= id;
	
		if( params != undefined ) {
			json.fbappid 		= params['id'];
			json.name			= params['name'];
			json.description	= params['description'];
			json.link			= params['link'];
			json.icon_url		= params['icon_url'];
			json.logo_url		= params['logo_url'];
			json.company		= params['company'];
			json.secret			= params['secret'];
		}
		json.created_at 		= new Date();
		json.updated_at			= new Date();
		json.status				= "authorized";
		return json
	},
	
	// retrieve all applications
	all: function(cb) {
		var query = app.client.query("SELECT * FROM applications", function(err, result) {
			if( !err ) {
				cb(err, result.rows)
			}
		})
	},
	get_by_id: function(id, cb) {
		var query = app.client.query("SELECT * FROM applications where id= $1", [ id ], function(err, result) {
			if( err || (result == undefined) || (result.rows[0]== undefined)) {
				cb(err, null)
			} else {
				var app = result.rows[0]
				cb(err, app)
			}
		})
	},
	get_by_fbappid: function(id, cb) {
		var query = app.client.query("SELECT * FROM applications where fbappid= $1", [ id ], function(err, result) {
			console.log("get_by_fbappid", err)
			if( err || (result == undefined) || (result.rows[0]== undefined)) {
				cb(err, null)
			} else {
				var app = result.rows[0]
				cb(err, app)
			}
		})
	},
	update: function(json, cb ) {       
		console.log("Update app ", json)
		app.client.query("UPDATE applications SET (name, description, company, updated_at, secret ) = ($1, $2, $3, $4, $5) WHERE id= $6;", 
				[json.name, json.description, json.company, json.updated_at, json.secret, json.id], function(err, result) {
					console.log("update_local_record", err)
					if( !err ) {
						cb(err, result.rows[0])
					} else {
						cb(err, result)
					}
		})
	},
	// Save application in Postgres Database
	save: function(json, cb ) {       
		eyes.inspect(json, "saving app")

		console.log("Save it into PG")
		var str = "INSERT INTO applications( name, description, link, icon_url, logo_url, company, secret, fbappid, created_at, updated_at, status) ";
		str += "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11 );"
		console.log(str)
		var insert = app.client.query(str, 
			[json.name, json.description, json.link, json.icon_url, json.logo_url, json.company, json.secret, json.fbappid, json.created_at, json.updated_at, json.status ])
		insert.on('end', function(err) {
			console.log("app insert:", err)
			cb(null, json)
		})
			
	},
}