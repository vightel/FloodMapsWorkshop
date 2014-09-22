var util		= require('util'),
	async		= require('async'),
	eyes		= require('eyes'),
	debug		= require('debug')('xappy');

module.exports = {
	node : function(req, res) {
		console.log("node node")
		res.send(200)
	},

	full : function(req, res) {
		console.log("node full")
		res.send(200)
	}
}
