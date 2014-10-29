module.exports = {
	context: function(req, res) {  
		var host = req.host;
		
		res.header("Content-Type","application/json")
		
		// example
		// https://github.com/geojson/geojson-ld/blob/master/contexts/geojson-base.jsonld
		// https://github.com/geojson/geojson-ld/blob/master/contexts/geojson-time.jsonld
		// http://asjsonld.mybluemix.net
		
		var json = {
			"@context": {
				// defaults
				"as": 		"http://activitystrea.ms/2.0/",
				"xsd":  	"http://www.w3.org/2001/XMLSchema#",
				"geojson": 	"http://ld.geojson.org/vocab#",
				
				// tentative placeholder
				"geoss": 		"http://geoss.org/vocab#",
				
				// mine
				"ojo": 		host+"/vocab#",
				
				// OJO extensions
				// Product Properties
				
				source: {
					"@id": 		"ojo:source", 
					"@type":    "xsd:string",
					"@label": 	"xsd:string"
				},
				sensor: {
					"@id": 		"ojo:source", 
					"@type":    "xsd:string",
					"@label": 	"xsd:string"
				},
			
				date:{
					"@id": 		"ojo:source", 
					"@type":    "xsd:date",
					"@label": 	"xsd:string"
				},
				size:{
					"@id": 		"ojo:source", 
					"@type":    "as:NaturalLanguageValue",
					"@label": 	"xsd:string"
				},
				duration: {
					"@id": 		"ojo:duration",
					"@type":  	"as:NaturalLanguageValue",
					"@label": 	"xsd:string"
				},
				resolution: {
					"@id": 		"ojo:source", 
					"@type":    "as:NaturalLanguageValue",
					"@label": 	"xsd:string"
				},
				cloud: {
					"@id": 		"ojo:source", 
					"@type":    "xsd:float",
					"@label": 	"xsd:string"
				},
				copyright: {
					"@id": 		"ojo:source", 
					"@type":    "xsd:string",
					"@label": 	"xsd:string"
				}
			}
		}
		res.send(json)
	}
}