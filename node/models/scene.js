var util 		= require('util');
var fs	 		= require('fs');
var path		= require('path');
var eyes		= require('eyes');
var debug		= require('debug')('db');

module.exports = {
	getScene: function(table, scene, cb) {
		var str 	= util.format("SELECT *, ST_AsText(geom) as g from %s where scene = '%s'", table, scene )
		var query 	= app.client.query(str, function(err, result) {
			//debug("getScene", table, scene, err, result.rows[0])
			if( err || (result == undefined) || result.rows == undefined) {
				cb(err, null)
			} else {
				cb(err, result.rows[0])
			}
		})
	},
	findAllScenes: function(table, lat,lon, cb) {
		var str 	= util.format("SELECT *, ST_AsText(geom) as g from %s where ST_contains(geom, ST_GeomFromText('POINT(%d %d)',4326))", table, lat, lon )
		logger.info("findAllScenes query:", str)
		var query 	= app.client.query(str, function(err, result) {
			if( err || (result == undefined) || result.rows == undefined) {
				logger.info("Error finding Scenes", table, err)
				cb(err, null)
			} else {
				logger.info("Error finding Scenes", table, result.rows.length)
				cb(err, result)
			}
		})
	},
	getAllScenes: function(table, cb) {
		var str 	= util.format("SELECT * from %s", table )
		logger.info("getAllScenes query:", str)
		var query 	= app.client.query(str, function(err, result) {
			if( err || (result == undefined) || result.rows == undefined) {
				logger.info("found Scenes", table, err)
				cb(err, null)
			} else {
				logger.info("found Scenes", table, err, result.rows.length)
				cb(err, result.rows)
			}
		})
	},
	// takes a polygon and returns a bbox
	// POLYGON((19.154261 -72.334539,19.054651 -72.00994,17.99311 -72.249369,18.092406 -72.571983,19.154261 -72.334539))
	bboxFromGeom: function(g) {
		var str = g.replace("POLYGON((", "")
		str 	= str.replace("))", "")
		str 	= str.replace(/ /g, ",")
		var arr = str.split(",")
		var latmin 	= Math.min( parseFloat(arr[0]), parseFloat(arr[2]), parseFloat(arr[4]), parseFloat(arr[6]), parseFloat(arr[8]))
		var latmax 	= Math.max( parseFloat(arr[0]), parseFloat(arr[2]), parseFloat(arr[4]), parseFloat(arr[6]), parseFloat(arr[8]))
		var lonmin 	= Math.min( parseFloat(arr[1]), parseFloat(arr[3]), parseFloat(arr[5]), parseFloat(arr[7]), parseFloat(arr[9]))
		var lonmax 	= Math.max( parseFloat(arr[1]), parseFloat(arr[3]), parseFloat(arr[5]), parseFloat(arr[7]), parseFloat(arr[9]))
		var bbox =  [lonmin, latmin, lonmax, latmax]
		
		return bbox
	},
	// return GeoJSON Geometry Polygon
	PolygonFromGeom: function(g) {
		var str = g.replace("POLYGON((", "")
		str 	= str.replace("))", "")
		str 	= str.replace(/ /g, ",")
		var arr = str.split(",")
		
		var coords =  [[
			[parseFloat(arr[0]),parseFloat(arr[1])],
			[parseFloat(arr[2]),parseFloat(arr[3])],
			[parseFloat(arr[4]),parseFloat(arr[5])],
			[parseFloat(arr[6]),parseFloat(arr[7])],			
			[parseFloat(arr[8]),parseFloat(arr[9])]
		]]
		
		return coords
	}
}