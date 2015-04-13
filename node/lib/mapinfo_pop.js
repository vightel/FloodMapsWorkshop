function get_pop_credits(req) {
	var json = {
		"credits":  req.gettext("legend.population_count.credits"),
		"url": 		"http://web.ornl.gov/sci/landscan/",
	};
	return json;
}

var colors 			= [	"#f7f4f9", "#e7e1ef", "#d4b9da", "#c994c7", "#df65b0", "#e7298a", "#ce1256", "#980043", "#67001f"]

function get_pop_style(req) {
	var json = {
		"{population}==1000": {
			color: colors[0], 	
			weight: 2
		},
		"{population}==2000": {
			color: colors[1], 	
			weight: 2
		},
		"{population}==3000": {
			color: colors[2], 	
			weight: 2
		},
		"{population}==5000": {
			color: colors[3], 	
			weight: 2
		},
		"{population}==8000": {
			color: colors[4], 	
			weight: 2
		},
		"{population}==13000": {
			color: colors[5], 	
			weight: 2
		},
		"{population}==21000": {
			color: colors[6], 	
			weight: 2
		},
		"{population}==34000": {
			color: colors[7], 	
			weight: 2
		},
		"{population}==55000": {
			color: colors[8], 	
			weight: 2
		}
	}
	return json
}

function get_pop_legend(req) {
	var html = "<style id='pop_legend_style' >"
    html += ".pop_map-info .legend-scale ul {"
    html += "   margin: 0;"
    html += "   margin-bottom: 5px;"
    html += "   padding: 0;"
    html += "   float: left;"
    html += "   list-style: none;"
    html += "   }"
	html += ".pop_map-info .legend-scale ul li {"
	html += "   font-size: 80%;"
	html += "   list-style: none;"
	html += "    margin-left: 0;"
	html += "    line-height: 18px;"
	html += "    margin-bottom: 2px;"
	html += "}"
    html += ".pop_map-info ul.legend-labels li span {"
    html += "  display: block;"
    html += "  float: left;"
    html += "  height: 16px;"
    html += "  width: 30px;"
    html += "  margin-right: 5px;"
    html += "  margin-left: 0;"
    html += "  border: 1px solid #999;"
    html += "}"
    html += ".pop_map-info .legend-source {"
    html += "   font-size: 70%;"
    html += "   color: #999;"
    html += "   clear: both;"
    html += "}"
	html += ".pop_map-info {"
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
	
	html += "<div id='pop_map_legend' class='pop_map-info'>"
	html += "  <div class='legend-title'>"+ req.gettext("legend.population_count.title")+"</div>"
	html += "  <div class='legend-scale'>"
	html += "    <ul class='legend-labels'>"
	html += "	   <li><span style='background: " + colors[0] + "'></span>&nbsp;"+ req.gettext("legend.population_count.legend.1000") +"</li>"
	html += "	   <li><span style='background: " + colors[1] + "'></span>&nbsp;"+ req.gettext("legend.population_count.legend.2000") +"</li>"
	html += "	   <li><span style='background: " + colors[2] + "'></span>&nbsp;"+ req.gettext("legend.population_count.legend.3000") +"</li>"
	html += "	   <li><span style='background: " + colors[3] + "'></span>&nbsp;"+ req.gettext("legend.population_count.legend.5000") +"</li>"
	html += "	   <li><span style='background: " + colors[4] + "'></span>&nbsp;"+ req.gettext("legend.population_count.legend.8000") +"</li>"
	html += "	   <li><span style='background: " + colors[5] + "'></span>&nbsp;"+ req.gettext("legend.population_count.legend.13000") +"</li>"
	html += "	   <li><span style='background: " + colors[6] + "'></span>&nbsp;"+ req.gettext("legend.population_count.legend.21000") +"</li>"
	html += "	   <li><span style='background: " + colors[7] + "'></span>&nbsp;"+ req.gettext("legend.population_count.legend.34000") +"</li>"
	html += "	   <li><span style='background: " + colors[8] + "'></span>&nbsp;"+ req.gettext("legend.population_count.legend.55000") +"</li>"
	html += "    </ul>"
	html += "  </div>"
	html += "<div class='legend-source'>"+ req.gettext("legend.population_count.source.label")+": <a href='http://web.ornl.gov/sci/landscan/'>"+ req.gettext("legend.population_count.source.source")+"</a>"
	html += "</div>&nbsp;&nbsp;"
		
	return html
}

module.exports = {
	pop: function(req, res) {
		var style 	= get_pop_style(req);
		var html  	= get_pop_legend(req);
		var credits = get_pop_credits(req);
		res.render("mapinfo/pop", { style: style, html: html, credits: credits })
	},
	pop_style: function(req, res) {
		var json = get_pop_style(req)
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'application/json');		
		res.send(json)
	},
	pop_legend: function(req, res) {
		var html = get_pop_legend(req)
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'text/html');		
		res.send(html)
	},
	pop_credits: function(req, res) {
		var str = get_pop_credits(req)
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'application/json');		
		res.send(str)
	}
}
