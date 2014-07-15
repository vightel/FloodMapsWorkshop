// Global Landslide script
// Pat Cappelaere - Vightel Corporation pat@cappelaere.com
//


	// array of selected elements
	var elts = [];

	function exportAll() {
		console.log( "exporting:" + elts.length )
		var form = $('#export_form')
		var input = $('#elts')
		input.val( JSON.stringify(elts))
		form.submit()
	}
	
	var map = L.mapbox.map('map', '<%= worldmapid %>', { minZoom:<%= region.min_zoom %>, maxZoom: <%= region.max_zoom %> })
    .setView([ 20, -80 ], <%= region.min_zoom %>);

	var markers = new L.MarkerClusterGroup({ chunkedLoading: true });

// load geojson
	$.ajax({
		type: 'GET',
		url: "<%= host %>/data/landslides",
		timeout: 10 * 1000,
		async: true
	})
	.success( function(data) {
		landslides = data.features
		console.log("received "+landslides.length)
		
		var landslideChart 		= dc.barChart("#monthly-landslide-chart");
		//var landslideBaseChart 	= dc.barChart("#landslide-base-chart");
		
		// Various formatters.
		var dateFormat 		= d3.time.format("%Y-%m-%d");
		var totalFatalities = 0;
		
		landslides.forEach(function(e) { 
			var dk_date 	= e.properties['date'];
			if( (dk_date == undefined) || (dk_date == 'null') || (dk_date == 'undefined')) {
				 dk_date="1970-01-00";
			 }
			e.dd 	= dateFormat.parse(dk_date); 
			e.month	= d3.time.month(e.dd) 	; // pre-calculate month for better performance
			
			var fatalities 	= parseInt(e.properties['fatalities'])
			
			if( isNaN(fatalities)) fatalities = 0
			
			e.fatalities 	= fatalities;
			//console.log(e.fatalities)
			totalFatalities += e.fatalities;
		});
				
		// Create the crossfilter for the relevant dimensions and groups.
		var ndx 	= crossfilter(landslides);
		var all 	= ndx.groupAll();
	
		var dateDimension = ndx.dimension(function (d) {
             return d.dd;
         });
		 
		// define a dimension
		var landslideByMonth = ndx.dimension(function(d) { return d.month; });

		// map/reduce to group sum
		var landslideByMonthGroup = landslideByMonth.group();
		var today = new Date()
		var year  = today.getFullYear() + 1
		
		landslideChart.width(750)
                    .height(140)
                    .margins({top: 0, right: 50, bottom: 20, left: 30})
                    .dimension(landslideByMonth)
                    .group(landslideByMonthGroup)
                    .centerBar(true)
                    .gap(1)
                    .x(d3.time.scale().domain([new Date(2007, 0, 1), new Date(year, 0, 1)]))
                    .round(d3.time.month.round)
                    .xUnits(d3.time.months)
					//.renderlet(function(landslideChart) {
					//	var groupAll = landslideChart.group().all();
					//	var data = {};
					//	console.log("renderlet landslideChart...", groupAll.length);
				        
					//	for (var i = 0; i < groupAll.length; ++i) {
					//	 	data[landslideChart.keyAccessor()(groupAll[i])] = landslideChart.valueAccessor()(groupAll[i]);
					//	}
					//	console.log(JSON.stringify(data))
					//})
		;
		
		//landslideBaseChart
        //	.dimension(landslideByMonth)
        //	.group(landslideByMonthGroup)
        //    .x(d3.time.scale().domain([new Date(2007, 0, 1), new Date(2013, 0, 1)]))
			
		dc.dataCount("#landslide-count")
		    .dimension(ndx) 	// set dimension to all data
		    .group(all)		 // set group to ndx.groupAll()
		;
		
		var fatalitiesChart 		= dc.barChart("#monthly-fatalities-chart");
		var fatalitiesByMonth 		= ndx.dimension(function(d) { return d.month; });
		
		// map/reduce to group sum of fatalities
		var fatalitiesByMonthGroup 	= fatalitiesByMonth.group().reduceSum( function(d) { return d.fatalities; });
		
		fatalitiesChart.width(750)
                    .height(140)
                    .margins({top: 0, right: 50, bottom: 20, left: 50})
                    .dimension(fatalitiesByMonth)
                    .group(fatalitiesByMonthGroup)
                    .centerBar(true)
                    .gap(1)
                    .x(d3.time.scale().domain([new Date(2007, 0, 1), new Date(year, 0, 1)]))
                    .round(d3.time.month.round)
                    .xUnits(d3.time.months)
		
		var landslides_fatalities_chart 	= dc.barChart("#landslides-fatalities-chart")
		var landslidesByFatalities			= ndx.dimension(function(d) { return d.fatalities; });
		// map/reduce to group sum of landslides
		var flandslidesByFatalitiesGroup 	= landslidesByFatalities.group()
		landslides_fatalities_chart.width(750)
                    .height(140)
                    .margins({top: 0, right: 50, bottom: 20, left: 50})
                    .dimension(landslidesByFatalities)
                    .group(flandslidesByFatalitiesGroup)
                    .centerBar(true)
					.gap(1)
					.x(d3.scale.linear().domain([1, 50]))

		dc.dataTable(".dc-data-table")
                 .dimension(dateDimension)
                 .group(function (d) {
                     //var format = d3.format("02d");
                     //return d.dd.getFullYear() + "/" + format((d.dd.getMonth() + 1));
					var format = d3.time.format("%B %Y")
					return "<b>"+format(d.dd)+"</b>"
                 })
                 .size(10)
                 .columns([
                     function (d) {
						var format = d3.time.format("%Y-%m-%d")
                         return format(d.dd);
                     },
                     function (d) {
                         return d.properties.id;
                     },
                     function (d) {
                         return d.geometry.coordinates;
                     },
                     function (d) {
                         return d.properties['trigger'];
                     },
                     function (d) {
                         return d.properties['fatalities'];
                     },
                     function (d) {
                         return d.properties['size_class'];
                     }
                 ])
                 .sortBy(function (d) {
                     return d.dd;
                 })
                 .order(d3.descending)
                 .renderlet(function (table) {
                     table.selectAll(".dc-table-group").classed("info", true);
                 });

		dc.dataMap = function(parent,chartGroup) {
			var _chart 	= dc.baseChart({});
			
		    _chart.doRender = function() {
				var entries = _chart.dimension().top(Infinity);
				console.log("render dataMap:", entries.length)
				totalFatalities = 0
				elts = entries.map( function(e) { 
					totalFatalities += e.fatalities;
					return e.properties.id;
				})
				
				console.log("fatalities:"+totalFatalities);
				$('#total-fatalities').html(totalFatalities)

		        map.removeLayer(markers);
				//map.clearLayers();
			    markers = new L.MarkerClusterGroup({ chunkedLoading: true });
				
				var geoJsonLayer = L.geoJson(entries, {
					onEachFeature: function (feature, layer) {
						var lon		= feature.geometry.coordinates[0]
						var lat 	= feature.geometry.coordinates[1]
						var link = "/img/landslide.png"
					
						var popupContent =  "<td><table><tr><td><img src='"+link+"' width=64 /></td>"+
											"<td><h4>Landslide Id:" + feature.properties['id'] + '</h4></td></tr>' +
											"<tr><td>Date:</td><td>"+feature.properties['date']+"</td></tr>" +
											"<tr><td>Trigger:</td><td>"+feature.properties['trigger']+"</td></tr>" +
											"<tr><td>Fatalities:</td><td>"+feature.properties['fatalities']+"</td></tr>" +
											"<tr><td>Location Accuracy:</td><td>"+feature.properties['location_accuracy']+"</td></tr>" +
											"<tr><td>Landslide Size:</td><td>"+feature.properties['landslide_size']+"</td></tr>" +
											"<tr><td>Storm Name:</td><td>"+feature.properties['storm_name']+"</td></tr>" +
											"<tr><td>Coords:</td><td> ["+feature.geometry.coordinates+"]</td></tr>" +
											"<tr><td>Link:</td><td><a href='"+feature.properties['source_link']+"'>here</a></td></tr>"+
											"<tr><td>All Info:</td><td><a href='/data/landslide/"+feature.properties['id']+"'>here</a></td></tr>"+
											"</table>"
						layer.bindPopup(popupContent);
					}
				});

				markers.addLayer(geoJsonLayer);
			    map.addLayer(markers);
		
				return _chart;
		    }
			_chart.doRedraw = function(){
				//console.log("redraw chart")
		        return _chart.doRender();
		    };

		    return _chart.anchor(parent, chartGroup);
		}
		
		dc.dataMap(".dc-data-map")
        .dimension(dateDimension)
        .group(all)
		//.renderlet(function (table) {
		//	var entries = table.group().value()
		//	console.log("dataMap", entries);
        // });

		dc.renderAll();
			

	
	})
	.fail(function(jqxhr, textStatus, error ) { 
		var err = textStatus + ', ' + error;
		console.log( "/data/landslides Request Failed: " + err);
	});