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
		subfolder: 		'modis_af',
		browse_img: 	'_thn.jpg',						// will be something like subfolder.yyyymmddxxxxx
		geojson: 		'.geojson',
		geojsongz: 		'.geojson.gz',
		topojson: 		undefined,
		topojson_gz: 	undefined,
		source: 		'sources.modis',
		sensor: 		'sensors.modis',
		resolution: 	'500m',
		original_url:   'https://earthdata.nasa.gov/data/near-real-time-data/firms/active-fire-data',
		product: 		'active_fires',
		tags: 			['active_fires', 'fires', 'hazard', 'disaster'],
		bbox: 			bbox,							// lng,lat bottom left - top right
		target: 		[centerlon, centerlat],
		minzoom: 		6
	}

	var colors = [ "#f7fcf0","#e0f3db","#ccebc5","#a8ddb5","#7bccc4","#4eb3d3","#2b8cbe","#0868ac","#084081","#810F7C" ]

	options.credits	= function(req) {
		var json = {
			"credits":  req.gettext("legend.daily_precipitation.credits"),
			"url": 		"http://trmm.nasa.gov/",
		};
		return json;
	}

	options.style = function(req) {
		var json = {
			"true": {
				property: 'brightness',
				scale: 0.02,
				fillOpacity: 0.5,
				weight: 0.5,
				color: '#ff0000'
			}
		}
		return json
	}

	options.legend = function(req) {
		var html = "<style id='modis_af_legend_style' >"
	    html += ".modis_af_map-info .legend-scale ul {"
	    html += "   margin: 0;"
	    html += "   margin-bottom: 5px;"
	    html += "   padding: 0;"
	    html += "   float: right;"
	    html += "   list-style: none;"
	    html += "   }"
		html += ".modis_af_map-info .legend-scale ul li {"
		html += "   font-size: 80%;"
		html += "   list-style: none;"
		html += "    margin-left: 0;"
		html += "    line-height: 18px;"
		html += "    margin-bottom: 2px;"
		html += "}"
	    html += ".modis_af_map-info ul.legend-labels li span {"
	    html += "  display: block;"
	    html += "  float: left;"
	    html += "  height: 16px;"
	    html += "  width: 30px;"
	    html += "  margin-right: 5px;"
	    html += "  margin-left: 0;"
	    html += "  border: 1px solid #999;"
	    html += "}"
	    html += ".modis_af_map-info .legend-source {"
	    html += "   font-size: 70%;"
	    html += "   color: #999;"
	    html += "   clear: both;"
	    html += "}"
		html += ".modis_af_map-info {"
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
	
		html += "<div id='modis_af_legend' class='modis_af_map-info'>"
		html += "  <div class='legend-title'>"+ req.gettext("legend.active_fires.title")+"</div>"
		html += "  <div class='legend-scale'>"
		html += "    <ul class='legend-labels'>"
		html += "	   <li><span style='background: #FF0000'></span>&nbsp;"+ req.gettext("legend.active_fires.legend") +"</li>"
		html += "    </ul>"
		html += "  </div>"
		html += "<div class='legend-source'>"+ req.gettext("legend.active_fires.source.label")+": <a href='https://earthdata.nasa.gov/data/near-real-time-data/firms/active-fire-data'>"+ req.gettext("legend.active_fires.source.source")+"</a>"
		html += "</div>&nbsp;&nbsp;"
		
		return html
	}
		
	var query	= new Query(options)
	
//	function QueryAll(req, user, credentials, host, q, bbox, lat, lon, startTime, endTime, startIndex, itemsPerPage, limit, cb ) {
//		query.QueryAll( req, user, credentials, host, q, bbox, lat, lon, startTime, endTime, startIndex, itemsPerPage, limit, cb  )
//	}
	
//	function QueryByID(req, user, year, doy, credentials, cb ) {
//		query.QueryByID(req, user, year, doy, credentials, cb ) 
//	}
	
//	function Map(req, res) {
//		query.Map(req,res)
//	}
//	function Browse(req, res) {
//		query.Map(req,res)
//	}
//	function Process(req, res) {
//		query.Map(req,res)
//	}
//	function QueryProduct(req, res) {
//		query.QueryProduct(req,res)
//	}
//	function MapInfo(req, res) {
//		query.MapInfo(req,res)
//	}	
		
//	function Style (req, res) {
//		query.Style(req,res)
//	}
	
//	function Legend(req, res) {
//		query.Legend(req,res)
//	}
	
//	function Credits(req, res) {
//		query.Credits(req,res)
//	}
	
//module.exports.QueryAll			= QueryAll;
//module.exports.QueryByID 		= QueryByID;

//module.exports.Map 				= Map;
//module.exports.Browse 			= Browse;
//module.exports.Process 			= Process;
//module.exports.QueryProduct 	= QueryProduct;

//module.exports.MapInfo 			= MapInfo;
//module.exports.Style 			= Style;
//module.exports.Legend 			= Legend;
//module.exports.Credits 			= Credits;

module.exports.query 			= query;


