var util 		= require('util');
var fs	 		= require('fs');
var path		= require('path');
var eyes		= require('eyes');
var async		= require('async');
var request		= require('request');
var debug		= require('debug')('mapinfo');
var dust		= require('dustjs-linkedin');

function get_modis_floodmap_legend(req) {
	var html = "<style id='modis_floodmap_legend_style' >"
    html += ".modis_floodmap-info .legend-scale ul {"
    html += "   margin: 0;"
    html += "   margin-bottom: 5px;"
    html += "   padding: 0;"
    html += "   float: left;"
    html += "   list-style: none;"
    html += "   }"
	html += ".modis_floodmap-info .legend-scale ul li {"
	html += "   font-size: 80%;"
	html += "   list-style: none;"
	html += "    margin-left: 0;"
	html += "    line-height: 18px;"
	html += "    margin-bottom: 2px;"
	html += "}"
    html += ".modis_floodmap-info ul.legend-labels li span {"
    html += "  display: block;"
    html += "  float: left;"
    html += "  height: 16px;"
    html += "  width: 30px;"
    html += "  margin-right: 5px;"
    html += "  margin-left: 0;"
    html += "  border: 1px solid #999;"
    html += "}"
    html += ".modis_floodmap-info .legend-source {"
    html += "   font-size: 70%;"
    html += "   color: #999;"
    html += "   clear: both;"
    html += "}"
	html += ".modis_floodmap-info {"
	html += "    padding: 6px 8px;"
	html += "    font: 14px/16px Arial, Helvetica, sans-serif;"
	html += "    background: white;"
	html += "    background: rgba(255,255,255,0.8);"
	html += "    box-shadow: 0 0 15px rgba(0,0,0,0.2);"
	html += "    border-radius: 5px;"
	html += "	 position: relative;"
	html += "	 float: left;"
	html += "    line-height: 18px;"
	html += "    color: #555;"
	html += "}"
	html += "</style>"
	
	html += "<div id='modis_floodmap_legend' class='modis_floodmap-info'>"
	html += "  <div class='legend-title'>"+ req.gettext("legend.modis.title")+"</div>"
	html += "  <div class='legend-scale'>"
	html += "    <ul class='legend-labels'>"
	html += "	   <li><span style='background: #FF0000'></span>&nbsp;"+ req.gettext("legend.modis.legend") +"</li>"
	html += "    </ul>"
	html += "  </div>"
	html += "  <div class='legend-source'>"+ req.gettext("legend.modis.source.label")+": <a href='http://oas.gsfc.nasa.gov/floodmap/index.html'>"+ req.gettext("legend.modis.source.source")+"</a>"
	html += "</div>&nbsp;&nbsp;"
	return html
}


function get_landsat8_floodmap_legend(req) {
	var html = "<style id='l8_floodmap_legend_style' >"
    html += ".l8_floodmap-info .legend-scale ul {"
    html += "   margin: 0;"
    html += "   margin-bottom: 5px;"
    html += "   padding: 0;"
    html += "   float: left;"
    html += "   list-style: none;"
    html += "   }"
	html += ".l8_floodmap-info .legend-scale ul li {"
	html += "   font-size: 80%;"
	html += "   list-style: none;"
	html += "    margin-left: 0;"
	html += "    line-height: 18px;"
	html += "    margin-bottom: 2px;"
	html += "}"
    html += ".l8_floodmap-info ul.legend-labels li span {"
    html += "  display: block;"
    html += "  float: left;"
    html += "  height: 16px;"
    html += "  width: 30px;"
    html += "  margin-right: 5px;"
    html += "  margin-left: 0;"
    html += "  border: 1px solid #999;"
    html += "}"
    html += ".l8_floodmap-info .legend-source {"
    html += "   font-size: 70%;"
    html += "   color: #999;"
    html += "   clear: both;"
    html += "}"
	html += ".l8_floodmap-info {"
	html += "    padding: 6px 8px;"
	html += "    font: 14px/16px Arial, Helvetica, sans-serif;"
	html += "    background: white;"
	html += "    background: rgba(255,255,255,0.8);"
	html += "    box-shadow: 0 0 15px rgba(0,0,0,0.2);"
	html += "    border-radius: 5px;"
	html += "	 position: relative;"
	html += "	 float: left;"
	html += "    line-height: 18px;"
	html += "    color: #555;"
	html += "}"
	html += "</style>"
	
	html += "<div id='l8_floodmap_legend' class='l8_floodmap-info'>"
	html += "  <div class='legend-title'>"+ req.gettext("legend.l8.title")+"</div>"
	html += "  <div class='legend-scale'>"
	html += "    <ul class='legend-labels'>"
	html += "	   <li><span style='background: #FF0000'></span>&nbsp;"+ req.gettext("legend.l8.legend") +"</li>"
	html += "    </ul>"
	html += "  </div>"
	html += "  <div class='legend-source'>"+ req.gettext("legend.l8.source.label")+": <a href='http://gsfc.nasa.gov/'>"+ req.gettext("legend.l8.source.source")+"</a>"
	html += "</div>&nbsp;&nbsp;"
	return html
}

