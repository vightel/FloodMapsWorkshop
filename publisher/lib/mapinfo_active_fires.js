function get_modis_af_credits(req) {
	var json = {
		"credits":  req.gettext("legend.daily_precipitation.credits"),
		"url": 		"http://trmm.nasa.gov/",
	};
	return json;
}

var colors = [
	"#f7fcf0",
	"#e0f3db",
	"#ccebc5",
	"#a8ddb5",
	"#7bccc4",
	"#4eb3d3",
	"#2b8cbe",
	"#0868ac",
	"#084081",
	"#810F7C",
	"#4D004A"
]

function get_modis_af_style(req) {
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

function get_modis_af_legend(req) {
	var html = "<style id='modis_af_legend_style' >"
    html += ".modis_af_map-info .legend-scale ul {"
    html += "   margin: 0;"
    html += "   margin-bottom: 5px;"
    html += "   padding: 0;"
    html += "   float: left;"
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
	html += "	 float: left;"
	html += "    line-height: 18px;"
	html += "    color: #555;"
	
	html += "}"
	html += "</style>"
	
	html += "<div id='modis_af_map_legend' class='modis_af_map-info'>"
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

module.exports = {
	modis_af: function(req, res) {
		var style 	= get_modis_af_style(req);
		var html  	= get_modis_af_legend(req);
		var credits = get_modis_af_credits(req);
		res.render("mapinfo/modis_af", { style: style, html: html, credits: credits })
	},
	modis_af_style: function(req, res) {
		var json = get_modis_af_style(req)
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'application/json');		
		res.send(json)
	},
	modis_af_legend: function(req, res) {
		var html = get_modis_af_legend(req)
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'text/html');		
		res.send(html)
	},
	modis_af_credits: function(req, res) {
		var str = get_modis_af_credits(req)
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'application/json');		
		res.send(str)
	}
}
