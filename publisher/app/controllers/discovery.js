var util		= require('util')

//var source_enum 	= cfg.sources;
var output_formats  = ['json', 'html', 'atom'];

var discover_feasibility_create = function() {
	var	create			= {
		"id": 			"radarsat.feasibility.create",
		"path": 		"sps/feasibilities",
		"httpMethod": 	"POST",
		"accept": 		"application/json",
		"mediaType":    "application/json",
		"description": 	"Create a new feasibility request for Radarsat-2 imaging in area of interest",
		"request": {
			"$ref":"FeasibilityEntry"
		},		
		"response": {
			"$ref":"Feasibilities"
		}
	}
	return create;	
}

var discover_task_get = function() {
	var	get			= {
		"id": 			"radarsat.tasks.get",
		"path": 		"sps/tasks/{id}.{fmt}",
		"httpMethod": 	"GET",
		"description": 	"Get specific (previously created) task",
		"parameters": {
			"id": {
				"type": 		"integer",
				"description": 	"Task id",
				"required": 	true,
				"location": 	"path"
			},
			"fmt": {
				"type": 		"string",
				"enum": 		output_formats, 
				"description": 	"output format",
				"required": 	false,
				"default": 		"json", 
				"location": 	"query"  
			},
		},
		"parametersOrder": [ "id", "fmt"],
		"response": {
			"$ref":"Task"
		}
	}
	return get;	
}

var discover_tasks_list = function() {
	var task_list = {
		"id": 			"radarsat.tasks.list",
		"path": 		"sps/tasks.{fmt}",
		"httpMethod": 	"GET",
		"description": 	"List all previously created tasks",
		"parameters": {
			"fmt": {
				"type": 		"string",
				"enum": 		output_formats, 
				"description": 	"output format",
				"required": 	false,
				"default": 		"json", 
				"location": 	"query"  
			}
		}
	}
	return task_list;
}

var discover_task_create = function() {
	var	post			= {
		"id": 			"radarsat.tasks:create",
		"path": 		"sps/tasks",
		"httpMethod": 	"POST",
		"description": 	"Creates a new task",
		"request": {
			"$ref":"TaskEntry"
		},
		"response": {
			"$ref":"Task"
		}
	}
	return post;
}

var discover_task_update = function() {
	var	update			= {
		"id": 			"radarsat.tasks:update",
		"path": 		"sps/tasks",
		"httpMethod": 	"PUT",
		"description": 	"Updates an existing task",
		"request": {
			"$ref":"TaskEntry"
		},
		"response": {
			"$ref":"Task"
		}
	}
	return update;	
}

var discover_task_delete = function() {
	var	del	= {
		"id": 			"radarsat.tasks:delete",
		"path": 		"sps/tasks/{id}",
		"httpMethod": 	"DELETE",
		"description": 	"Deletes an existing task",
		"parameters": {
			id: {
			"type": "integer",
			"description":"Task ID",
			"required": true,
			"location": "path"
			}
		}
	}
	return del;
}

var	discover_observations_list = function(){
	var list = {
		"id": 			"radarsat.observations:list",
		"path": 		"sos/observations",
		"httpMethod": 	"GET",
		"description": 	"List Observations",
		"request": {
			"$ref":"ObservationEntry"
		},
		"response": {
			"$ref":"Observation"
		}
	}
	return list;
}

var discover_observations_get = function() {
	var get = {
			"id": 			"radarsat.observations:get",
			"path": 		"sos/observations",
			"httpMethod": 	"GET",
			"description": 	"Get observation",
			"request": {
				"$ref":"ObservationEntry"
			},
			"response": {
				"$ref":"Observation"
			}
		}
	return get;
}
	
