function get_trmm_credits(req) {
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

function get_trmm_style(req) {
	var json = {
		"{daily_precipitation}==10": {
			color: colors[0], 	
			weight: 2
		},
		"{daily_precipitation}==20": {
			color: colors[1], 	
			weight: 2
		},
		"{daily_precipitation}==30": {
			color: colors[2], 	
			weight: 2
		},
		"{daily_precipitation}==50": {
			color: colors[3], 	
			weight: 2
		},
		"{daily_precipitation}==80": {
			color: colors[4], 	
			weight: 2
		},
		"{daily_precipitation}==130": {
			color: colors[5], 	
			weight: 2
		},
		"{daily_precipitation}==210": {
			color: colors[6], 	
			weight: 2
		},
		"{daily_precipitation}==340": {
			color: colors[7], 	
			weight: 2
		},
		"{daily_precipitation}==550": {
			color: colors[8], 	
			weight: 2
		},
		"{daily_precipitation}==890": {
			color: colors[9], 	
			weight: 2
		},
		"{daily_precipitation}==1440": {
			color: colors[10], 	
			weight: 2
		}
	}
	return json
}

function get_trmm_legend(req) {
	var html = "<style id='trmm_legend_style' >"
    html += ".trmm_map-info .legend-scale ul {"
    html += "   margin: 0;"
    html += "   margin-bottom: 5px;"
    html += "   padding: 0;"
    html += "   float: left;"
    html += "   list-style: none;"
    html += "   }"
	html += ".trmm_map-info .legend-scale ul li {"
	html += "   font-size: 80%;"
	html += "   list-style: none;"
	html += "    margin-left: 0;"
	html += "    line-height: 18px;"
	html += "    margin-bottom: 2px;"
	html += "}"
    html += ".trmm_map-info ul.legend-labels li span {"
    html += "  display: block;"
    html += "  float: left;"
    html += "  height: 16px;"
    html += "  width: 30px;"
    html += "  margin-right: 5px;"
    html += "  margin-left: 0;"
    html += "  border: 1px solid #999;"
    html += "}"
    html += ".trmm_map-info .legend-source {"
    html += "   font-size: 70%;"
    html += "   color: #999;"
    html += "   clear: both;"
    html += "}"
	html += ".trmm_map-info {"
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
	
	html += "<div id='trmm_map_legend' class='trmm_map-info'>"
	html += "  <div class='legend-title'>"+ req.gettext("legend.daily_precipitation.title")+"</div>"
	html += "  <div class='legend-scale'>"
	html += "    <ul class='legend-labels'>"
	html += "	   <li><span style='background: " + colors[0] + "'></span>&nbsp;"+ req.gettext("legend.daily_precipitation.legend.10mm") +"</li>"
	html += "	   <li><span style='background: " + colors[1] + "'></span>&nbsp;"+ req.gettext("legend.daily_precipitation.legend.20mm") +"</li>"
	html += "	   <li><span style='background: " + colors[2] + "'></span>&nbsp;"+ req.gettext("legend.daily_precipitation.legend.30mm") +"</li>"
	html += "	   <li><span style='background: " + colors[3] + "'></span>&nbsp;"+ req.gettext("legend.daily_precipitation.legend.50mm") +"</li>"
	html += "	   <li><span style='background: " + colors[4] + "'></span>&nbsp;"+ req.gettext("legend.daily_precipitation.legend.80mm") +"</li>"
	html += "	   <li><span style='background: " + colors[5] + "'></span>&nbsp;"+ req.gettext("legend.daily_precipitation.legend.130mm") +"</li>"
	html += "	   <li><span style='background: " + colors[6] + "'></span>&nbsp;"+ req.gettext("legend.daily_precipitation.legend.210mm") +"</li>"
	html += "	   <li><span style='background: " + colors[7] + "'></span>&nbsp;"+ req.gettext("legend.daily_precipitation.legend.340mm") +"</li>"
	html += "	   <li><span style='background: " + colors[8] + "'></span>&nbsp;"+ req.gettext("legend.daily_precipitation.legend.550mm") +"</li>"
	html += "	   <li><span style='background: " + colors[9] + "'></span>&nbsp;"+ req.gettext("legend.daily_precipitation.legend.890mm") +"</li>"
	html += "	   <li><span style='background: " + colors[10] + "'></span>&nbsp;"+ req.gettext("legend.daily_precipitation.legend.1440mm") +"</li>"
	html += "    </ul>"
	html += "  </div>"
	html += "<div class='legend-source'>"+ req.gettext("legend.daily_precipitation.source.label")+": <a href='http://trmm.nasa.gov/'>"+ req.gettext("legend.daily_precipitation.source.source")+"</a>"
	html += "</div>&nbsp;&nbsp;"
	
	console.log("legend title", req.gettext("legend.daily_precipitation.title"))
	
	return html
}

module.exports = {
	trmm: function(req, res) {
		var style 	= get_trmm_style(req);
		var html  	= get_trmm_legend(req);
		var credits = get_trmm_credits(req);
		res.render("mapinfo/trmm", { style: style, html: html, credits: credits })
	},
	trmm_style: function(req, res) {
		var json = get_trmm_style(req)
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'application/json');		
		res.send(json)
	},
	trmm_legend: function(req, res) {
		var html = get_trmm_legend(req)
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'text/html');		
		res.send(html)
	},
	trmm_credits: function(req, res) {
		var str = get_trmm_credits(req)
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'application/json');		
		res.send(str)
	}
}
