var util		= require('util'),
	async		= require('async'),
	eyes		= require('eyes'),
	User		= require('../../models/user'),
	_			= require('underscore'),
	debug		= require('debug')('xappy');


	function user2xml(user) {
		var xml = '<osm version="0.6" generator="OpenStreetMap server">'
   	 	xml += '<user id="' + user.id + '" display_name="' + user.name + '" account_created="' + user.created_at +'">\n'
     	xml += '<description></description>\n'
     	xml += '<contributor-terms agreed="false"/>\n'
     	xml += '<img href="' + _.escape(user.gravatar) +'"/>\n'
     	xml += '<roles>\n'
     	xml += '</roles>\n'
     	xml += '<changesets count="1"/>\n'
     	xml += '<traces count="0"/>\n'
     	xml += '<blocks><received count="0" active="0"/></blocks>\n'
   	 	xml += '</user></osm>'
	
		return xml
	}
	
module.exports = {
	name: function(req, res) {
		var user = req.session.user
		var name = req.params.name
		
		console.log("xappy user name", name)
		User.get_by_name(name, function(err, user) {
			if( err ) {
				return res.send(404)
			} else {
				var xml = '<osm version="0.6" generator="OpenStreetMap server">'
		   	 	xml += '<user id="' + user.id + '" display_name="' + user.name + '" account_created="' + user.created_at +'">\n'
		     	xml += '<description></description>\n'
		     	xml += '<contributor-terms agreed="false"/>\n'
		     	xml += '<img href="' + _.escape(user.gravatar) +'"/>\n'
		     	xml += '<roles>\n'
		     	xml += '</roles>\n'
		     	xml += '<changesets count="1"/>\n'
		     	xml += '<traces count="0"/>\n'
		     	xml += '<blocks><received count="0" active="0"/></blocks>\n'
		   	 	xml += '</user></osm>'
				
				console.log(xml)
				res.set('Content-Type', 'application/xml')
				res.send(xml)
			}
		})
	},
	details: function(req, res) {
		console.log("xappy user details")
		var user = req.session.user
		
		function senduserxml(user, res) {
			var xml = user2xml(user)
			res.set('Content-Type', 'application/xml')
			res.send(xml)
		}
		
		if( !user ) {
			User.get_by_id( 1, function(err, user) {
				senduserxml(user, res)
			})
		} else {
			senduserxml(user, res)			
		}
	},
	
	preferences: function(req, res) {
		console.log("xappy user preferences")
		res.send(200)
	}
}