function get_radarsat2_floodmap_legend(req) {
	var html = "<style id='radarsat2_floodmap_legend_style' >"
    html += ".radarsat2_floodmap-info .legend-scale ul {"
    html += "   margin: 0;"
    html += "   margin-bottom: 5px;"
    html += "   padding: 0;"
    html += "   float: left;"
    html += "   list-style: none;"
    html += "   }"
	html += ".radarsat2_floodmap-info .legend-scale ul li {"
	html += "   font-size: 80%;"
	html += "   list-style: none;"
	html += "    margin-left: 0;"
	html += "    line-height: 18px;"
	html += "    margin-bottom: 2px;"
	html += "}"
    html += ".radarsat2_floodmap-info ul.legend-labels li span {"
    html += "  display: block;"
    html += "  float: left;"
    html += "  height: 16px;"
    html += "  width: 30px;"
    html += "  margin-right: 5px;"
    html += "  margin-left: 0;"
    html += "  border: 1px solid #999;"
    html += "}"
    html += ".radarsat2_floodmap-info .legend-source {"
    html += "   font-size: 70%;"
    html += "   color: #999;"
    html += "   clear: both;"
    html += "}"
	html += ".radarsat2_floodmap-info {"
	html += "    padding: 6px 8px;"
	html += "    font: 14px/16px Arial, Helvetica, sans-serif;"
	html += "    background: white;"
	html += "    background: rgba(255,255,255,0.8);"
	html += "    box-shadow: 0 0 15px rgba(0,0,0,0.2);"
	html += "    border-radius: 5px;"
	html += "	 position: relative;"
	html += "	 float: left;"
	html += "    line-height: 18px;"
	html += "    color: #555;"
	html += "}"
	html += "</style>"
	
	html += "<div id='radarsat2_floodmap_legend' class='radarsat2_floodmap-info'>"
	html += "  <div class='legend-title'>"+ req.gettext("legend.radarsat2.title")+"</div>"
	html += "  <div class='legend-scale'>"
	html += "    <ul class='legend-labels'>"
	html += "	   <li><span style='background: #FF0000'></span>&nbsp;"+ req.gettext("legend.radarsat2.legend") +"</li>"
	html += "    </ul>"
	html += "  </div>"
	html += "  <div class='legend-source'>"+ req.gettext("legend.radarsat2.source.label")+": <a href='http://gsfc.nasa.gov/'>"+ req.gettext("legend.radarsat2.source.source")+"</a>"
	html += "</div>&nbsp;&nbsp;"
	return html
}

