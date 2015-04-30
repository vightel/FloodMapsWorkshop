var util		= require('util'),
	async		= require('async'),
	eyes		= require('eyes'),
	builder 	= require('xmlbuilder'),
	debug		= require('debug')('xappy');
	changeset 	= require('./changeset');
	user 		= require('./user');
	node 		= require('./node');
	
	var version 	= "0.1";
	var generator 	= "ojo";
	var planetDate  = new Date();
	var copyright	= "(c) 2014 GLC/GFC NASA GSFC"
	
	function createHeader() {
	    var header = '<?xml version="1.0" standalone="no"?>';
	    var doc = builder.create('osm')
	//    var tmp = doc.begin('osm')
	        .att('version', version)
	        .att('generator', generator)
			.att('xmlns:xapi', 'http://www.informationfreeway.org/xapi/0.6')
	        .att('xapi:planetDate', planetDate)
	        .att('xapi:copyright', copyright);

	    header = header + doc.toString();
	    return header.substr(0, header.length - 2) + '>';
	};
	
	function createFooter() {
	    return '</osm>';
	};
	
	function rowToNode(row) {
	    //log.debug('New node: ' + JSON.stringify(row));
	    var node = {
	        id: row.id,
	        lat: row.lat.toFixed(5),
	        lon: row.lon.toFixed(5),
	        version: row.version,
	        uid: row.user_id,
	        user : row.user_name,
	        changeset: row.changeset_id,
	        timestamp: row.tstamp,
			visible: true
	    };
	    if (row.tags && !_.isEmpty(row.tags)) {
	        node.tags = parseRowTags(row.tags);
	    } else {
			node.tags = [{'key': 'name', 'value': 'landslide-'+row.id}]

	    	delete row.id
	    	delete row.lat
	    	delete row.lon
	    	delete row.version
	    	delete row.user_id
	    	delete row.changeset_id
	    	delete row.tstamp
	    	delete row.way
		
			for( var k in row ) {
				value = row[k] || ''
				node.tags.push({key:k, value: value})
			}		
	    }
		//console.log(node)
	    return node;
	};
	
	function genxml(type, elem) {
	    var doc = builder.create(type);
	    var xmlelem = doc;	//PGC doc.begin(type);
	    var prop;
	    for (prop in elem) {

	        if(prop === 'tags') {
	            elem[prop].forEach(function(tuple){
	                xmlelem.ele('tag')
	                    .att('k', tuple.key)
	                    .att('v', tuple.value);
	            });

	        // ways have nodes
	        } else if (prop === 'nodes') {
	            _.each(elem[prop], function(elem){
	                xmlelem.ele('nd')
	                .att('ref', elem);
	            });

	        // relations have members
	        } else if (prop === 'members') {
	            elem[prop].forEach(function(member){
	                xmlelem.ele('member')
	                .att('type', member.type)
	                .att('ref', member.reference)
	                .att('role', member.role);
	            });

	        } else {
				//console.log("prop=", prop)
	            xmlelem.att(prop, elem[prop]);
	        }
	    }
	    return doc.toString();
	}
	
module.exports = {
	changeset_create: function(req, res) { 
		return changeset.create(req, res); 
	},
	changeset_upload: function(req, res) { 
		return changeset.upload(req, res); 
	},
	changeset_download: function(req, res) { 
		return changeset.download(req, res); 
	},
	changeset_read: function(req, res) { 
		return changeset.read(req, res); 
	},
	changeset_update: function(req, res) { 
		return changeset.update(req, res); 
	},
	changeset_get: function(req, res) { 
		return changeset.get(req, res); 
	},
	changeset_close: function(req, res) { 
		return changeset.close(req, res); 
	},
	
	user_name: function(req, res) { 
		return user.name(req, res); 
	},
	user_details: function(req, res) { 
		return user.details(req, res); 
	},
	user_preferences: function(req, res) { 
		return user.preferences(req, res); 
	},
	
	node : function(req, res) {
		return node.node(req, res); 
		
	},
	node_full : function(req, res) {
		return node.full(req, res); 
	},
	
	permissions: function(req, res) {
		console.log("xappy permissions")
		var xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
		xml += '<osm version="0.6" generator="OpenStreetMap server">\n'
		xml += '	<permissions>\n'
		xml += '		<permission name="allow_read_prefs"/>\n'
		xml += '		<permission name="allow_write_prefs"/>\n'
		xml += '		<permission name="allow_write_api "/>\n'
		xml += '		<permission name="allow_write_api "/>\n'
		xml += '	</permissions>\n'
		xml += '</osm>'
		res.set('Content-Type', 'application/xml')
		res.send(xml)
	},
	 
	capabilities: function(req, res) {
		//console.log("get api v2 capabilities")
		var xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
		xml += '<osm version="0.6" generator="OpenStreetMap server">\n'
		xml += '  <api>\n'
		xml += '    <version minimum="0.6" maximum="0.6"/>\n'
		xml += '    <area maximum="0.25"/>\n'
		xml += '    <tracepoints per_page="5000"/>\n'
		xml += '    <waynodes maximum="2000"/>\n'
		xml += '    <changesets maximum_elements="50000"/>\n'
		xml += '    <timeout seconds="300"/>\n'
		xml += '    <status database="online" api="online" gpx="online"/>\n'
		xml += '   </api>\n'
		xml += '</osm>'

		res.set('Content-Type', 'application/xml')
		res.send(xml)
	},
	
	map: function(req, res) {
		var bbox 	= req.query['bbox'].split(",")
		
		var columns = 'p.*, ST_X(ST_TRANSFORM(way,4326)) AS lon, ST_Y(ST_TRANSFORM(way,4326)) AS lat, u.name AS user_name';
		var query 	= "SELECT "+ columns + " from planet_osm_point p,users u WHERE ST_TRANSFORM(way,4326) && ST_MakeEnvelope($1, $2, $3, $4, 4326) AND u.id= p.user_id ";
		//console.log("map v2", query)
		
		app.client.query(query, [
			bbox[0],bbox[1],bbox[2],bbox[3]
			], function(err, result) {
			if( err ) {
				eyes.inspect(err, "query err")	
				return res.send(500)
			} else {
				if( result && result.rows != undefined ) {
					//eyes.inspect(result.rows)
					xml = createHeader()
					var nodes = []
					for( var r in result.rows ) {
						var row 	= result.rows[r]				
						var node	= rowToNode(row)
						xml += genxml('node', node)
					}
					
					xml+= createFooter()
				}
				//console.log(xml)
				res.set('Content-Type', 'application/xml')
				res.send(xml)
			}
		})
	}
}