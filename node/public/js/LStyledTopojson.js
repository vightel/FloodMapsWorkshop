// Styjed TopoJSON-aware Leaflet layer

/*
You'll need something like this in your HTML:
<script src="http://d3js.org/topojson.v1.min.js"></script>
<script src="http://d3js.org/queue.v1.min.js"></script>
<script src="./js/dust-core.min.js"></script>
jquery
*/


var styles 	= [];
var legends = {};
var credits = [];

var hide_legends = 1;

function ToggleLegend() {
	console.log("TG "+ hide_legends)
	if( hide_legends == 1 ) {	// turn it on
		hide_legends = 0;
		for( var i in legends ) {
			if( legends[i].display ) {	// if layer is turned on
				console.log("TG Show:"+legends[i].legend, i)
				$('#'+legends[i].legend).show();
			} else {
				console.log("TG Not Show:"+legends[i].legend)
			}
		}
	} else {					// turn it off
		hide_legends = 1
		for( var i in legends ) {
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
		var option		= id + "_" + k
		var compiled 	= dust.compile(k, option)
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
		dataType: "json"
	})
	.done( function(data) {
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
	
	//console.log("loadMapObject", mapObject.url)
	$.ajax({
		url: 	mapObject.url,
		method: mapObject.method
		//dataType: mapObject.mediaType
	})
	.done( function(data) {
		//console.log("success:"+id)
		switch(id) {
			case "style":
				compileStyle(id, data);
				styles.push(id);
				break;
			case "legend":
				// add it to the legend div
				$('#legends').append(data)
				break;
			case "credits":
				credits.push(id)
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
		console.log("using default styling");
		return { color: '#ff0000', weight: 1 }
	}
	
	// find matching style
	var foundStyle = undefined;
	
	for( var k in style) {
		var option = id + "_" + k;
		dust.render(option, feature.properties, function(err, out) {
			try {
				if( err ) console.log(err, out)
				var result = eval(out);
				if( result ) {
					var index = option.replace(id+"_", "");
					foundStyle = style[index];
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
	
	//console.log("load topojson:"+topojsonUrl);
	
	if( mapinfos ) {
		for( var el in mapinfos) {
			var map_el	= mapinfos[el]
			var name 	= map_el.displayName;
			var id		= map_el['@id'];
			//console.log("mapinfos", id)
			switch( id ) {
				case "legend":
					legendObject 	= map_el;
					legendObject.id = id;
					for( var i in legends) {
						if( legends[i].legend == id ) {
							legendObject.loaded = true
							break;
						}
					}
					legendObject.loaded = false
					break;
				case "style":
					styleObject = map_el;
					styleId 	= id
					if( styles.indexOf(id) < 0 ) {
						styleObject.loaded = false
					} else {
						styleObject.loaded = true
					}
					break;
				case "credits":
					creditObject = map_el;
					if( credits.indexOf(id) >= 0 ) {
						creditObject.loaded = true
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
			if( !error ) {
				//var topoJsonLayer = new L.TopoJSON(null)
				console.log("topojson loaded noErr")
				for (var key in data.objects) {
					console.log("topojson key:", key)
					
					var geodata = topojson.feature(data, data.objects[key]);
					var attribution=""
					if( creditsData ) {
						attribution = creditsData.credits;
					}
					
					var geoJsonLayer = L.geoJson(geodata, {
						style: function(feature) {
						 	return styleFeature( feature, styleId, styleData );
						},
						onEachFeature: function(feature, layer) {
							var html = "<br/><table>"
							for( var i in feature.properties ) {
								html += "<tr><td>"+i+":&nbsp; </td><td>"+feature.properties[i]+"</td></tr>"
								//console.log(i,feature.properties[i] )
							}
							html += "</table"
							layer.bindPopup( html)
						},
						attribution: attribution
					})
				
					
					// Add to map
					geoJsonLayer.addTo(map)		
				
					// Add it to the Layer control widget
					var layerName = key;
					
					// Remember the layer to legend mapping if we haveone
					if( legendObject ) {
						legends[layerName] = { legend: legendObject.id, display: true };
					}
					
					map_controls.addOverlay(geoJsonLayer, layerName)	
				}
			} else {
				console.log("Error getting mapinfos")
			}
		});
}