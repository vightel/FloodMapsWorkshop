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
		
	var source_url = "http://www.star.nesdis.noaa.gov/smcd/emb/vci/VH/vh_ftp.php"
	
	var options = {
		//bucket: 		'ojo-workshop',
		subfolder: 		'vhi',
		browse_img: 	"_thn.jpg",
		geojson: 		undefined,
		topojson: 		".topojson",
		topojson_gz: 	".topojson.gz",
		source: 		'sources.noaa',
		sensor: 		'sensors.avhrr',
		resolution: 	'4km',
		original_url:   source_url,
		product: 		'vhi',
		tags: 			['vhi', 'vegetation_health_index', 'drought'],
		//bbox: 		bbox,							// lng,lat bottom left - top right
		//target: 		[centerlon, centerlat],
		minzoom: 		6
	}
	
	var colors 			= [ "#d53e4f", "#f46d43", "#fdae61", "#fee08b", "#ffffbf", "#e6f598", "#abdda4", "#66c2a5", "#3288bd"]

	options.credits	= function(req) {
		var json = {
			"credits":  req.gettext("legend.vhi.credits"),
			"url": 		source_url,
		};
		return json;
	}
	
	options.style = function(req) {
		var json = {
			"{vhi}==6": {
				color: colors[0], 	
				weight: 2
			},
			"{vhi}==12": {
				color: colors[1], 	
				weight: 2
			},
			"{vhi}==24": {
				color: colors[2], 	
				weight: 2
			},
			"{vhi}==36": {
				color: colors[3], 	
				weight: 2
			},
			"{vhi}==48": {
				color: colors[4], 	
				weight: 2
			},
			"{vhi}==60": {
				color: colors[5], 	
				weight: 2
			},
			"{vhi}==72": {
				color: colors[6], 	
				weight: 2
			},
			"{vhi}==84": {
				color: colors[7], 	
				weight: 2
			},
			"{vhi}==100": {
				color: colors[8], 	
				weight: 2
			}
		}
		return json
	}

	options.legend = function(req) {
		var html = "<style id='vhi_legend_style' >"
	    html += ".vhi_map-info .legend-scale ul {"
	    html += "   margin: 0;"
	    html += "   margin-bottom: 5px;"
	    html += "   padding: 0;"
	    html += "   float: right;"
	    html += "   list-style: none;"
	    html += "   }"
		html += ".vhi_map-info .legend-scale ul li {"
		html += "   font-size: 80%;"
		html += "   list-style: none;"
		html += "    margin-left: 0;"
		html += "    line-height: 18px;"
		html += "    margin-bottom: 2px;"
		html += "}"
	    html += ".vhi_map-info ul.legend-labels li span {"
	    html += "  display: block;"
	    html += "  float: left;"
	    html += "  height: 16px;"
	    html += "  width: 30px;"
	    html += "  margin-right: 5px;"
	    html += "  margin-left: 0;"
	    html += "  border: 1px solid #999;"
	    html += "}"
	    html += ".vhi_map-info .legend-source {"
	    html += "   font-size: 70%;"
	    html += "   color: #999;"
	    html += "   clear: both;"
	    html += "}"
		html += ".vhi_map-info {"
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
	
		html += "<div id='vhi_legend' class='vhi_map-info'>"
		html += "  <div class='legend-title'>"+ req.gettext("legend.vhi.title")+"</div>"
		html += "  <div class='legend-scale'>"
		html += "    <ul class='legend-labels'>"
		html += "	   <li><span style='background: " + colors[0] + "'></span>&nbsp;"+ req.gettext("legend.vhi.legend.6") +"</li>"
		html += "	   <li><span style='background: " + colors[1] + "'></span>&nbsp;"+ req.gettext("legend.vhi.legend.12") +"</li>"
		html += "	   <li><span style='background: " + colors[2] + "'></span>&nbsp;"+ req.gettext("legend.vhi.legend.24") +"</li>"
		html += "	   <li><span style='background: " + colors[3] + "'></span>&nbsp;"+ req.gettext("legend.vhi.legend.36") +"</li>"
		html += "	   <li><span style='background: " + colors[4] + "'></span>&nbsp;"+ req.gettext("legend.vhi.legend.48") +"</li>"
		html += "	   <li><span style='background: " + colors[5] + "'></span>&nbsp;"+ req.gettext("legend.vhi.legend.60") +"</li>"
		html += "	   <li><span style='background: " + colors[6] + "'></span>&nbsp;"+ req.gettext("legend.vhi.legend.72") +"</li>"
		html += "	   <li><span style='background: " + colors[7] + "'></span>&nbsp;"+ req.gettext("legend.vhi.legend.84") +"</li>"
		html += "	   <li><span style='background: " + colors[8] + "'></span>&nbsp;"+ req.gettext("legend.vhi.legend.100") +"</li>"
		html += "    </ul>"
		html += "  </div>"
		html += "<div class='legend-source'>"+ req.gettext("legend.vhi.source.label")+": <a href='"+ source_url+"'>"+ req.gettext("legend.vhi.source.source")+"</a>"
		html += "</div>&nbsp;&nbsp;"
	
		console.log("legend title", req.gettext("legend.vhi.title"))
	
		return html
	}
	
	var query	= new Query(options)

	module.exports.query 			= query;
