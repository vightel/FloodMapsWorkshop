var util		= require('util'),
	async		= require('async'),
	eyes		= require('eyes'),
	xml2js		= require('xml2js').parseString,
	_			= require('underscore'),
	Changeset	= require('../../models/changeset')
	debug		= require('debug')('xappy');
	
var changesets = {}

var fields = {
	"landslide": [
		{ 	"name": "id",
			"type": "number"
		},
		{ 	"name": "date",
			"type": "date"
		},
		{ 	"name": "time",
			"type": "string"
		},
		{ 	"name": "country",
			"type": "string"
		},
		{ 	"name": "nearest_places",
			"type": "string"
		},
		{ 	"name": "hazard_type",
			"type": "string"
		},
		{ 	"name": "landslide_type",
			"type": "string"
		},
		{ 	"name": "trigger",
			"type": "string"
		},
		{ 	"name": "storm_name",
			"type": "string"
		},
		{ 	"name": "fatalities",
			"type": "number"
		},
		{ 	"name": "injuries",
			"type": "number"
		},
		{ 	"name": "source_name",
			"type": "string"
		},
		{ 	"name": "source_link",
			"type": "string"
		},
		{ 	"name": "comments",
			"type": "string"
		},
		{ 	"name": "location_description",
			"type": "string"
		},
		{ 	"name": "location_accuracy",
			"type": "string"
		},
		{ 	"name": "landslide_size",
			"type": "string"
		},
		{ 	"name": "photos_link",
			"type": "string"
		},
		{ 	"name": "cat_src",
			"type": "string"
		},
		{ 	"name": "cat_id",
			"type": "number"
		},
		{ 	"name": "countryname",
			"type": "string"
		},
		{ 	"name": "near",
			"type": "string"
		},
		{ 	"name": "distance",
			"type": "number"
		},
		{ 	"name": "adminname1",
			"type": "string"
		},
		{ 	"name": "adminname2",
			"type": "string"
		},
		{ 	"name": "adminname3",
			"type": "string"
		},
		{ 	"name": "population",
			"type": "number"
		},
		{ 	"name": "tz",
			"type": "json"
		},
		{ 	"name": "countrycode",
			"type": "string"
		},
		{ 	"name": "continentcode",
			"type": "string"
		},
		{ 	"name": "key",
			"type": "string"
		}
	]
	,
	"flood": {
		
	}
}

// convert to a compact node
function js2node( json ) {
	var node = {}
	for( var k in json.$ ) {
		//console.log("prop", k, json.$[k])
		node[k] = json.$[k]
	};
	try {
	for( var t in json.tag ) {
		var tag = json.tag[t]
		var k	= tag.$.k
		node[k] = tag.$.v
		
		//console.log("tag", k,node[k])
	};
	} catch(e) {
		logger.error("js2node error processing", e, json)
	}
	//console.log("js2node", node)
	return node
}

