function get_flood_forecast_credits(req) {
	var json = {
		"credits":  req.gettext("legend.flood_forecast.credits"),
		"url": 		"http://flash.ou.edu/namibia/",
	};
	return json;
}

function get_flood_forecast_style(req) {
	var json = {
		"{height}==1": {
			color: "#fee5d9", 	
			weight: 2
		},
		"{height}==2": {
			color: "#fcbba1", 	
			weight: 2
		},
		"{height}==3": {
			color: "#fc9272", 	
			weight: 2
		},
		"{height}==5": {
			color: "#fb6a4a", 	
			weight: 2
		},
		"{height}==8": {
			color: "#ef3b2c", 	
			weight: 2
		},
		"{height}==13": {
			color: "#cb181d", 	
			weight: 2
		},
		"{height}==21": {
			color: "#99000d", 	
			weight: 2
		}
	}
	return json
}

function get_flood_forecast_legend(req) {
	var html = "<style id='flood_forecast_legend_style' >"

    html += ".flood_forecast_map-info .legend-scale ul {"
    html += "   margin: 0;"
    html += "   margin-bottom: 5px;"
    html += "   padding: 0;"
    html += "   float: left;"
    html += "   list-style: none;"
    html += "   }"
	html += ".flood_forecast_map-info .legend-scale ul li {"
	html += "   font-size: 80%;"
	html += "   list-style: none;"
	html += "    margin-left: 0;"
	html += "    line-height: 18px;"
	html += "    margin-bottom: 2px;"
	html += "}"
    html += ".flood_forecast_map-info ul.legend-labels li span {"
    html += "  display: block;"
    html += "  float: left;"
    html += "  height: 16px;"
    html += "  width: 30px;"
    html += "  margin-right: 5px;"
    html += "  margin-left: 0;"
    html += "  border: 1px solid #999;"
    html += "}"
    html += ".flood_forecast_map-info .legend-source {"
    html += "   font-size: 70%;"
    html += "   color: #999;"
    html += "   clear: both;"
    html += "}"
	html += ".flood_forecast_map-info {"
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
	
	html += "<div id='flood_forecast_map_legend' class='flood_forecast_map-info'>"
	html += "  <div class='legend-title'>"+ req.gettext("legend.flood_forecast.title")+"</div>"
	html += "  <div class='legend-scale'>"
	html += "    <ul class='legend-labels'>"
	html += "	   <li><span style='background: #fee5d9'></span>&nbsp;"+ req.gettext("legend.flood_forecast.legend.1m") +"</li>"
	html += "	   <li><span style='background: #fcbba1'></span>&nbsp;"+ req.gettext("legend.flood_forecast.legend.2m") +"</li>"
	html += "	   <li><span style='background: #fc9272'></span>&nbsp;"+ req.gettext("legend.flood_forecast.legend.3m") +"</li>"
	html += "	   <li><span style='background: #fb6a4a'></span>&nbsp;"+ req.gettext("legend.flood_forecast.legend.5m") +"</li>"
	html += "	   <li><span style='background: #ef3b2c'></span>&nbsp;"+ req.gettext("legend.flood_forecast.legend.8m") +"</li>"
	html += "	   <li><span style='background: #cb181d'></span>&nbsp;"+ req.gettext("legend.flood_forecast.legend.13m") +"</li>"
	html += "	   <li><span style='background: #99000d'></span>&nbsp;"+ req.gettext("legend.flood_forecast.legend.21m") +"</li>"
	html += "    </ul>"
	html += "  </div>"
	html += "<div class='legend-source'>"+ req.gettext("legend.flood_forecast.source.label")+": <a href='http://flash.ou.edu/namibia/'>"+ req.gettext("legend.flood_forecast.source.source")+"</a>"
	html += "</div>&nbsp;&nbsp;"
	
	console.log("legend title", req.gettext("legend.flood_forecast.title"))
	
	return html
}

module.exports = {
	flood_forecast: function(req, res) {
		var style 	= get_flood_forecast_style(req);
		var html  	= get_flood_forecast_legend(req);
		var credits = get_flood_forecast_credits(req);
		res.render("mapinfo/flood_forecast", { style: style, html: html, credits: credits })
	},
	flood_forecast_style: function(req, res) {
		var json = get_flood_forecast_style(req)
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'application/json');		
		res.send(json)
	},
	flood_forecast_legend: function(req, res) {
		var html = get_flood_forecast_legend(req)
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'text/html');		
		res.send(html)
	},
	flood_forecast_credits: function(req, res) {
		var str = get_flood_forecast_credits(req)
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'application/json');		
		res.send(str)
	}
}