var discover_process_create = function() {
	var	post			= {
		"id": 			"radarsat.processes:create",
		"path": 		"wps/processes",
		"httpMethod": 	"POST",
		"description": 	"Creates a new process",
		"request": {
			"$ref":"ProcessEntry"
		},
		"response": {
			"$ref":"Process"
		}
	}
	return post;
}
var discover_process_get = function() {
	var	get			= {
		"id": 			"radarsat.processes:get",
		"path": 		"wps/processes/{id}.{fmt}",
		"httpMethod": 	"GET",
		"description": 	"Gets Process",
		"parameters": {
			"id": {
				"type": 		"integer",
				"description": 	"Process id",
				"required": 	true,
				"location": 	"path"
			},
			"fmt": {
				"type": 		"string",
				"enum": 		output_formats, 
				"description": 	"output format",
				"required": 	false,
				"default": 		"json", 
				"location": 	"query"  
			},
		},
		"parametersOrder": [ "id", "fmt"],
		"response": {
			"$ref":"Process"
		}
	}
	return get;
}
var discover_process_list = function() {
	var proc_list = {
		"id": 			"radarsat.processes.list",
		"path": 		"wps/processes.{fmt}",
		"httpMethod": 	"GET",
		"description": 	"List all previously created processes",
		"parameters": {
			"fmt": {
				"type": 		"string",
				"enum": 		output_formats, 
				"description": 	"output format",
				"required": 	false,
				"default": 		"json", 
				"location": 	"query"  
			}
		}
	}
	return proc_list;
}
var discover_process_delete = function() {
	var	del	= {
		"id": 			"radarsat.processes:delete",
		"path": 		"wps/processes/{id}",
		"httpMethod": 	"DELETE",
		"description": 	"Deletes an existing process",
		"parameters": {
			id: {
			"type": "integer",
			"description":"Process ID",
			"required": true,
			"location": "path"
			}
		}
	}
	return del;
}
module.exports = {
	tasks_list_schema: function() {
		var tasks_list = {
			"id": "TasksList",
			"type": "object",
			"properties": {
				"kind": {
					"type":"string",
					"description": "Type of resource. Always 'radarsat#tasksList'.",
					"default": "radarsat#tasksList",
					"required": 	true
				},
				"selfLink": {
					"type": "string",
					"description": "url of this data feed",
					"required": 	true
				},
				"etag": {
					"type": "string",
					"description": "ETag of the resource",
					"required": 	true
				},
				"updated": {
					"type": 		"date-time",
					"description":  "Last Updated Time",
					"required": 	true
				},
				"items": {
					"type": "array",
					"description": "Collection of Tasks",
					"items": {
						"$ref": "Task"
					}
				}			
			}
		}
		return tasks_list;
	},

	task_schema: function() {
		var task = {
			"id": 	"Task",
			"type": "object",
			"properties": {
				"id": {
					"type": "integer",
					"description": "Task Id",
				},
				"kind": {
					"type": "string",
					"description": "Type of the resource.  This is always 'radarsat#task'. ",
					"default": "radarsat#task",
				},
				"etag": {
					"type": "string",
					"description": "ETag of the resource",
				},
				"selfLink": {
					"type": "string",
					"description": "URL pointing to this task"
				},
				"createdAt": {
					"type": "date-time",
					"description": "Process Creation Time",
				},
				"updatedAt": {
					"type": "date-time",
					"description": "Process Last Updated Time",
				},
				"tags": {
					"type": "string",
					"description": "tags or categories associated by the user to that task",
				},
				"title": {
					"type": "string",
					"description": "short title of the task",
				},
				"description": {
					"type": "string",
					"description": "expanded description of that task",
				},
				"author": {
					"type": "object",
					"properties": {
						"name": {
							"type":"string"
						},
						"email":{
							"type":"string"
						}
					}
				},
				"date": {
					"type": "date",
					"description": "MODIS Acquisition Data",
				},
				"tile": {
					"type": "string",
					"description": "MODIS Tile to be returned",
				},
				"status": {
					"type": "string",
					"enum": ['created', 'started', 'completed', 'failed'],
					"description": "task status",
				},
				"error": {
					"type": "integer",
					"description": "error code (0 = no error)"
				},
				"error_msg": {
					"type": "string",
					"description": "error message if applicable"
				},
				"href": {
					"type": "string",
					"description": "link to output file (generated data product)"					
				},
				"mime_type": {
					"type": "string",
					"description": "mime-type of data product",
					"default": "application/atom+xml",									
				}
			}
		};
		return task;
	},
	
	task_entry_schema:  function( ) {
		var task = {
			"id": 	"TaskEntry",
			"type": "object",
			"properties": {
				"kind": {
					"type": "string",
					"description": "Type of the resource.  This is always 'radarsat#taskEntry'. ",
					"default": "radarsat#taskEntry",
					"required": 	true
				},
				"date": {
					"type": "date",
					"description": "Imaging date request",
					"required": 	true
				},
				"latitude": {
					"type": "float",
					"description": "latitude in decimal degrees",
					"required": 	true
				},
				"longitude": {
					"type": "float",
					"description": "longitude in decimal degrees",
					"required": 	true
				},
				"beamMode": {
					"type": "string",
					"description": "beam mode: wide | fine | ultra-fine",
					"enum": [ "wide", "fine", "ultra-fine"],
					"required": true
				},
				"polarization": {
					"type": "string",
					"description": "polarization: HH | VV | HH+VV",
					"enum": [ "HH", "VV", "HH+VV"],
					"required": true
				},
				"direction": {
					"type": "string",
					"description": "orbit direction: ascending | descending",
					"enum": [ "ascending", "descending"],
					"required": true
				}
			}
		};
		
		return task;
	},
	
	process_entry_schema:  function( ) {
		var proc = {
			"id": 	"ProcessEntry",
			"type": "object",
			"properties": {
				"kind": {
					"type": "string",
					"description": "Type of the resource.  This is always 'radarsat#processEntry'. ",
					"default": "radarsat#processEntry",
					"required": 	true
				},
				"scene": {
					"type": "string",
					"description": "Imaging scene",
					"required": 	true
				}
			}
		}		
		return proc;
	},
	
	process_schema:  function( ) {
	},
	
	processes_list_schema:  function( ) {
	},
	
	feasibility_entry_schema: function() {
			var feasibility = {
				"id": 	"FeasibilityEntry",
				"type": "Object",
				"properties": {
					"kind": {
						"type": "string",
						"description": "Type of the resource.  This is always 'radarsat#feasibilityEntry'. ",
						"default": "radarsat#feasibilityEntry",
						"required": 	true
					},
					"latitude": {
						"type":  		"float",
						"default": 		10.0,
						"description": "target latitude",
						"required": 	true
					},
					"longitude": {
						"type":  		"float",
						"default": 		10.0,
						"description":  "target longitude",
						"required": 	true
					},
					"swath": {
						"type": "string",
						"description": "prefered swath width: wide|medium|fine|ultra-fine",
						"enum": [ "wide", "medium", "fine", "ultra-fine" ],
						"default": "wide",
						"required": true
					},
					"spatial_resolution": {
						"type": "string",
						"description": "prefered spatial resolution: coarse|medium|high",
						"enum": [ "coarse", "medium", "high" ],
						"default": "coarse",
						"required": true
					},
					"day_night": {
						"type": "string",
						"description": "preferred observation time: day|night",
						"enum": [ "day", "night" ],
						"default": "day",
						"required": false
					}
				}
			};
			return feasibility;
	},
	feasibility_schema: function() {
			var feasibility = {
				"id": 	"Feasibility",
				"type": "Object",
				"properties": {
					"kind": {
						"type": "string",
						"description": "Type of the resource.  This is always 'radarsat#feasibility'. ",
						"default": "radarsat#feasibility",
						"required": 	true
					},
					"id": {
						"type":  		"integer",
						"description": "feasibility id",
						"required": 	true
					},
					"date": {
						"type":  		"date",
						"description": "start imaging time latitude",
						"required": 	true
					},
					"latitude": {
						"type":  		"float",
						"default": 		10.0,
						"description": "target latitude",
						"required": 	true
					},
					"longitude": {
						"type":  		"float",
						"default": 		10.0,
						"description":  "target longitude",
						"required": 	true
					},
					"swath": {
						"type": "string",
						"description": "prefered swath width: wide|medium|fine|ultra-fine",
						"enum": [ "wide", "medium", "fine", "ultra-fine" ],
						"default": "wide",
						"required": true
					},
					"spatial_resolution": {
						"type": "string",
						"description": "prefered spatial resolution: coarse|medium|high",
						"enum": [ "coarse", "medium", "high" ],
						"default": "coarse",
						"required": true
					},
					"day_night": {
						"type": "string",
						"description": "preferred observation time: day|night",
						"enum": [ "day", "night" ],
						"default": "day",
						"required": true
					},
					"links": {
						"type": "array",
						"description": "various links for that resource",
						"items": {
							$ref: "create_task_link_schema"
						}
					}
				}
			};
			return feasibility;
	},

	feasibilities_schema: function() {
		var feasibilities = {
			"id": 	"Feasibilities",
			"type": "Object",
			"properties": {
				"kind": {
					"type": "string",
					"description": "Type of the resource.  This is always 'radarsat#feasibilities'. ",
					"default": "radarsat#feasibilities",
					"required": 	true
				},
				"items": {
					"type": "array",
					"description": "Collection of feasibilities",
					"items": {
						$ref: "feasibility_schema"
					}
				}
			}
		};
		return feasibilities;
	},
	
	observation_entry_schema: function() {
			var coverage = {
				"id": 	"CoverageEntry",
				"type": "Object",
				"properties": {
					"kind": {
						"type": "string",
						"description": "Type of the resource.  This is always 'radarsat#task_entry'. ",
						"default": "radarsat#task_entry",
						"required": 	true
					},
					"start_date": {
						"type": "date",
						"description": "Modis start date request",
						"required": 	false
					},
					"end_date": {
						"type": "date",
						"description": "Modis end date request",
						"required": 	false
					},	
					"date": {
						"type": "date",
						"description": "Modis date request",
						"required": 	false
					},
					"tile": {
						"type": "string",
						"description": "MODIS tile",
						"required": 	true
					},
					"alt": {
						"type": "string",
						"description": "output format",
						"required": 	false
					}
				}
			};

			return coverage;
		},
	
	observation_list_schema: function() {
		
	},
	
	current_schema: function() {
		var d = {
			"kind": 			"discovery#restDescription",
			"id":				"radarsat:v1",
			"name":				"RADARSAT Flood Map Server",
			"version":			"v1",
			"title":			"NASA RADARSAT Flood Map Service",
			"description":		"Let's you request RADARSAT Flood Maps",
			"icons":			{ 'x16': server_url+"/images/sps_16.png",
								  'x32': server_url+"/images/sps_32.png" },
			"documentationLink": server_url+"/"+cfg.root_service+"/docs/overview.html",
			"labels":			['prototype'],
			"preferred":		true,
			"protocol":			"http",
			"basePath":			"/"+cfg.root_service+"/",
			"auth":				{ protocol: 'Hawk'},
			"schemas":			{
				"FeasibilityEntry":		module.exports.feasibility_entry_schema(),
				"Feasibilities": 		module.exports.feasibilities_schema(),
				"Task": 				module.exports.task_schema(), 
				"TaskEntry":  			module.exports.task_entry_schema(),
				"TaskList":  			module.exports.tasks_list_schema(),
				"ObservationEntry": 	module.exports.observation_entry_schema(),
				"ObservationList": 		module.exports.observation_list_schema(),
				"Process": 				module.exports.process_schema(),
				"ProcessEntry": 		module.exports.process_entry_schema(),
				"ProcessList": 			module.exports.processes_list_schema()
			},			
			"resources":  	{
				"Feasibilities": {
					"methods": 	{
						"create": 	discover_feasibility_create()
					}  
				},
				"Tasks": {
					"methods": {
						"get": 		discover_task_get(),
						"list":   	discover_tasks_list(),
						"create": 	discover_task_create(),
						"delete": 	discover_task_delete()
						//"update":  		discover_task_update() 
					}
				},
				"Observations": {
					"methods": {
						"list": 	discover_observations_list(),
						"get": 		discover_observations_get()
					}
				},
				"Processes": {
					"methods": {
						"create": 	discover_process_create(),
						"get": 		discover_process_get(),
						"list": 	discover_process_list(),
						"delete": 	discover_process_delete()
					}
				}
			}	
		};
		return d;	
	},
	
	v1: function(req, res) {
		var d = 	module.exports.current_schema();
		res.header('Content-Type', 'application/json; charset=utf-8');		
		res.send(d);
	},
	
	// most stable service discovery document
	index: function(req, res) {
		res.redirect('/'+cfg.root_service+'/discovery/v1');			
	}
};