var util 		= require('util'),
	fs			= require('fs'),
	async	 	= require('async'),
	path		= require('path'),
	moment		= require('moment'),
	_			= require('underscore'),
	Hawk		= require('hawk'),
	filesize 	= require('filesize'),
	Query		= require('./query_s3');

	var	bbox		=	[60, 40, 80, 20];				// lng,lat bottom left - top right
	var	centerlon	=  	(bbox[0]+bbox[2])/2;
	var	centerlat	=	(bbox[1]+bbox[3])/2;
	
	var options = {
		bucket: 		'ojo-workshop',
		subfolder: 		'maxswe',
		browse_img: 	".120000_thn.jpg",
		geojson: 		undefined,
		topojson: 		".120000_levels.topojson",
		topojson_gz: 	".120000_levels.topojson.gz",
		source: 		'sources.ef5',
		sensor: 		'sensors.ef5',
		resolution: 	'400m',
		original_url:   'http://flash.ou.edu/pakistan/',
		product: 		'snow_water_equivalent',
		tags: 			['snow_water_equivalent', 'swe'],
		bbox: 			bbox,							// lng,lat bottom left - top right
		target: 		[centerlon, centerlat],
		minzoom: 		6
	}
	
	var colors = ["#f7fcf0","#e0f3db","#ccebc5","#a8ddb5","#7bccc4","#4eb3d3","#2b8cbe","#0868ac","#084081"]
	
	options.credits	= function(req) {
		var json = {
			"credits":  req.gettext("legend.snow_water_equivalent.credits"),
			"url": 		"http://flash.ou.edu/pakistan/",
		};
		return json;
	}

	options.style = function(req) {
		var json = {
			"{swe}==10": {
				color: colors[0], 	
				weight: 2
			},
			"{swe}==20": {
				color: colors[1], 	
				weight: 2
			},
			"{swe}==30": {
				color: colors[2], 	
				weight: 2
			},
			"{swe}==50": {
				color: colors[3], 	
				weight: 2
			},
			"{swe}==80": {
				color: colors[3], 	
				weight: 2
			},
			"{swe}==130": {
				color: colors[4], 	
				weight: 2
			},
			"{swe}==210": {
				color: colors[5], 	
				weight: 2
			},
			"{swe}==340": {
				color: colors[6], 	
				weight: 2
			},
			"{swe}==550": {
				color: colors[7], 	
				weight: 2
			}
		}
		return json
	}

	options.legend = function(req) {
		var html = "<style id='maxswe_legend_style' >"
	    html += ".maxswe_map-info .legend-scale ul {"
	    html += "   margin: 0;"
	    html += "   margin-bottom: 5px;"
	    html += "   padding: 0;"
	    html += "   float: right;"
	    html += "   list-style: none;"
	    html += "   }"
		html += ".maxswe_map-info .legend-scale ul li {"
		html += "   font-size: 80%;"
		html += "   list-style: none;"
		html += "    margin-left: 0;"
		html += "    line-height: 18px;"
		html += "    margin-bottom: 2px;"
		html += "}"
	    html += ".maxswe_map-info ul.legend-labels li span {"
	    html += "  display: block;"
	    html += "  float: left;"
	    html += "  height: 16px;"
	    html += "  width: 30px;"
	    html += "  margin-right: 5px;"
	    html += "  margin-left: 0;"
	    html += "  border: 1px solid #999;"
	    html += "}"
	    html += ".maxswe_map-info .legend-source {"
	    html += "   font-size: 70%;"
	    html += "   color: #999;"
	    html += "   clear: both;"
	    html += "}"
		html += ".maxswe_map-info {"
		html += "    padding: 6px 8px;"
		html += "    font: 14px/16px Arial, Helvetica, sans-serif;"
		html += "    background: white;"
		html += "    background: rgba(255,255,255,0.8);"
		html += "    box-shadow: 0 0 15px rgba(0,0,0,0.2);"
		html += "    border-radius: 5px;"
		html += "	 position: relative;"
		html += "	 float: right;"
		html += "    line-height: 18px;"
		html += "    color: #555;"
	
		html += "}"
		html += "</style>"
	
		html += "<div id='maxswe_legend' class='maxswe_map-info'>"
		html += "  <div class='legend-title'>"+ req.gettext("legend.snow_water_equivalent.title")+"</div>"
		html += "  <div class='legend-scale'>"
		html += "    <ul class='legend-labels'>"
		html += "	   <li><span style='background: " + colors[0] + "'></span>&nbsp;"+ req.gettext("legend.snow_water_equivalent.legend.10mm") +"</li>"
		html += "	   <li><span style='background: " + colors[1] + "'></span>&nbsp;"+ req.gettext("legend.snow_water_equivalent.legend.20mm") +"</li>"
		html += "	   <li><span style='background: " + colors[2] + "'></span>&nbsp;"+ req.gettext("legend.snow_water_equivalent.legend.30mm") +"</li>"
		html += "	   <li><span style='background: " + colors[3] + "'></span>&nbsp;"+ req.gettext("legend.snow_water_equivalent.legend.50mm") +"</li>"
		html += "	   <li><span style='background: " + colors[4] + "'></span>&nbsp;"+ req.gettext("legend.snow_water_equivalent.legend.80mm") +"</li>"
		html += "	   <li><span style='background: " + colors[5] + "'></span>&nbsp;"+ req.gettext("legend.snow_water_equivalent.legend.130mm") +"</li>"
		html += "	   <li><span style='background: " + colors[6] + "'></span>&nbsp;"+ req.gettext("legend.snow_water_equivalent.legend.210mm") +"</li>"
		html += "	   <li><span style='background: " + colors[7] + "'></span>&nbsp;"+ req.gettext("legend.snow_water_equivalent.legend.340mm") +"</li>"
		html += "	   <li><span style='background: " + colors[8] + "'></span>&nbsp;"+ req.gettext("legend.snow_water_equivalent.legend.550mm") +"</li>"
		html += "    </ul>"
		html += "  </div>"
		html += "<div class='legend-source'>"+ req.gettext("legend.snow_water_equivalent.source.label")+": <a href='http://flash.ou.edu/pakistan/'>"+ req.gettext("legend.snow_water_equivalent.source.source")+"</a>"
		html += "</div>&nbsp;&nbsp;"
	
		//console.log("legend title", req.gettext("legend.snow_water_equivalent.title"))
	
		return html
	}
	
	var query	= new Query(options)
	
	module.exports.query 			= query;