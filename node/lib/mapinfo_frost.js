function get_frost_style(req) {
	var json = {
		"{frost}==0": {
			color: "#FFFFFF", 	// no data
			weight: 3
		},
		"{frost}==1": {
			color: "#00FF00", 	// no frost
			weight: 1
		},
		"{frost}==2": {
			color: "#FF9900", 	// minor frost
			weight: 2
		},
		"{frost}==3": {
			color: "#FF0000", 	// moderate frost
			weight: 3
		},
		"{frost}==4": {
			color: "#FF99CC", 	// severe frost
			weight: 4
		},
		"{frost}==5": {
			color: "#9900FF", 	// very severe frost
			weight: 4
		}
	}
	return json
}

function get_frost_credits(req) {
	var json = {
		"credits":  req.gettext("legend.frost.credits"),
		"url": 		"http://oas.gsfc.nasa.gov/floodmap/",
	};
	console.log("frost credits", req.gettext("legend.frost.credits"))
	return json;
}

function get_frost_legend(req) {
	var html = "<style id='frost_legend_style' >"

    html += ".frost_map-info .legend-scale ul {"
    html += "   margin: 0;"
    html += "   margin-bottom: 5px;"
    html += "   padding: 0;"
    html += "   float: left;"
    html += "   list-style: none;"
    html += "   }"
	html += ".frost_map-info .legend-scale ul li {"
	html += "   font-size: 80%;"
	html += "   list-style: none;"
	html += "    margin-left: 0;"
	html += "    line-height: 18px;"
	html += "    margin-bottom: 2px;"
	html += "}"
    html += ".frost_map-info ul.legend-labels li span {"
    html += "  display: block;"
    html += "  float: left;"
    html += "  height: 16px;"
    html += "  width: 30px;"
    html += "  margin-right: 5px;"
    html += "  margin-left: 0;"
    html += "  border: 1px solid #999;"
    html += "}"
    html += ".frost_map-info .legend-source {"
    html += "   font-size: 70%;"
    html += "   color: #999;"
    html += "   clear: both;"
    html += "}"
	html += ".frost_map-info {"
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
	
	html += "<div id='frost_map_legend' class='frost_map-info'>"
	html += "  <div class='legend-title'>"+ req.gettext("legend.frost.title")+"</div>"
	html += "  <div class='legend-scale'>"
	html += "    <ul class='legend-labels'>"
	html += "	   <li><span style='background: #FFFFFF'></span>&nbsp;"+ req.gettext("legend.frost.legend.no_data") +"</li>"
	html += "	   <li><span style='background: #9900FF'></span>&nbsp;"+ req.gettext("legend.frost.legend.very_severe_frost") +"</li>"
	html += "	   <li><span style='background: #FF99CC'></span>&nbsp;"+ req.gettext("legend.frost.legend.severe_frost") +"</li>"
	html += "	   <li><span style='background: #FF0000'></span>&nbsp;"+ req.gettext("legend.frost.legend.severe_frost") +"</li>"
	html += "	   <li><span style='background: #FF9900'></span>&nbsp;"+ req.gettext("legend.frost.legend.moderate_frost") +"</li>"
	html += "	   <li><span style='background: #00FF00'></span>&nbsp;"+ req.gettext("legend.frost.legend.no_frost") +"</li>"
	html += "    </ul>"
	html += "  </div>"
	html += "<div class='legend-source'>"+ req.gettext("legend.frost.source.label")+": <a href='http://gsfc.nasa.gov/'>"+ req.gettext("legend.frost.source.source")+"</a>"
	html += "</div>&nbsp;&nbsp;"
	
	console.log("legend title", req.gettext("legend.frost.title"))
	
	return html
}

module.exports = {
	frost: function(req, res) {
		var style 	= get_frost_style(req);
		var html  	= get_frost_legend(req);
		var credits = get_frost_credits(req);
		res.render("mapinfo/frost", { style: style, html: html, credits: credits })
	},
	frost_style: function(req, res) {
		console.log("send frost style")
		var json = get_frost_style(req)
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'application/json');		
		res.send(json)
	},
	frost_legend: function(req, res) {
		console.log("send frost legend")
		var html = get_frost_legend(req)
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'text/html');		
		res.send(html)
	},
	frost_credits: function(req, res) {
		console.log("send frost credits")
		var str = get_frost_credits(req)
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'application/json');		
		res.send(str)
	}
}