function get_eo1_ali_floodmap_legend(req) {
	var html = "<style id='eo1_ali_floodmap_legend_style' >"
    html += ".eo1_ali_floodmap-info .legend-scale ul {"
    html += "   margin: 0;"
    html += "   margin-bottom: 5px;"
    html += "   padding: 0;"
    html += "   float: left;"
    html += "   list-style: none;"
    html += "   }"
	html += ".eo1_ali_floodmap-info .legend-scale ul li {"
	html += "   font-size: 80%;"
	html += "   list-style: none;"
	html += "    margin-left: 0;"
	html += "    line-height: 18px;"
	html += "    margin-bottom: 2px;"
	html += "}"
    html += ".eo1_ali_floodmap-info ul.legend-labels li span {"
    html += "  display: block;"
    html += "  float: left;"
    html += "  height: 16px;"
    html += "  width: 30px;"
    html += "  margin-right: 5px;"
    html += "  margin-left: 0;"
    html += "  border: 1px solid #999;"
    html += "}"
    html += ".eo1_ali_floodmap-info .legend-source {"
    html += "   font-size: 70%;"
    html += "   color: #999;"
    html += "   clear: both;"
    html += "}"
	html += ".eo1_ali_floodmap-info {"
	html += "    padding: 6px 8px;"
	html += "    font: 14px/16px Arial, Helvetica, sans-serif;"
	html += "    background: white;"
	html += "    background: rgba(255,255,255,0.8);"
	html += "    box-shadow: 0 0 15px rgba(0,0,0,0.2);"
	html += "    border-radius: 5px;"
	html += "	 position: relative;"
	html += "	 float: left;"
	html += "    line-height: 18px;"
	html += "    color: #555;"
	html += "}"
	html += "</style>"
	
	html += "<div id='eo1_ali_floodmap' class='eo1_ali_floodmap-info'>"
	html += "  <div class='legend-title'>"+ req.gettext("legend.eo1_ali.title")+"</div>"
	html += "  <div class='legend-scale'>"
	html += "    <ul class='legend-labels'>"
	html += "	   <li><span style='background: #FF0000'></span>&nbsp;"+ req.gettext("legend.eo1_ali.legend") +"</li>"
	html += "    </ul>"
	html += "  </div>"
	html += "  <div class='legend-source'>"+ req.gettext("legend.eo1_ali.source.label")+": <a href='http://gsfc.nasa.gov/'>"+ req.gettext("legend.eo1_ali.source.source")+"</a>"
	html += "</div>&nbsp;&nbsp;"
	return html
}

function get_dfo_floodmap_legend(req) {
	var html = "<style id='dfo_floodmap_legend_style' >"
    html += ".dfo_floodmap-info .legend-scale ul {"
    html += "   margin: 0;"
    html += "   margin-bottom: 5px;"
    html += "   padding: 0;"
    html += "   float: left;"
    html += "   list-style: none;"
    html += "   }"
	html += ".dfo_floodmap-info .legend-scale ul li {"
	html += "   font-size: 80%;"
	html += "   list-style: none;"
	html += "    margin-left: 0;"
	html += "    line-height: 18px;"
	html += "    margin-bottom: 2px;"
	html += "}"
    html += ".dfo_floodmap-info ul.legend-labels li span {"
    html += "  display: block;"
    html += "  float: left;"
    html += "  height: 16px;"
    html += "  width: 30px;"
    html += "  margin-right: 5px;"
    html += "  margin-left: 0;"
    html += "  border: 1px solid #999;"
    html += "}"
    html += ".dfo_floodmap-info .legend-source {"
    html += "   font-size: 70%;"
    html += "   color: #999;"
    html += "   clear: both;"
    html += "}"
	html += ".dfo_floodmap-info {"
	html += "    padding: 6px 8px;"
	html += "    font: 14px/16px Arial, Helvetica, sans-serif;"
	html += "    background: white;"
	html += "    background: rgba(255,255,255,0.8);"
	html += "    box-shadow: 0 0 15px rgba(0,0,0,0.2);"
	html += "    border-radius: 5px;"
	html += "	 position: relative;"
	html += "	 float: left;"
	html += "    line-height: 18px;"
	html += "    color: #555;"
	html += "}"
	html += "</style>"
	
	html += "<div id='dfo_floodmap' class='dfo_floodmap-info'>"
	html += "  <div class='legend-title'>"+ req.gettext("legend.dfo.title")+"</div>"
	html += "  <div class='legend-scale'>"
	html += "    <ul class='legend-labels'>"
	html += "	   <li><span style='background: #FF0000'></span>&nbsp;"+ req.gettext("legend.dfo.legend") +"</li>"
	html += "    </ul>"
	html += "  </div>"
	html += "  <div class='legend-source'>"+ req.gettext("legend.dfo.source.label")+": <a href='http://gsfc.nasa.gov/'>"+ req.gettext("legend.dfo.source.source")+"</a>"
	html += "</div>&nbsp;&nbsp;"
	return html
}

