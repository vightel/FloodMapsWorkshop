function get_radarsat2_credits(req) {
	var json = {
		"credits":  req.gettext("legend.radarsat2.credits"),
		"url": 		"http://oas.gsfc.nasa.gov/floodmap/",
	};
	return json;
}

function get_flood_style(req) {
	var json = {
		"true": {
			color: "#FF0000", 
			weight: 3
		}
	}
	return json
}

function get_radarsat2_floodmap_legend(req) {
	var html = "<style id='radarsat2_floodmap_legend_style' >"
    html += ".radarsat2_floodmap-info .legend-scale ul {"
    html += "   margin: 0;"
    html += "   margin-bottom: 5px;"
    html += "   padding: 0;"
    html += "   float: left;"
    html += "   list-style: none;"
    html += "   }"
	html += ".radarsat2_floodmap-info .legend-scale ul li {"
	html += "   font-size: 80%;"
	html += "   list-style: none;"
	html += "    margin-left: 0;"
	html += "    line-height: 18px;"
	html += "    margin-bottom: 2px;"
	html += "}"
    html += ".radarsat2_floodmap-info ul.legend-labels li span {"
    html += "  display: block;"
    html += "  float: left;"
    html += "  height: 16px;"
    html += "  width: 30px;"
    html += "  margin-right: 5px;"
    html += "  margin-left: 0;"
    html += "  border: 1px solid #999;"
    html += "}"
    html += ".radarsat2_floodmap-info .legend-source {"
    html += "   font-size: 70%;"
    html += "   color: #999;"
    html += "   clear: both;"
    html += "}"
	html += ".radarsat2_floodmap-info {"
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
	
	html += "<div id='radarsat2_floodmap_legend' class='radarsat2_floodmap-info'>"
	html += "  <div class='legend-title'>"+ req.gettext("legend.radarsat2.title")+"</div>"
	html += "  <div class='legend-scale'>"
	html += "    <ul class='legend-labels'>"
	html += "	   <li><span style='background: #FF0000'></span>&nbsp;"+ req.gettext("legend.radarsat2.legend") +"</li>"
	html += "    </ul>"
	html += "  </div>"
	html += "  <div class='legend-source'>"+ req.gettext("legend.radarsat2.source.label")+": <a href='http://gsfc.nasa.gov/'>"+ req.gettext("legend.radarsat2.source.source")+"</a>"
	html += "</div>&nbsp;&nbsp;"
	return html
}

module.exports = {
	radarsat2: function(req, res) {
		var style 	= get_flood_style(req);
		var html  	= get_radarsat2_floodmap_legend(req);
		var credits = get_radarsat2_credits(req);
		res.render("mapinfo/radarsat2", { style: style, html: html, credits: credits })
	},
	radarsat2_style: function(req, res) {
		var json = get_flood_style(req)
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'application/json');		
		res.send(json)
	},
	radarsat2_legend: function(req, res) {
		var html = get_radarsat2_floodmap_legend(req)
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'text/html');		
		res.send(html)
	},
	radarsat2_credits: function(req, res) {
		var str = get_radarsat2_credits(req)
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'application/json');		
		res.send(str)
	}
}