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
		
	var source_url = "http://oceandata.sci.gsfc.nasa.gov/"
	
	var options = {
		subfolder: 		'viirs_chla',
		browse_img: 	"_thn.jpg",
		geojson: 		undefined,
		topojson: 		".topojson",
		topojson_gz: 	".topojson.gz",
		shape_gz: 	    ".shp.gz",
		source: 		'sources.gsfc',
		sensor: 		'sensors.viirs',
		resolution: 	'4km',
		original_url:   source_url,
		product: 		'viirs_chla',
		tags: 			['algal_bloom', 'viirs_chla', 'chlorophyll_a', 'ocean_color'],
		minzoom: 		6
	}
	
	var colors 				= ["#5e4fa2", "#3288bd", "#66c2a5", "#abdda4", "#e6f598", "#fee08b", "#fdae61", "#f46d43", "#d53e4f", "#9e0142"]
	var levels 				= [350, 100, 50, 30, 20, 15, 10, 5, 3, 1]
	
	options.credits	= function(req) {
		var json = {
			"credits":  req.gettext("legend.viirs_chla.credits"),
			"url": 		source_url,
		};
		return json;
	}
	options.style = function(req) {
		var json = {
			"{viirs_chla}==1": {
				color: colors[0], 	
				weight: 2
			},
			"{viirs_chla}==3": {
				color: colors[1], 	
				weight: 2
			},
			"{viirs_chla}==5": {
				color: colors[2], 	
				weight: 2
			},
			"{viirs_chla}==10": {
				color: colors[3], 	
				weight: 2
			},
			"{viirs_chla}==15": {
				color: colors[4], 	
				weight: 2
			},
			"{viirs_chla}==20": {
				color: colors[5], 	
				weight: 2
			},
			"{viirs_chla}==30": {
				color: colors[6], 	
				weight: 2
			},
			"{viirs_chla}==50": {
				color: colors[7], 	
				weight: 2
			},
			"{viirs_chla}==100": {
				color: colors[8], 	
				weight: 2
			},
			"{viirs_chla}==350": {
				color: colors[9], 	
				weight: 2
			}
		}
		return json
	}

	options.legend = function(req) {
		var html = "<style id='viirs_chla_legend_style' >"
	    html += ".viirs_chla_map-info .legend-scale ul {"
	    html += "   margin: 0;"
	    html += "   margin-bottom: 5px;"
	    html += "   padding: 0;"
	    html += "   float: right;"
	    html += "   list-style: none;"
	    html += "   }"
		html += ".viirs_chla_map-info .legend-scale ul li {"
		html += "   font-size: 80%;"
		html += "   list-style: none;"
		html += "    margin-left: 0;"
		html += "    line-height: 18px;"
		html += "    margin-bottom: 2px;"
		html += "}"
	    html += ".viirs_chla_map-info ul.legend-labels li span {"
	    html += "  display: block;"
	    html += "  float: left;"
	    html += "  height: 16px;"
	    html += "  width: 30px;"
	    html += "  margin-right: 5px;"
	    html += "  margin-left: 0;"
	    html += "  border: 1px solid #999;"
	    html += "}"
	    html += ".viirs_chla_map-info .legend-source {"
	    html += "   font-size: 70%;"
	    html += "   color: #999;"
	    html += "   clear: both;"
	    html += "}"
		html += ".viirs_chla_map-info {"
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
	
		html += "<div id='viirs_chla_legend' class='viirs_chla_map-info'>"
		html += "  <div class='legend-title'>"+ req.gettext("legend.viirs_chla.title")+"</div>"
		html += "  <div class='legend-scale'>"
		html += "    <ul class='legend-labels'>"
		html += "	   <li><span style='background: " + colors[0] + "'></span>&nbsp;"+ req.gettext("legend.viirs_chla.legend.1") +"</li>"
		html += "	   <li><span style='background: " + colors[1] + "'></span>&nbsp;"+ req.gettext("legend.viirs_chla.legend.3") +"</li>"
		html += "	   <li><span style='background: " + colors[2] + "'></span>&nbsp;"+ req.gettext("legend.viirs_chla.legend.5") +"</li>"
		html += "	   <li><span style='background: " + colors[3] + "'></span>&nbsp;"+ req.gettext("legend.viirs_chla.legend.10") +"</li>"
		html += "	   <li><span style='background: " + colors[4] + "'></span>&nbsp;"+ req.gettext("legend.viirs_chla.legend.15") +"</li>"
		html += "	   <li><span style='background: " + colors[5] + "'></span>&nbsp;"+ req.gettext("legend.viirs_chla.legend.20") +"</li>"
		html += "	   <li><span style='background: " + colors[6] + "'></span>&nbsp;"+ req.gettext("legend.viirs_chla.legend.30") +"</li>"
		html += "	   <li><span style='background: " + colors[7] + "'></span>&nbsp;"+ req.gettext("legend.viirs_chla.legend.50") +"</li>"
		html += "	   <li><span style='background: " + colors[8] + "'></span>&nbsp;"+ req.gettext("legend.viirs_chla.legend.100") +"</li>"
		html += "	   <li><span style='background: " + colors[9] + "'></span>&nbsp;"+ req.gettext("legend.viirs_chla.legend.350") +"</li>"
		html += "    </ul>"
		html += "  </div>"
		html += "<div class='legend-source'>"+ req.gettext("legend.viirs_chla.source.label")+": <a href='"+ source_url+"'>"+ req.gettext("legend.viirs_chla.source.source")+"</a>"
		html += "</div>&nbsp;&nbsp;"
		
		return html
	}
	
	var query	= new Query(options)

	module.exports.query 			= query;
