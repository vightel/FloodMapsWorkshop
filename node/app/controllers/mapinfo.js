var util 		= require('util');
var fs	 		= require('fs');
var path		= require('path');
var eyes		= require('eyes');
var async		= require('async');
var request		= require('request');
var debug		= require('debug')('mapinfo');
var dust		= require('dustjs-linkedin');

function get_modis_floodmap_legend() {
	var html = "<style id='modis_floodmap_legend_style' >"
	html += ".modis_floodmap_map-legend {"
	html += "	position: relative;"
	html += "	float: right;"
	html += "    line-height: 18px;"
	html += "    color: #555;"
	html += "}"
	html += ".modis_floodmap-legend i {"
	html += "    width: 32px;"
	html += "    height: 16px;"
	html += "    float: left;"
	html += "    margin-right: 5px;"
	html += "    opacity: 0.5;"
	html += "}"
	html += ".modis_floodmap-info {"
	html += "    padding: 6px 8px;"
	html += "   font: 14px/16px Arial, Helvetica, sans-serif;"
	html += "    background: white;"
	html += "    background: rgba(255,255,255,0.8);"
	html += "    box-shadow: 0 0 15px rgba(0,0,0,0.2);"
	html += "    border-radius: 5px;"
	html += "}"
	html += ".modis_floodmap-info h4 {"
	html += "    margin: 0 0 5px;"
	html += "    color: #777;"
	html += "}"
	html += "</style>"
	
	html += "<div id='modis_floodmap_legend' class='modis_floodmap-info modis_floodmap-legend'>"
	html += "	<i style='border-bottom:solid; color: #FF0000'></i>&nbsp;Water<br/>"
	html += "	<br/>"
	html += "	<a href='http://eo1.gsfc.nasa.gov/'>MODIS Flood Map</a>"
	html += "</div>&nbsp;&nbsp;"
	return html
}

function get_landsat8_floodmap_legend() {
	var html = "<style id='landsat8_floodmap_legend_style' >"
	html += ".landsat8_floodmap_map-legend {"
	html += "	position: relative;"
	html += "	float: right;"
	html += "    line-height: 18px;"
	html += "    color: #555;"
	html += "}"
	html += ".landsat8_floodmap-legend i {"
	html += "    width: 32px;"
	html += "    height: 16px;"
	html += "    float: left;"
	html += "    margin-right: 5px;"
	html += "    opacity: 0.5;"
	html += "}"
	html += ".landsat8_floodmap-info {"
	html += "    padding: 6px 8px;"
	html += "   font: 14px/16px Arial, Helvetica, sans-serif;"
	html += "    background: white;"
	html += "    background: rgba(255,255,255,0.8);"
	html += "    box-shadow: 0 0 15px rgba(0,0,0,0.2);"
	html += "    border-radius: 5px;"
	html += "}"
	html += ".landsat8_floodmap-info h4 {"
	html += "    margin: 0 0 5px;"
	html += "    color: #777;"
	html += "}"
	html += "</style>"
	
	html += "<div id='landsat8_floodmap_legend' class='landsat8_floodmap-info landsat8_floodmap-legend'>"
	html += "	<i style='border-bottom:solid; color: #FF0000'></i>&nbsp;Water<br/>"
	html += "	<br/>"
	html += "	<a href='http://eo1.gsfc.nasa.gov/'>Landsat-8 Flood Map</a>"
	html += "</div>&nbsp;&nbsp;"
	return html
}

