// Styjed TopoJSON-aware Leaflet layer

/*
You'll need something like this in your HTML:
<script src="http://d3js.org/topojson.v1.min.js"></script>
<script src="http://d3js.org/queue.v1.min.js"></script>
<script src="./js/dust-core.min.js"></script>
jquery
*/

/**
 * @see http://stackoverflow.com/q/7616461/940217
 * @return {number}
 */
function hashCode(str) {
    if (Array.prototype.reduce){
        return str.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
    } 
    var hash = 0;
    if (str.length === 0) return hash;
    for (var i = 0; i < str.length; i++) {
        var character  = str.charCodeAt(i);
        hash  = ((hash<<5)-hash)+character;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}

var styles 		= [];
var legends 	= {};
var credits 	= [];
var products	= {};

var hide_legends = 1;

function ToggleLegend() {
	console.log("TG "+ hide_legends)
	if( hide_legends == 1 ) {	// turn it on
		hide_legends = 0;
		for( var i in legends ) {
			if( legends[i].display ) {	// if layer is turned on
				//console.log("TG Show:"+legends[i].legend, i)
				$('#'+legends[i].legend).show();
			} //else {
			//	console.log("TG Not Show:"+legends[i].legend)
			//}
		}
	} else {					// turn it off
		hide_legends = 1
		for( var i in legends ) {
			//console.log("hide", legends[i].legend)
			$('#'+legends[i].legend).hide();
		}
	}
}

//
// Pre-Compile a style template using dust
//
function compileStyle( id, style ) {
	// check if style has already been compiled
	if( styles.indexOf(id) >=0 ) {
		return
	}
	
	// compile templates		
	for( var k in style) {
		var option	= id + "_" + k
		var compiled = dust.compile(k, option)
		dust.loadSource(compiled);
	}
	
	// add it to array
	styles.push(id)
}

//
// Load topojson from url
function loadDataUrl(url, cb) {
	$.ajax({
		type: 	'GET',
		url: 	url,
		async: 	true,
		dataType: 'json'
	})
	.done( function(data) {
		//console.log("Got data from "+url)
		cb(null, data)
	})
	.fail( function(qXHR, textStatus, errorThrown ) {
		console.log("Error getting "+url)
		cb(-1)
	})
}
//
// Load Mapinfo Object
//
function loadMapObject( mapObject, cb ) {
	if( mapObject === undefined )  return cb(null, null)
	if( mapObject.loaded == true ) return cb(null, mapObject)
	
	var id 		= mapObject['@id'];
	var name 	= mapObject.displayName;
	var url		=  mapObject.url
	
	//console.log("loadMapObject", id, url)
	
	$.ajax({
		url: 	url,
		method: mapObject.method
		//dataType: mapObject.mediaType
	})
	.done( function(data) {
		//console.log("success:"+id, name)
		
		switch(name) {
			case "style":
				var hc		= hashCode(url)
				compileStyle(hc, data);
				styles.push(url);			// to keep track of what has been loaded
				break;
			case "legend":
				// add it to the legend div
				var product = mapObject.product
				if( ! (product in legends) ) {
					//console.log("Product not in legend", product)
					$('#legends').append(data)
                	legends[product] = {legend: product+"_legend", display: true}
				}
				break;
			case "credits":
				credits.push(url)			// to keep track of what has been loaded
				break;
		}
		cb(null, data);
	})
	.fail( function(jqXHR, textStatus, errorThrown) {
		console.log("Error:"+textStatus+" "+id);
		cb(-1)
	});	
}

//
// Return matching style for feature with specific properties
//
function styleFeature( feature, id, style ) {
	if( !style ) {
		console.log("using default styling", id, JSON.stringify(feature.properties));
		return { color: '#ff0000', weight: 1 }
	}
	
	// find matching style
	var foundStyle = undefined;
	//console.log("style", JSON.stringify(style))
	//console.log("style", id)
	for( var k in style) {
		var option = id + "_" + k;
		dust.render(option, feature.properties, function(err, out) {
			try {
				//console.log("dust", err, out, option)
	
				var result = eval(out);
				if( result ) {
					var index = option.replace(id+"_", "");
					foundStyle = style[index];
					//console.log("styleFeature found", index, k)
				} else {
					//console.log("No match",out,k)
				}
			} catch(e) {
				console.log("Exception checking style:"+e);
				console.log("Err/out",err, out);
				console.log("props:"+JSON.stringify(feature.properties));
			}
		})
		if( foundStyle ) break;
	}
	return foundStyle;
}


function loadData( topojsonUrl, displayName, mapinfos ) {
	var legendObject, styleObject, creditObject;
	var styleId;
	
	//console.log("load data json:"+topojsonUrl);
	
	if( mapinfos ) {
		for( var el in mapinfos) {
			var map_el	= mapinfos[el]
			var name 	= map_el.displayName;
			var id		= map_el['@id'];
			var url		= map_el.url;
			var hc		= hashCode(url)
			
			switch( id ) {
				case "legend":
					legendObject 	= map_el;
					legendObject.id = hc;
					for( var i in legends) {
						if( legends[i].legend == hc ) {
							legendObject.loaded = true
							console.log("Legend already loaded for", hc, url)
							break;
						}
					}
					legendObject.loaded = false
					break;
				case "style":
					styleObject = map_el;
					styleId 	= hc
					//console.log("styleId", styleId)
					if( styles.indexOf(styleId) < 0 ) {
						styleObject.loaded = false
						//console.log("Style loaded for", styleId, url)
					} else {
						styleObject.loaded = true
						console.log("Style already loaded for", styleId, url)
					}
					break;
				case "credits":
					creditObject = map_el;
					if( credits.indexOf(url) >= 0 ) {
						creditObject.loaded = true
						console.log("Credits already loaded for", url)
					} else {
						creditObject.loaded = false
					}
					break;
			}
		}
	}
	
	queue()
    	.defer(loadDataUrl, topojsonUrl)
	    .defer(loadMapObject, styleObject)
    	.defer(loadMapObject, legendObject)
	    .defer(loadMapObject, creditObject)
	    .await(function(error, data, styleData, legendData, creditsData) { 
			//console.log("styledata", JSON.stringify(styleData))
			function loadGeoJson( geojson, key_name ) {
				var attribution=""
				if( creditsData ) {
					attribution = creditsData.credits;
				}
				
				var geoJsonLayer = L.geoJson(geojson, {
					style: function(feature) {
					 	return styleFeature( feature, styleId, styleData );
					},
					
					pointToLayer: function (feature, latlng) {
						var styleOptions = styleData['true'];
						//console.log("styleOptions", JSON.stringify(styleOptions))
						
						return L.circleMarker(latlng, 
							{
								radius: feature.properties[styleOptions.property]*styleOptions.scale,
								fillOpacity: styleOptions.fillOpacity,
								weight: styleOptions.weight,
								color: styleOptions.color
							});
								
					},
					onEachFeature: function(feature, layer) {
						var html = "<br/><table>"
						for( var i in feature.properties ) {
							var prop = feature.properties[i]
							if( prop && (typeof prop == 'string') && prop.indexOf("http:")>=0) {
								prop = "<a href='"+prop+"'>link</a>"
							}
							html += "<tr><td>"+i+":&nbsp; </td><td>"+ prop +"</td></tr>"
						}
						html += "</table"
						layer.bindPopup( html)
					},
					attribution: attribution
				})
			
				
				// Add to map
				geoJsonLayer.addTo(map)		
			
				// Add it to the Layer control widget
				var layerName = displayName;
				
				// Remember the layer to legend mapping if we have one
				if( legendObject ) {
					legends[layerName] = { legend: legendObject.id, display: true };
				}
				
				map_controls.addOverlay(geoJsonLayer, layerName)	
			}
			
			if( !error ) {
				// For Topojson
				for (var key in data.objects) {
					var geodata = topojson.feature(data, data.objects[key]);
					loadGeoJson(geodata, key)
				}
				// For GeoJSON
				if( (data.objects == undefined) && (data.type == "FeatureCollection")) {
					loadGeoJson(data, displayName)
				}
			} else {
				console.log("Error getting mapinfos")
			}
		});
}