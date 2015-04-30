var util 		= require('util'),
	fs			= require('fs'),
	async	 	= require('async'),
	path		= require('path'),
	moment		= require('moment'),
	_			= require('underscore'),
	Hawk		= require('hawk'),
	filesize 	= require('filesize'),
	Query		= require('./query_s3');
	
	//var	bbox		=	[60, 40, 80, 20];				// lng,lat bottom left - top right
	//var	centerlon	=  	(bbox[0]+bbox[2])/2;
	//var	centerlat	=	(bbox[1]+bbox[3])/2;
	
	var source_url = "http://earthquake.usgs.gov/earthquakes/"
	
	var options = {
		//bucket: 		'ojo-workshop',
		subfolder: 		'quakes',
		browse_img: 	'_thn.jpg',						// will be something like subfolder.yyyymmddxxxxx
		geojson: 		'.geojson',
		geojsongz: 		'.geojson.gz',
		topojson: 		undefined,
		topojson_gz: 	undefined,
		source: 		'sources.usgs',
		sensor: 		'sensors.usgs',
		resolution: 	'10m',
		original_url:   source_url,
		product: 		'quakes',
		tags: 			['quakes', 'hazard', 'disaster'],
		//bbox: 			bbox,							// lng,lat bottom left - top right
		//target: 		[centerlon, centerlat],
		minzoom: 		6
	}

	//var colors = [ "#f7fcf0","#e0f3db","#ccebc5","#a8ddb5","#7bccc4","#4eb3d3","#2b8cbe","#0868ac","#084081","#810F7C" ]

	options.credits	= function(req) {
		var json = {
			"credits":  req.gettext("legend.quakes.credits"),
			"url": 		source_url,
		};
		return json;
	}

	options.style = function(req) {
		var json = {
			"true": {
				property: 'mag',
				scale: 2,
				fillOpacity: 0.5,
				weight: 0.5,
				color: '#000000'
			}
		}
		return json
	}

	options.legend = function(req) {
		var html = "<style id='quakes_legend_style' >"
	    html += ".quakes_map-info .legend-scale ul {"
	    html += "   margin: 0;"
	    html += "   margin-bottom: 5px;"
	    html += "   padding: 0;"
	    html += "   float: right;"
	    html += "   list-style: none;"
	    html += "   }"
		html += ".quakes_map-info .legend-scale ul li {"
		html += "   font-size: 80%;"
		html += "   list-style: none;"
		html += "    margin-left: 0;"
		html += "    line-height: 18px;"
		html += "    margin-bottom: 2px;"
		html += "}"
	    html += ".quakes_map-info ul.legend-labels li span {"
	    html += "  display: block;"
	    html += "  float: left;"
	    html += "  height: 16px;"
	    html += "  width: 16px;"
		html += "  border-radius: 8px;"
		html += "  	-webkit-border-radius: 8px;"
		html += "  	-moz-border-radius: 8px;"
			
	    html += "  margin-right: 5px;"
	    html += "  margin-left: 0;"
	    html += "  border: 1px solid #999;"
	    html += "}"
	    html += ".quakes_map-info .legend-source {"
	    html += "   font-size: 70%;"
	    html += "   color: #999;"
	    html += "   clear: both;"
	    html += "}"
		html += ".quakes_map-info {"
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
	
		html += "<div id='quakes_legend' class='quakes_map-info'>"
		html += "  <div class='legend-title'>"+ req.gettext("legend.quakes.title")+"</div>"
		html += "  <div class='legend-scale'>"
		html += "    <ul class='legend-labels'>"
		html += "	   <li><span style='background: #000000'></span>&nbsp;"+ req.gettext("legend.quakes.legend") +"</li>"
		html += "    </ul>"
		html += "  </div>"
		html += "<div class='legend-source'>"+ req.gettext("legend.quakes.source.label")+": <a href='" + source_url+"'>"+ req.gettext("legend.quakes.source.source")+"</a>"
		html += "</div>&nbsp;&nbsp;"
		
		return html
	}
		
	var query				= new Query(options)
	query.source			= "usgs"
	module.exports.query 	= query;