function get_frost_legend(req) {
	var html = "<style id='frost_legend_style' >"

    html += ".frost_map-info .legend-scale ul {"
    html += "   margin: 0;"
    html += "   margin-bottom: 5px;"
    html += "   padding: 0;"
    html += "   float: left;"
    html += "   list-style: none;"
    html += "   }"
	html += ".frost_map-info .legend-scale ul li {"
	html += "   font-size: 80%;"
	html += "   list-style: none;"
	html += "    margin-left: 0;"
	html += "    line-height: 18px;"
	html += "    margin-bottom: 2px;"
	html += "}"
    html += ".frost_map-info ul.legend-labels li span {"
    html += "  display: block;"
    html += "  float: left;"
    html += "  height: 16px;"
    html += "  width: 30px;"
    html += "  margin-right: 5px;"
    html += "  margin-left: 0;"
    html += "  border: 1px solid #999;"
    html += "}"
    html += ".frost_map-info .legend-source {"
    html += "   font-size: 70%;"
    html += "   color: #999;"
    html += "   clear: both;"
    html += "}"
	html += ".frost_map-info {"
	html += "    padding: 6px 8px;"
	html += "    font: 14px/16px Arial, Helvetica, sans-serif;"
	html += "    background: white;"
	html += "    background: rgba(255,255,255,0.8);"
	html += "    box-shadow: 0 0 15px rgba(0,0,0,0.2);"
	html += "    border-radius: 5px;"
	html += "	 position: relative;"
	html += "	 float: left;"
	html += "    line-height: 18px;"
	html += "    color: #555;"
	
	html += "}"
	html += "</style>"
	
	html += "<div id='frost_map_legend' class='frost_map-info'>"
	html += "  <div class='legend-title'>"+ req.gettext("legend.frost.title")+"</div>"
	html += "  <div class='legend-scale'>"
	html += "    <ul class='legend-labels'>"
	html += "	   <li><span style='background: #FFFFFF'></span>&nbsp;"+ req.gettext("legend.frost.legend.no_data") +"</li>"
	html += "	   <li><span style='background: #9900FF'></span>&nbsp;"+ req.gettext("legend.frost.legend.very_severe_frost") +"</li>"
	html += "	   <li><span style='background: #FF99CC'></span>&nbsp;"+ req.gettext("legend.frost.legend.severe_frost") +"</li>"
	html += "	   <li><span style='background: #FF0000'></span>&nbsp;"+ req.gettext("legend.frost.legend.severe_frost") +"</li>"
	html += "	   <li><span style='background: #FF9900'></span>&nbsp;"+ req.gettext("legend.frost.legend.moderate_frost") +"</li>"
	html += "	   <li><span style='background: #00FF00'></span>&nbsp;"+ req.gettext("legend.frost.legend.no_frost") +"</li>"
	html += "    </ul>"
	html += "  </div>"
	html += "<div class='legend-source'>"+ req.gettext("legend.frost.source.label")+": <a href='http://gsfc.nasa.gov/'>"+ req.gettext("legend.frost.source.source")+"</a>"
	html += "</div>&nbsp;&nbsp;"
	
	console.log("legend title", req.gettext("legend.frost.title"))
	
	return html
}

function get_frost_style(req) {
	var json = {
		"{frost}==0": {
			color: "#FFFFFF", 	// no data
			weight: 3
		},
		"{frost}==1": {
			color: "#00FF00", 	// no frost
			weight: 1
		},
		"{frost}==2": {
			color: "#FF9900", 	// minor frost
			weight: 2
		},
		"{frost}==3": {
			color: "#FF0000", 	// moderate frost
			weight: 3
		},
		"{frost}==4": {
			color: "#FF99CC", 	// severe frost
			weight: 4
		},
		"{frost}==5": {
			color: "#9900FF", 	// very severe frost
			weight: 4
		}
	}
	return json
}


