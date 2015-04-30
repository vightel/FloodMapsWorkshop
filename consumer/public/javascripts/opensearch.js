// Request latest product available


function loadOpenSearchData( topojsonUrl, displayName, mapinfos, map, addIt, legends, product, cb ) {
	var legendObject, styleObject, creditObject;
	var styleId;
	
	console.log("load topojson:"+topojsonUrl, displayName);
	
	if( mapinfos ) {
		for( var el in mapinfos) {
			var map_el		= mapinfos[el]
			var name 		= map_el.displayName;
			var id			= map_el['@id'];
			var url			= map_el.url;
			var hc			= hashCode(url)
			
			console.log("mapinfo", name)
			switch( name ) {
				case "legend":
					legendObject 		= map_el;
					legendObject.id 	= hc;
					legendObject.loaded = false
					legendObject.product= product
					
					if( hc in legends) {
						legendObject.loaded = true
					}
					break;
					
				case "style":
					styleObject 		= map_el;
					styleId 			= hc
					styleObject.loaded 	= false
					styleObject.product	= product

					if( hc in styles ) {
						styleObject.loaded 	= true
						styleObject.data 	= styles[hc]
					} 
					break;
					
				case "credits":
					creditObject 		= map_el;
					creditObject.loaded = false
					if( id in credits  ) {
						creditObject.loaded = true
					}
					break;
			}
		}
	}
	
	var q = queue()
		.defer(loadDataUrl, 	topojsonUrl)
		.defer(loadMapObject, 	styleObject)
		.defer(loadMapObject, 	legendObject)
		.defer(loadMapObject, 	creditObject)
		.await(function(error, data, styleData, legendData, creditsData) { 
			console.log("await done", error)
			if( !error ) {
				var layerArray = []

				for (var key in data.objects) {
					var geodata 	= topojson.feature(data, data.objects[key]);
					var attribution	= ""
					if( creditsData ) {
						attribution = creditsData.credits;
					}
					
					var layer;
					if( geodata.type == "FeatureCollection") {
						$("#features").append(legendObject.product+":"+geodata.features.length+" features<br/>")
						legendObject.items = geodata.features.length
						layer = L.geoJson(geodata, {
							style: function(feature) {
							 	return styleFeature( feature, styleId, styleData );
							},
							onEachFeature: function(feature, layer) {
								var html = "<br/><table>"
								for( var i in feature.properties ) {
									html += "<tr><td>"+i+":&nbsp; </td><td>"+feature.properties[i]+"</td></tr>"
								}
								html += "</table"
								layer.bindPopup( html)
							},
							attribution: attribution
						})
					} else {
						layer 		= L.geoJson();
						key			= "No Features!"
						displayName	= product
						$("#features").append(legendObject.product+": No features<br/>")
					}
					
					// Add legend to the div                    
					//$("#legends").append( legendData )
					//legends[key] = {legend: product+"_legend", display: addIt}
					
					console.log("Add Product", displayName, " as ", product)
					products[displayName] = product
					
					if( addIt) {
					    // Add to map
					    console.log("add layer to map", layer)
					    layer.addTo(map)		
					} else {
					    // console.log("hide legend", product, legends[product].legend)
						$("#"+legends[product].legend).hide()
						legends[product].display = false
					}
					
					// Add it to the Layer control widget
					var layerName = key;
					
					// Remember the layer to legend mapping if we haveone
					//if( legendObject ) {
					//	legends[layerName] = { legend: legendObject.id, display: true };
					//}
					
					//var credits = L.control.attribution().addTo(map);
					//console.log("credits:", JSON.stringify(creditsData))
					var creditsHtml = ""
					if( creditsData ) {
						creditsHtml = "<a href='"+creditsData.url+"'>"+creditsData.credits+"</a>"
					}
					//credits.addAttribution(html);
					
					//var legendControl = map.addControl(L.mapbox.legendControl());
					//legendControl.addLegend(legendData)
					
					//map_controls.addOverlay(geoJsonLayer, layerName)	
					//cb(layer, legendData, creditsHtml);
					layerArray.push(layer)
				}
				cb(layerArray, legendData, creditsHtml);
			} else {
				console.log("Error getting mapinfos")
			}
		});
}

// inputs:
//      product and layer to use
//
function opensearch( fbAppId, fbAccessToken, region, email, product, source, scope_layer, mapControl, addIt, legends ) {
	// get a date range
	var endTime 	= moment();
	var startTime	= moment().subtract( 'days', 30)
	 
    var bot = region.ojobot
	var url = bot + "/opensearch?q="+product
    
	url += "&lat="+region.target[1]
	url += "&lon="+region.target[0]
	url += "&sources="+source
	url += "&startTime="+startTime.format("YYYY-MM-DD")
	url += "&endTime="+endTime.format("YYYY-MM-DD")
	url	+= "&limit=1"
	
	var credentials = {
		id:  		fbAppId,
		key: 		fbAccessToken,
		algorithm: 'sha256'
	}
	
	console.log("Opensearch", url, email)
	
    var header 	= hawk.client.header(url, 'GET', { credentials: credentials, ext: email });
	var headers = {'Authorization': header.field }
			
	$.ajax({
		type: 		'GET', 
		url: 		url, 
		headers: 	headers,
		async: 		false, 
		timeout: 	20000,
		dataType:   'json'
	})
	.success( function(data) {
		console.log("opensearch items:", data.items.length)
		if( data.items.length == 1) {
			var item 		= data.items[0]
			var id			= item["@id"]
			var url 		= undefined
			var mapinfos	= undefined
			
			for( var i in item.action) {
				var action = item.action[i]
				if(action['@type'] == 'ojo:download'){
					for(var u in action.using ) {
						if( action.using[u].mediaType == "application/json") {
							url = action.using[u].url
						}
					}
				} else if( action['@type'] == 'ojo:map') {
					mapinfos 	= action.using;	
				}
			}
		
			if( !url ) {
				console.log("Could not find topojson file to download!")
				return;
			}
		
			console.log("loadOpenSearchData", id, product, url)
			
			//loadOpenSearchData( url, id, mapinfos, map, addIt, legends, product, function(layer, legend, credits) {
			//	console.log("setting Opensearch layer", scope_layer.name, id, product)
			//	scope_layer.name 	= id;
			//	scope_layer.layer 	= layer;
			//	scope_layer.credits = credits;
			//	scope_layer.legend	= legend;
                
            //    for( var l in layer ) {
            //        mapControl.addOverlay(layer[l], scope_layer.name)
            //    }
			//});
			loadData( url, id, mapinfos)
		}
	})
	.fail( function(jqxhr, textStatus, error ) { 
		var err = textStatus + ', ' + error;
		console.log( "Request Failed: " + err);
	});
}

function changeLayer( product, scope_layer) {
	scope_layer.checked = !scope_layer.checked
	if( scope_layer.checked ) {
		if( scope_layer.layer == undefined ) {
			opensearch( product, scope_layer  ) 
		} else {
			// show it
            map.addLayer(scope_layer.layer);
		}
	} else {
		// hide it
		if( scope_layer.layer != undefined ) {
        	map.removeLayer(scope_layer.layer);
		}
	}
}
