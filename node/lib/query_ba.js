var util 		= require('util'),
	fs			= require('fs'),
	async	 	= require('async'),
	path		= require('path'),
	moment		= require('moment'),
	_			= require('underscore'),
	Hawk		= require('hawk'),
	filesize 	= require('filesize'),
	Query		= require('./query_s3')
	;
		
	var source_url = "http://geog.umd.edu/"
	
	var options = {
		subfolder: 		'burned_areas',
		browse_img: 	"_thn.jpg",
		geojson: 		undefined,
		topojson: 		".topojson",
		topojson_gz: 	".topojson.gz",
		source: 		'sources.umd',
		sensor: 		'sensors.modis',
		resolution: 	'500m',
		original_url:   source_url,
		product: 		'burned_areas',
		tags: 			['burned_areas', 'fires', 'disasters'],
		minzoom: 		6
	}
	
	var colors 			= ["#990066"]
	var levels 			= [1]
	
	options.credits	= function(req) {
		var json = {
			"credits":  req.gettext("legend.burned_areas.credits"),
			"url": 		source_url,
		};
		return json;
	}
	
    options.style = function(req) {
		var json = {
    		"true": {
    			color: colors[0], 
    			weight: 3
    		}
		}
		return json
	}

	options.legend = function(req) {
		var html = "<style id='burned_areas_legend_style' >"
	    html += ".burned_areas_map-info .legend-scale ul {"
	    html += "   margin: 0;"
	    html += "   margin-bottom: 5px;"
	    html += "   padding: 0;"
	    html += "   float: right;"
	    html += "   list-style: none;"
	    html += "   }"
		html += ".burned_areas_map-info .legend-scale ul li {"
		html += "   font-size: 80%;"
		html += "   list-style: none;"
		html += "    margin-left: 0;"
		html += "    line-height: 18px;"
		html += "    margin-bottom: 2px;"
		html += "}"
	    html += ".burned_areas_map-info ul.legend-labels li span {"
	    html += "  display: block;"
	    html += "  float: left;"
	    html += "  height: 16px;"
	    html += "  width: 30px;"
	    html += "  margin-right: 5px;"
	    html += "  margin-left: 0;"
	    html += "  border: 1px solid #999;"
	    html += "}"
	    html += ".burned_areas_map-info .legend-source {"
	    html += "   font-size: 70%;"
	    html += "   color: #999;"
	    html += "   clear: both;"
	    html += "}"
		html += ".burned_areas_map-info {"
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
	
		html += "<div id='burned_areas_legend' class='burned_areas_map-info'>"
		html += "  <div class='legend-title'>"+ req.gettext("legend.burned_areas.title")+"</div>"
		html += "  <div class='legend-scale'>"
		html += "    <ul class='legend-labels'>"
		html += "	   <li><span style='background: " + colors[0] + "'></span>&nbsp;"+ req.gettext("legend.burned_areas.legend.1") +"</li>"
        html += "    </ul>"
		html += "  </div>"
		html += "<div class='legend-source'>"+ req.gettext("legend.burned_areas.source.label")+": <a href='"+ source_url+"'>"+ req.gettext("legend.burned_areas.source.source")+"</a>"
		html += "</div>&nbsp;&nbsp;"
	
		console.log("legend title", req.gettext("legend.burned_areas.title"))
	
		return html
	}
	
	var query	= new Query(options)

	module.exports.query 			= query;