function get_flood_style(req) {
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
function get_frost_credits(req) {
	var json = {
		"credits":  req.gettext("legend.frost.credits"),
		"url": 		"http://oas.gsfc.nasa.gov/floodmap/",
	};
	console.log("frost credits", req.gettext("legend.frost.credits"))
	return json;
}

function get_radarsat2_credits(req) {
	var json = {
		"credits":  req.gettext("legend.radarsat2.credits"),
		"url": 		"http://oas.gsfc.nasa.gov/floodmap/",
	};
	return json;
}

function get_landsat8_credits(req) {
	var json = {
		"credits":  req.gettext("legend.l8.credits"),
		"url": 		"http://oas.gsfc.nasa.gov/floodmap/",
	};
	return json;
}

function get_modis_credits(req) {
	var json = {
		"credits":  req.gettext("legend.modis.credits"),
		"url": 		"http://oas.gsfc.nasa.gov/floodmap/",
	};
	return json;
}

function get_eo1_ali_credits(req) {
	var json = {
		"credits":  req.gettext("legend.eo1_ali.credits"),
		"url": 		"http://eo1.nasa.gov/",
	};
	return json;
}
function get_dfo_credits(req) {
	var json = {
		"credits":  req.gettext("legend.dfo.credits"),
		"url": 		"http://floodobservatory.colorado.edu/",
	};
	return json;
}

module.exports = {
	frost: function(req, res) {
		var style 	= get_frost_style(req);
		var html  	= get_frost_legend(req);
		var credits = get_frost_credits(req);
		res.render("mapinfo/frost", { style: style, html: html, credits: credits })
	},
	frost_style: function(req, res) {
		console.log("send frost style")
		var json = get_frost_style(req)
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'application/json');		
		res.send(json)
	},
	frost_legend: function(req, res) {
		console.log("send frost legend")
		var html = get_frost_legend(req)
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'text/html');		
		res.send(html)
	},
	frost_credits: function(req, res) {
		console.log("send frost credits")
		var str = get_frost_credits(req)
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'application/json');		
		res.send(str)
	},
	
	modis: function(req, res) {
		var style 	= get_flood_style(req);
		var html  	= get_modis_floodmap_legend(req);
		var credits = get_modis_credits(req);
		res.render("mapinfo/modis", { style: style, html: html, credits: credits })
	},
	modis_style: function(req, res) {
		var json = get_flood_style(req)
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'application/json');		
		res.send(json)
	},
	modis_legend: function(req, res) {
		var html = get_modis_floodmap_legend(req)
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'text/html');		
		res.send(html)
	},
	modis_credits: function(req, res) {
		var str = get_modis_credits(req)
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'application/json');		
		res.send(str)
	},
	
	landsat8: function(req, res) {
		var style 	= get_flood_style(req);
		var html  	= get_landsat8_floodmap_legend(req);
		var credits = get_landsat8_credits(req);
		res.render("mapinfo/landsat8", { style: style, html: html, credits: credits })
	},
	landsat8_style: function(req, res) {
		var json = get_flood_style(req)
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'application/json');		
		res.send(json)
	},
	landsat8_legend: function(req, res) {
		var html = get_landsat8_floodmap_legend(req)
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'text/html');		
		res.send(html)
	},
	landsat8_credits: function(req, res) {
		var str = get_landsat8_credits(req)
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'application/json');		
		res.send(str)
	},
	
	radarsat2: function(req, res) {
		var style 	= get_flood_style(req);
		var html  	= get_radarsat2_floodmap_legend(req);
		var credits = get_radarsat2_credits(req);
		res.render("mapinfo/radarsat2", { style: style, html: html, credits: credits })
	},
	radarsat2_style: function(req, res) {
		var json = get_flood_style(req)
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'application/json');		
		res.send(json)
	},
	radarsat2_legend: function(req, res) {
		var html = get_radarsat2_floodmap_legend(req)
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'text/html');		
		res.send(html)
	},
	radarsat2_credits: function(req, res) {
		var str = get_radarsat2_credits(req)
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'application/json');		
		res.send(str)
	},
	
	eo1_ali: function(req, res) {
		var style 	= get_flood_style(req);
		var html  	= get_eo1_ali_floodmap_legend(req);
		var credits = get_eo1_ali_credits(req);
		res.render("mapinfo/eo1", { style: style, html: html, credits: credits })
	},
	eo1_ali_style: function(req, res) {
		var json = get_flood_style(req)
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'application/json');		
		res.send(json)
	},
	eo1_ali_legend: function(req, res) {
		var html = get_eo1_ali_floodmap_legend(req)
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'text/html');		
		res.send(html)
	},
	eo1_ali_credits: function(req, res) {
		var str = get_eo1_ali_credits(req)
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'application/json');		
		res.send(str)
	},
	
	dfo: function(req, res) {
		var style 	= get_flood_style(req);
		var html  	= get_dfo_floodmap_legend(req);
		var credits = get_dfo_credits(req);
		res.render("mapinfo/dfo", { style: style, html: html, credits: credits })
	},
	dfo_style: function(req, res) {
		var json = get_flood_style(req)
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'application/json');		
		res.send(json)
	},
	dfo_legend: function(req, res) {
		var html = get_dfo_floodmap_legend(req)
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'text/html');		
		res.send(html)
	},
	dfo_credits: function(req, res) {
		var str = get_dfo_credits(req)
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'application/json');		
		res.send(str)
	}
}