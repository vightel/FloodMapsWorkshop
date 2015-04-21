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
		
	var source_url = "http://chg.geog.ucsb.edu/data/chirps/"
	
	var options = {
		subfolder: 		'chirps_prelim_monthly',
		browse_img: 	"_thn.jpg",
		geojson: 		undefined,
		topojson: 		".topojson",
		topojson_gz: 	".topojson.gz",
		geotiff: 		".tif",
		source: 		'sources.chirps',
		sensor: 		'sources.chirps',
		resolution: 	'4km',
		original_url:   source_url,
		product: 		'chirps_prelim_monthly',
		tags: 			['precip_30', 'chirps_30', 'chirps2.0', 'chirps_prelim_monthly', 'precipitation'],
		minzoom: 		6
	}
	
	var colors 		= [	"#ffffff", "#F8ECE0", "#33FF00", "#33CC00", "#339900", "#33FFFF", "#33CCFF", "#3399FF", "#FFFF33", "#FFCC33", "#FF3333", "#990033"]
	var levels 		= [600,500,400,300,250,200,150,100,50,25,10,0]
	
	options.credits	= function(req) {
		var json = {
			"credits":  req.gettext("legend.chirps_30.credits"),
			"url": 		source_url,
		};
		return json;
	}
	options.style = function(req) {
		var json = {
			"{precip}==0": {
				color: colors[0], 	
				weight: 2
			},
			"{precip}==10": {
				color: colors[1], 	
				weight: 2
			},
			"{precip}==25": {
				color: colors[2], 	
				weight: 2
			},
			"{precip}==50": {
				color: colors[3], 	
				weight: 2
			},
			"{precip}==100": {
				color: colors[4], 	
				weight: 2
			},
			"{precip}==150": {
				color: colors[5], 	
				weight: 2
			},
			"{precip}==200": {
				color: colors[6], 	
				weight: 2
			},
			"{precip}==250": {
				color: colors[7], 	
				weight: 2
			},
			"{precip}==300": {
				color: colors[8], 	
				weight: 2
			},
			"{precip}==400": {
				color: colors[9], 	
				weight: 2
			},
			"{precip}==500": {
				color: colors[10], 	
				weight: 2
			},
			"{precip}==600": {
				color: colors[11], 	
				weight: 2
			}
		}
		return json
	}

	options.legend = function(req) {
		var html = "<style id='chirps_prelim_monthly_legend_style' >"
	    html += ".chirps_prelim_monthly_map-info .legend-scale ul {"
	    html += "   margin: 0;"
	    html += "   margin-bottom: 5px;"
	    html += "   padding: 0;"
	    html += "   float: right;"
	    html += "   list-style: none;"
	    html += "   }"
		html += ".chirps_prelim_monthly_map-info .legend-scale ul li {"
		html += "   font-size: 80%;"
		html += "   list-style: none;"
		html += "    margin-left: 0;"
		html += "    line-height: 18px;"
		html += "    margin-bottom: 2px;"
		html += "}"
	    html += ".chirps_prelim_monthly_map-info ul.legend-labels li span {"
	    html += "  display: block;"
	    html += "  float: left;"
	    html += "  height: 16px;"
	    html += "  width: 30px;"
	    html += "  margin-right: 5px;"
	    html += "  margin-left: 0;"
	    html += "  border: 1px solid #999;"
	    html += "}"
	    html += ".chirps_prelim_monthly_map-info .legend-source {"
	    html += "   font-size: 70%;"
	    html += "   color: #999;"
	    html += "   clear: both;"
	    html += "}"
		html += ".chirps_prelim_monthly_map-info {"
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
	
		html += "<div id='chirps_prelim_monthly_legend' class='chirps_prelim_monthly_map-info'>"
		html += "  <div class='legend-title'>"+ req.gettext("legend.chirps_prelim_monthly.title")+"</div>"
		html += "  <div class='legend-scale'>"
		html += "    <ul class='legend-labels'>"
		html += "	   <li><span style='background: " + colors[0] + "'></span>&nbsp;"+ req.gettext("legend.chirps_prelim_monthly.legend.0") +"</li>"
		html += "	   <li><span style='background: " + colors[1] + "'></span>&nbsp;"+ req.gettext("legend.chirps_prelim_monthly.legend.10") +"</li>"
		html += "	   <li><span style='background: " + colors[2] + "'></span>&nbsp;"+ req.gettext("legend.chirps_prelim_monthly.legend.25") +"</li>"
		html += "	   <li><span style='background: " + colors[3] + "'></span>&nbsp;"+ req.gettext("legend.chirps_prelim_monthly.legend.50") +"</li>"
		html += "	   <li><span style='background: " + colors[4] + "'></span>&nbsp;"+ req.gettext("legend.chirps_prelim_monthly.legend.100") +"</li>"
		html += "	   <li><span style='background: " + colors[5] + "'></span>&nbsp;"+ req.gettext("legend.chirps_prelim_monthly.legend.150") +"</li>"
		html += "	   <li><span style='background: " + colors[6] + "'></span>&nbsp;"+ req.gettext("legend.chirps_prelim_monthly.legend.200") +"</li>"
		html += "	   <li><span style='background: " + colors[7] + "'></span>&nbsp;"+ req.gettext("legend.chirps_prelim_monthly.legend.250") +"</li>"
		html += "	   <li><span style='background: " + colors[8] + "'></span>&nbsp;"+ req.gettext("legend.chirps_prelim_monthly.legend.300") +"</li>"
		html += "	   <li><span style='background: " + colors[9] + "'></span>&nbsp;"+ req.gettext("legend.chirps_prelim_monthly.legend.400") +"</li>"
		html += "	   <li><span style='background: " + colors[10] + "'></span>&nbsp;"+ req.gettext("legend.chirps_prelim_monthly.legend.500") +"</li>"
		html += "	   <li><span style='background: " + colors[11] + "'></span>&nbsp;"+ req.gettext("legend.chirps_prelim_monthly.legend.600") +"</li>"
		html += "    </ul>"
		html += "  </div>"
		html += "<div class='legend-source'>"+ req.gettext("legend.chirps_prelim_monthly.source.label")+": <a href='"+ source_url+"'>"+ req.gettext("legend.chirps_prelim_monthly.source.source")+"</a>"
		html += "</div>&nbsp;&nbsp;"
	
		console.log("legend title", req.gettext("legend.chirps_prelim_monthly.title"))
	
		return html
	}
	
	var query	= new Query(options)

	module.exports.query 			= query;