module.exports = {
	create : function(req, res) {
		
		debug("changeset create",req.raw_post)
		
		xml2js(req.raw_post, function (err, result) {
		    debug("changeset create json, err", err);
			if( !err && result && result.osm ) {
				var osm_changeset = result.osm.changeset[0]
				var changeset = {
					"id": 			Changeset.createChangeSet(),
					"created_at": 	new Date(),
					"generator": 	osm_changeset.$
				}
				_.each(osm_changeset.tag, function(el) {
					var k 	= el.$.k	
					var v 	= el.$.v
				
					changeset[k] = v
				})
				
				changesets.id = changeset
						
				logger.info("created changeset id", changeset.id.toString())
				res.set('Content-Type', 'text/plain')
				res.send(200, changeset.id.toString())
			} else {
				logger.error("Error parsing create:", err, result)
				res.send(400)
			}
		});
	},

	upload : function(req, res) {
		
		var id 			= parseInt(req.params.id);
		var changeset 	= req.raw_post
		
		console.log("changeset upload", id, changeset)
		
		xml2js(req.raw_post, function (err, result) {
			if( !err ) {
				var osmChange	= result.osmChange
				console.log(osmChange)
				
				// retrieve the open changeset
				var changeset		= changesets.id
													
				function mknodes(arr) {
					if( typeof arr[0] != 'string' ) {
						var nodes  = _.map(arr, function(el) {
							try{
								var node = el.node[0]
								return js2node(node)
							} catch(e) {
								logger.info("error processing el", el)
								console.log("arr", arr)
								return undefined
							}
						})
						
						
						return nodes				
					} else {
						logger.info("arr not an arr", arr)
						return undefined;
					}
				}
				
				changeset.modify = mknodes(osmChange.modify)
				changeset.create = mknodes(osmChange.create)
				changeset.delete = mknodes(osmChange.delete)
				
				// compute num_changes & bbox
				
				var maxlat=-90, minlat=90, maxlon=-180, minlon=180
				var num_changes = 0
				
				function checkArr(arr) {
					if( (arr === undefined) || (arr.length == 0) ) return
					
					_.each(arr, function(el) {
						if( el === undefined ) return
						num_changes += 1
						console.log("checkArr", el)
						
						var ftype 		= el.hazard_type
						var template 	= fields.ftype
						_.each(template, function(tfield) {
							var name = tfield.name
							switch( tfield.type ) {
								case 'number ':
									el[name] = parseFloat(el[name])
								case 'json':
									el[name] = JSON.parse(el[name])
							}
						})
						
						if( el.lon < minlon ) minlon = el.lon
						if( el.lon > maxlon ) maxlon = el.lon
						if( el.lat < minlat ) minlat = el.lat
						if( el.lat > maxlat ) maxlat = el.lat
						
						delete el.github
						delete el.user_name
						
					})
				}

				if( changeset.modify ) checkArr( changeset.modify)
				if( changeset.create ) checkArr( changeset.create)
				if( changeset.delete ) checkArr( changeset.delete)
				
				changeset.minlat 		= minlat
				changeset.maxlat		= maxlat
				changeset.minlon		= minlon
				changeset.maxlon		= maxlon
				changeset.num_changes	= num_changes
				changeset.closed_at 	= new Date();
				console.log("changeset", changeset)
				res.send(200)
			
			} else {
				res.send(400)
				
		//Error codes

		//HTTP status code 400 (Bad Request) - text/plain
		//    When there are errors parsing the XML. A text message explaining the error is returned. 
		//    When an placeholder ID is missing or not unique 
		//HTTP status code 404 (Not Found)
		//    When no changeset with the given id could be found 
		//    Or when the diff contains elements where the given id could be found 
		//HTTP status code 405 (Method Not Allowed)
		//    If the request is not a HTTP POST request 
		//HTTP status code 409 (Conflict) - text/plain 
			}
		});
	},
	
	close : function(req, res) {
		
		var changeset_id 	= parseInt(req.params.id)
		
		var changeset 		= changesets.id
		var userid			= 2 // for now
		
		Changeset.saveChangeset(userid, changeset, function(err) {
			delete changesets.id
			if( !err ) {		
				logger.info("changeset %d closed", changeset_id)
				return res.send(200)
			} else {
				logger.error("Failed saving changeset")
				return res.send(404, "Failed saving changeset")
			}
		})
		
		//Error codes

		//HTTP status code 404 (Not Found)
		//    When no changeset with the given id could be found 
		//HTTP status code 405 (Method Not Allowed)
		//    If the request is not a HTTP PUT request 
		//HTTP status code 409 (Conflict) - text/plain
		//    If the changeset in question has already been closed (either by the user itself or as a result of the auto-closing feature). A message with the format "The changeset #id was closed at #closed_at." is returned 
		//    Or if the user trying to update the changeset is not the same as the one that created it 
	},
	
	
	download : function(req, res) {
		console.log("changeset download")
		res.send(200)
	},

	read : function(req, res) {
		console.log("changeset read")
		res.send(200)
	},

	update : function(req, res) {
		console.log("changeset update")
		res.send(200)
	},


	get : function(req, res) {
		console.log("changeset get")
		res.send(200)
	}
	
}