function get_radarsat2_floodmap_legend() {
	var html = "<style id='radarsat2_floodmap_legend_style' >"
	html += ".radarsat2_floodmap_map-legend {"
	html += "	position: relative;"
	html += "	float: right;"
	html += "    line-height: 18px;"
	html += "    color: #555;"
	html += "}"
	html += ".radarsat2_floodmap-legend i {"
	html += "    width: 32px;"
	html += "    height: 16px;"
	html += "    float: left;"
	html += "    margin-right: 5px;"
	html += "    opacity: 0.5;"
	html += "}"
	html += ".radarsat2_floodmap-info {"
	html += "    padding: 6px 8px;"
	html += "   font: 14px/16px Arial, Helvetica, sans-serif;"
	html += "    background: white;"
	html += "    background: rgba(255,255,255,0.8);"
	html += "    box-shadow: 0 0 15px rgba(0,0,0,0.2);"
	html += "    border-radius: 5px;"
	html += "}"
	html += ".radarsat2_floodmap-info h4 {"
	html += "    margin: 0 0 5px;"
	html += "    color: #777;"
	html += "}"
	html += "</style>"
	
	html += "<div id='radarsat2_floodmap_legend' class='radarsat2_floodmap-info radarsat2_floodmap-legend'>"
	html += "	<i style='border-bottom:solid; color: #FF0000'></i>&nbsp;Water<br/>"
	html += "	<br/>"
	html += "	<a href='http://eo1.gsfc.nasa.gov/'>RADARSAT2 Flood Map</a>"
	html += "</div>&nbsp;&nbsp;"
	return html
}


function get_flood_style() {
	var json = {
		"true": {
			color: "#FF0000", 
			weight: 3
		}
	}
	return json
}


// ===================================================
// CREDITS
// ====================================================

function get_radarsat2_credits() {
	var json = {
		"credits":  "NASA GSFC NRT Global Flood Mapping",
		"url": 		"http://oas.gsfc.nasa.gov/floodmap/",
	};
	return json;
}

function get_landsat8_credits() {
	var json = {
		"credits":  "NASA GSFC NRT Global Flood Mapping",
		"url": 		"http://oas.gsfc.nasa.gov/floodmap/",
	};
	return json;
}

function get_modis_credits() {
	var json = {
		"credits":  "NASA GSFC NRT Global Flood Mapping",
		"url": 		"http://oas.gsfc.nasa.gov/floodmap/",
	};
	return json;
}

module.exports = {
	
	modis: function(req, res) {
		var style 	= get_flood_style();
		var html  	= get_modis_floodmap_legend();
		var credits = get_modis_credits();
		res.render("mapinfo/modis", { style: style, html: html, credits: credits })
	},
	modis_style: function(req, res) {
		var json = get_modis_style()
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'application/json');		
		res.send(json)
	},
	modis_legend: function(req, res) {
		var html = get_modis_floodmap_legend()
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'text/html');		
		res.send(html)
	},
	modis_credits: function(req, res) {
		var str = get_modis_credits()
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'application/json');		
		res.send(str)
	},
	
	landsat8: function(req, res) {
		var style 	= get_flood_style();
		var html  	= get_landsat8_floodmap_legend();
		var credits = get_landsat8_credits();
		res.render("mapinfo/landsat8", { style: style, html: html, credits: credits })
	},
	landsat8_style: function(req, res) {
		var json = get_landsat8_style()
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'application/json');		
		res.send(json)
	},
	landsat8_legend: function(req, res) {
		var html = get_landsat8_floodmap_legend()
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'text/html');		
		res.send(html)
	},
	landsat8_credits: function(req, res) {
		var str = get_landsat8_credits()
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'application/json');		
		res.send(str)
	},
	radarsat2: function(req, res) {
		var style 	= get_flood_style();
		var html  	= get_radarsat2_floodmap_legend();
		var credits = get_radarsat2_credits();
		res.render("mapinfo/radarsat2", { style: style, html: html, credits: credits })
	},
	radarsat2_style: function(req, res) {
		var json = get_radarsat2_style()
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'application/json');		
		res.send(json)
	},
	radarsat2_legend: function(req, res) {
		var html = get_radarsat2_floodmap_legend()
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'text/html');		
		res.send(html)
	},
	radarsat2_credits: function(req, res) {
		var str = get_radarsat2_credits()
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'application/json');		
		res.send(str)
	}
}