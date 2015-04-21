var util 		= require('util'),
	fs			= require('fs'),
	async	 	= require('async'),
	path		= require('path'),
	moment		= require('moment'),
	_			= require('underscore'),
	mime		= require('mime-types'),
	Hawk		= require('hawk'),
	filesize 	= require('filesize'),
	mkdirp		= require("mkdirp"),
	query_s3	= require('../lib/query_s3'),
	debug		= require('debug')('s3')
	;
		
	function padDoy( doy ) {
		if( doy < 10 ) {
			doy = "00"+doy
		} else if( doy < 100 ) {
			doy = "0"+doy
		}
		return doy
	}
	
	function InBBOX( lat, lon, bbox) {
		if( (lat > bbox[1]) && (lat< bbox[3]) && (lon > bbox[0]) && (lon < bbox[2]) ) return true;
		return false
	}
	
	// Find Region that would match that Lat/Lon
	function FindRegionKey(lat, lon) {
		var regions = app.config.regions
		for( var r in regions ) {
			var region = regions[r]
			if( r != "Global") {
				if( InBBOX(lat, lon, region.bbox)) {
					return r
				}
			}
		}
		return undefined
	}
	
	var Query = function( options ) {
		this.options 		= options
		this.bucketList 	= {}
		
		//assert( this.options.style )
		//assert( this.options.credits )
		//assert( this.options.legend )
		//assert( this.options.bucket )
		//assert( this.options.subfolder )
	}
	
	//
	// List all objects in bucket/subfolder
	//
	Query.prototype.ListObjects = function( bucket, next) {
		var slf = this
		
		// Get a list of all objects in that bucket's subfolder (WARNING: limit=1000)
		var params = {
			Bucket: bucket || slf.options.bucket,
			Prefix: slf.options.subfolder
		};
		//console.log("params", params)
		app.s3.listObjects(params, function(err, data) {
			if (err) {
				logger.error(err, err.stack); 	// an error occurred
				next(err)
			} else {
				//console.log(data);				// successful response
			
				slf.bucketList = {}
				
				var contents 	= data.Contents
				_.each(data.Contents, function(elt) {
					var size 	= elt.Size
					var arr		= elt.Key.split("/")
					var name	= _.last(arr)
					var key		= elt.Key.replace(name, "")
				
					//console.log("found key", key)
				
					if( slf.bucketList[key] != undefined ) {
						slf.bucketList[key].push( { key: name, size: size } )
					} else {
						slf.bucketList[key] = [ { key: name, size: size } ]
						//console.log("added to key", key, name)
					}					
				})
				//console.log( JSON.stringify(slf.bucketList))
				next(null)
			}    
		});
	}
	
	//
	// Check if we have current list of object in bucket
	// if not, get it
	//
	Query.prototype.CheckEmptyBucketList = function(bucket, next) {
		if( _.isEmpty(this.bucketList)) {
			//console.log("Empty Bucket...")
			this.ListObjects(bucket, next)
		} else {
			next()
		}
	}
	
	Query.prototype.QueryByID = function(req, user, year, doy, regionKey, credentials, cb ) {
		var date			= moment(year+"-"+doy)
		var duration		= 60 * 30
		var id				= this.options.subfolder + "_" + year.toString() + doy
		var host 			= "http://" + req.headers.host
		var bucket			= app.config.regions[regionKey].bucket
		
		function Bewit(url) {
			if( credentials ) {
				var bewit = Hawk.uri.getBewit(url, { credentials: credentials, ttlSec: duration, ext: user.email })
				url += "?bewit="+bewit
			} 
			return url;
		}
		
		var jday	= date.dayOfYear()
		if( jday < 10 ) {
			jday = "00"+jday
		} else if( jday < 100 ) jday = "0"+jday
		
		var month 	= date.month() + 1
		if( month < 10 ) month = "0"+ month

		var day		= date.date();
		if( day < 10 ) day = "0"+day
			
		var key 	=  this.options.subfolder + "/" + date.year() + "/" + doy + "/"
		
		var entry 	= undefined
		var self	= this
			
		function checkIfProductInBucketList(next) {
			self.CheckIfProductInBucketList(req, key, year, month, day, jday, id, Bewit, regionKey, function(err, data) {
				entry = data
				next(err)
			})
		}
		
		function checkEmptyBucket(next) {
			self.CheckEmptyBucketList(bucket, next)
		}
		
		async.series([ 
			checkEmptyBucket,
			checkIfProductInBucketList
		], function(err) {
			return cb(err, entry)
		})
	}
	
	Query.prototype.CheckRequestedDay = function( req, user, d, startTime, endTime, credentials, regionKey, entries, cb  ) {
		var time			= endTime.clone()
		time	 			= time.subtract(d, "days");
	
		var year 			= time.year();
		var doy  			= padDoy(time.dayOfYear());
			
		this.QueryByID(req, user, year, doy, regionKey, credentials, function(err, entry) {
			if( entry ) entries.push(entry)
			cb(null)
		})
	}

	Query.prototype.CheckIfProductInBucketList = function(req, key, year, month, day, jday, id, Bewit, regionKey, next) {
		if( this.bucketList[key] != undefined ) {				
			var artifacts			= this.bucketList[key]
			var host 				= "http://" + req.headers.host
			var date				= moment(year+"-"+jday)
			var bucket				= app.config.regions[regionKey].bucket
			
			var s3host				= "https://s3.amazonaws.com/"+bucket +"/"+ this.options.subfolder+"/"+year+"/"+jday + "/"
			var browse_img			= _.find(artifacts, function(el) { 
											return el.key.indexOf("_thn.jpg") > 0 
										}).key
			
			var downloads = []
			
			// local host cache for S3
			var s3proxy				= host+'/products/s3/'+regionKey+"/"+ this.options.subfolder+"/"+year+"/"+jday + "/"
			
			function checkFilePresent( subfolder, ftype, mediaType, format, fmt ) {
				if(ftype) {
					try {						
						var obj  =  _.find(artifacts, function(el) { 
							return el.key.indexOf(fmt) > 0
						})
						
						var fkey = obj.key
						var size = obj.size
						//console.log(fkey, size)
						
						var download_file = {
							"@type": 		"as:HttpRequest",
							"method": 		"GET",
							"mediaType": 	mediaType,
							"url": 			Bewit(s3proxy+ fkey),
							"size": 		filesize( size, {round:2, suffixes: {
												"B": req.gettext("filesize.B"), 
												"kB": req.gettext("filesize.KB"), 
												"MB": req.gettext("filesize.MB"), 
												"GB": req.gettext("filesize.GB"), 
												"TB": req.gettext("filesize.TB")}}),
							"displayName": 	req.gettext(format)
						}
						downloads.push(download_file)
					} catch(e) {
						logger.error("could not find size of", fkey)
					}
				}
			}
			
			checkFilePresent( this.options.subfolder, this.options.geojson, 	"application/json", 	"formats.geojson", 		".geojson" )
			checkFilePresent( this.options.subfolder, this.options.geojsongz, 	"application/gzip", 	"formats.geojsongz", 	".geojson.gz" )
			checkFilePresent( this.options.subfolder, this.options.topojson_gz, "application/gzip", 	"formats.topojsongz", 	".topojson.gz" )
			checkFilePresent( this.options.subfolder, this.options.topojson, 	"application/json",		"formats.topojson", 	".topojson" )
			checkFilePresent( this.options.subfolder, this.options.shape_gz, 	"application/gzip", 	"formats.shpgz", 		".shp.gz" )
			checkFilePresent( this.options.subfolder, this.options.geotiff, 	"application/tiff", 	"formats.geotiff", 		".tif" )
		
			actions = [
				{ 
					"@type": 			"ojo:browse",
					"displayName": 		req.gettext("actions.browse"),
					"using": [{
						"@type": 		"as:HttpRequest",
						"method": 		"GET",
						"url": 			Bewit(host+"/products/"+ this.options.subfolder+"/browse/"+regionKey+"/"+year+"/"+jday),
						"mediaType": 	"html"
					}]
				},
				{
					"@type": 			"ojo:download",
					"displayName": 		req.gettext("actions.download"),
					"using": 			downloads
					
				},
				{
					"@type": 			"ojo:map",
					"displayName": 		req.gettext("actions.map"),
					"using": [
						{
							"@type": 		"as:HttpRequest",
							"method": 		"GET",
							"@id": 			"legend",
							"url": 			host+"/mapinfo/"+this.options.subfolder+"/legend",
							"mediaType": 	"text/html",
							"displayName": 	req.gettext("mapinfo.legend")
						},
						{
							"@type": 		"as:HttpRequest",
							"method": 		"GET",
							"@id": 			"style",
							"url": 			host+"/mapinfo/"+this.options.subfolder+"/style",
							"mediaType": 	"application/json",
							"displayName": 	req.gettext("mapinfo.style")
						},
						{
							"@type": 		"as:HttpRequest",
							"method": 		"GET",
							"@id": 			"credits",
							"url": 			host+"/mapinfo/"+this.options.subfolder+"/credits",
							"mediaType": 	"application/json",
							"displayName": 	req.gettext("mapinfo.credits")
						}
					]
				}
			]
		
			var source 		= req.gettext(this.options.source)
			var sensor 		= req.gettext(this.options.sensor)
			var url 		= this.options.original_url

			var properties = {
				"source": {
					"@label": req.gettext("properties.source"),
					"@value": source
				},
				"url": {
					"@label": req.gettext("properties.url"),
					"@value": url
				},
				"sensor": {
					"@label": req.gettext("properties.sensor"),
					"@value": sensor
				},
				"date": {
					"@label": req.gettext("properties.date"),
					"@value": date.format(req.gettext("formats.date"))
				},
				"resolution": {
					"@label": req.gettext("properties.resolution"),
					"@value": this.options.resolution
				}
			}
			var bbox = app.config.regions[regionKey].bbox
			var entry = {
				"@id": 			id,
				"@type": 		"geoss:"+this.options.product,
				"displayName": 	id,
				"image": 		[ 
									{
										"url": s3host+browse_img,
										"mediaType": "image/png",
										"rel": "browse"
									}
								],
				"properties": 		properties,
				"geometry": {
					"type": "Polygon",
					"coordinates": [[
						[bbox[0], bbox[1]],
						[bbox[0], bbox[3]],
						[bbox[2], bbox[3]],
						[bbox[2], bbox[1]],
						[bbox[0], bbox[1]]
					]]
				},
				"action": 			actions
			}
			//console.log(JSON.stringify(entry))
			next(null, entry)
		} else {
			//console.log("not found", key)
			next(null, null)
		}
	}
	
	Query.prototype.QueryAll = function(req, user, credentials, host, query, bbox, lat, lon, startTime, endTime, startIndex, itemsPerPage, limit, cb ) {
		var product 	= this.options.product
		var subfolder	= this.options.subfolder
		var tags	 	= this.options.tags
		 
		if( tags.indexOf(query) < 0 ) {
			console.log("unsupported S3 query", query)
			return cb(null, null)
		}
	
		if( startTime && !startTime.isValid()) {
			logger.error("Invalid start time: "+ startTime)
			return cb(null, null)
		}
	
		if( endTime && !endTime.isValid()) {
			logger.error( "Invalid end time: "+ endTime)
			return cb(null, null)
		}
	
		if( startIndex && startIndex < 0 ) {
			logger.error("Invalid startIndex: "+startIndex)			
			return cb(null, null)	
		}
	
		if( itemsPerPage && itemsPerPage < 0 ) {
			logger.error("Invalid itemsPerPage: "+itemsPerPage)			
			return cb(null, null)		
		}
	
		// override default bucket based on location
		var regionKey  	= FindRegionKey(lat, lon)
		if(regionKey == undefined )	{
			logger.error("Undefined regionKey", lat, lon)
			return cb(null, null)
		}
			
		var bucket		= app.config.regions[regionKey].bucket
		
		if( bucket ) {
			console.log("Found bucket", bucket)
		} else {
			logger.error("Cannot find bucket for", lat, lon)
			return cb(null, null)
		}
			
		if( bbox ) {
			lon = (bbox[0]+bbox[2])/2
			lat = (bbox[1]+bbox[3])/2
		}
	
		var days = []
		
		maxLimit = 90
		if (limit > maxLimit) maxLimit = limit
		itemsPerPage = maxLimit;
		for( var i=0; i<itemsPerPage; i++ ) {
			days.push(i)
		}
	
		var entries		= []
		
		//
		// Check every requested day
		//
		var slf = this
		function checkAllRequestedDays(next) {
			async.each(days, function(d, cb2) {
				if( entries.length < limit ) {
					slf.CheckRequestedDay( req, user, d, startTime, endTime, credentials, regionKey, entries, cb2) 
				} else {
					cb2(null)
				} 
			}, function(err) {
				next(null)				
			})
		}
		
		function getNewBucketList(next) {
			slf.ListObjects( bucket, function(err) {
				next(null)
			})
		}
		
		async.series([
			getNewBucketList, 
			checkAllRequestedDays
		], function(err) {
			var json = {}
			
			if( !err ) {
				json.replies = {
					items: entries
				}
			}
			console.log(product, " got entries:", entries.length)
			cb(err, json)			
		})
	}
	
	function render_map(region, url, req, res) {
		//console.log("render_map", url)
		res.render("products/map_api", {
			region: region,
			url: url,
			layout: false
		})
	}
	
	Query.prototype.Process = function(req,res) {
	}
	
	Query.prototype.QueryProduct = function(req, res) {
		var regionKey	= req.params['regionKey']
		var year 		= req.params['year']
		var doy 		= req.params['doy']
		var user		= req.session.user
		var credentials	= req.session.credentials
		
		//console.log('QueryProduct', regionKey, year,doy)
		
		this.QueryByID(req, user, year, doy, regionKey, credentials, function( err, entry ) {
			if( !err ) {
				console.log(entry)
				res.json(entry)
			} else {
				console.log("no entry")
				res.sendStatus(500)
			}				
		})
	}
	
	Query.prototype.Map = function(req,res) {
		var regionKey	= req.params['regionKey']
		var region		= app.config.regions[regionKey]
		var bucket		= region.bucket

		var year 		= req.params['year']
		var doy 		= req.params['doy']
		var date 		= moment(year+"-"+doy)
		var host 		= "http://"+req.headers.host
		var bbox		= bbox
		var id			= this.options.subfolder+year+"-"+doy
		//console.log("Map region", region)
		//var region 	= {
		//	name: 	req.gettext("legend."+this.options.product+".title")+" "+date.format(req.gettext("formats.date")),
		//	scene: 	id,
		//	bbox: 	undefined,	// feature.bbox,
		//	target: region.target,
		//	min_zoom: region.min_zoom
		//}
		
		var url = host + "/products/" + this.options.subfolder + "/query/"+regionKey+"/"+year+"/"+doy
		render_map(region, url, req, res )
	}
	
	function sendFile( res, file ) {
		var ext 		= path.extname(file)
		var basename 	= path.basename(file)
		var dirname 	= path.dirname(file)
		var ext			= path.extname(file)
		
		var mime_type = mime.lookup(path.basename(file))
		//console.log("sendFile", file, ext, mime_type)
		
		if( (basename.indexOf(".topojson.gz") > 0) || (basename.indexOf(".geojson.gz") > 0) ) {
			res.header("Content-Type", "application/json")
			res.header("Content-Encoding", "gzip")
			//console.log("sending .topojson application/json gzip", basename)
		} else {
			//console.log("sending ", mime_type, basename, dirname)
			res.header("Content-Type", mime_type, basename)
			debug(ext, mime_type, "no encoding")
		}
		res.header("Access-Control-Allow-Origin", "*")
		res.sendFile(basename, {root: dirname})
	}
	
	//
	// Get the file from S3 and forwards it back with gzip header for unzipping
	// We could also cache it for speed
	//
	Query.prototype.S3 = function(req,res) {
		var regionKey	= req.params['regionKey']
		var region		= app.config.regions[regionKey]
		var bucket		= region.bucket

		var subfolder	= req.params['subfolder']
		var year 		= req.params['year']
		var doy 		= req.params['doy']
		var id			= req.params['id']
	
		// https much slower than http so let's use http
		var s3host		= "http://s3.amazonaws.com/"
		var s3fileName	= s3host + bucket+"/"+subfolder+"/" + year + "/" + doy + "/" + id

		var tmp_dir 	= app.get("tmp_dir")
		var fileName 	= path.join(tmp_dir, bucket, subfolder, year, doy, id)
		var dirName	 	= path.dirname(fileName)
		
		
		if( !fs.existsSync(dirName)) mkdirp.sync(dirName)
		if( fs.existsSync(fileName)) {
			//console.log("return from s3 cache", fileName)
			return sendFile(res, fileName)
		}
		
		var file = fs.createWriteStream(fileName);
		var options = {
			Bucket: bucket, 
			Key: subfolder +"/"+year+"/"+doy+"/"+id
		};
		
		try {
			//console.log("copy from s3", options)
			app.s3.getObject(options)
			.createReadStream()
			.pipe(file)
			
			file.on('close', function() {
				//console.log("got file from S3", fileName)
				sendFile(res, fileName)
			});
			
		} catch(e) {
			logger.error("error getting from S3", options, e)
			return res.sendStatus(500)
		}
	}
	
	Query.prototype.Browse= function(req,res) {
		var regionKey	= req.params['regionKey']
		var region		= app.config.regions[regionKey]
		var bucket		= region.bucket
		var year 		= req.params['year']
		var doy 		= req.params['doy']
		var date 		= moment(year+"-"+doy)
		var host 		= "http://"+req.headers.host
		var legend		= "legend."+ this.options.product+".title"

		var slf 		= this
		this.CheckEmptyBucketList(bucket, function() {
			var key 		=  slf.options.subfolder + "/" + date.year() + "/" + doy + "/"
			var artifacts	= slf.bucketList[key]
			console.log(key, slf.bucketList)
		
			//var region 	= {
			//	name: 	req.gettext(legend),
			//	scene: 	year+"-"+doy,
			//	bbox: 	this.options.bbox,
			//	target: this.options.target
			//}
		
			var jday	= date.dayOfYear()
			if( jday < 10 ) {
				jday = "00"+jday
			} else if( jday < 100 ) jday = "0"+jday

			var month = date.month() + 1
			if( month < 10 ) month = "0"+ month

			var day		= date.date();
			if( day < 10 ) day = "0"+day
		
<<<<<<< HEAD
		var fkey                = this.options.subfolder+"."+year+month+day
		var s3host				= "https://s3.amazonaws.com/"+ bucket+"/"+this.options.subfolder+"/" + year + "/" + jday + "/"
=======
			var s3host				= "https://s3.amazonaws.com/"+ bucket+"/"+slf.options.subfolder+"/" + year + "/" + jday + "/"
>>>>>>> 714c059ff3cabd97f524e190c03972a19ad7f97e

			// local host cache for S3
			var s3proxy				= host+'/products/s3/'+regionKey+"/"+ slf.options.subfolder+"/"+year+"/"+jday + "/"

<<<<<<< HEAD
		var browse_img			= this.options.subfolder+"."+year + month + day + this.options.browse_img
		
		var data_url			= s3proxy+fkey+ (this.options.topojson || this.options.geojson)
=======
			var browse_img			= _.find(artifacts, function(el) { 
							return el.key.indexOf("_thn.jpg") > 0
						}).key
					
			var data_url			= s3proxy+slf.options.topojson || slf.options.geojson
>>>>>>> 714c059ff3cabd97f524e190c03972a19ad7f97e
		
			console.log("Browse", slf.options.subfolder, year, doy)
		
			res.render("products/s3_product", {
				social_envs: 	app.social_envs,
				description: 	req.gettext(legend) +" - "+date.format("YYYY-MM-DD"),
				image: 			s3proxy+browse_img,
				product_title: 	slf.options.product,
				product_tags: 	slf.options.tags.join(","),
				url: 			host+"/products/" + slf.options.subfolder +"/browse/"+ regionKey +"/" + year+"/"+doy,
				map_url: 		host+"/products/"+ slf.options.subfolder + "/map/"+regionKey+"/"+year+"/"+doy,
				date: 			date.format("YYYY-MM-DD"),
				region: 		region,
				data: 			slf.options.original_url,
				topojson: 		data_url,
				layout: 		false
			})
		})
	},
	
	Query.prototype.MapInfo= function(req, res) {
		var style 	= this.options.style(req);
		var  html  	= this.options.legend(req);
		var credits = this.options.credits(req);
		
		res.render("mapinfo/"+this.options.subfolder, { style: style, html: html, credits: credits })
	}
	
	Query.prototype.Style= function (req, res) {
		var json = this.options.style(req)
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'application/json');		
		res.send(json)
	}
	
	Query.prototype.Legend= function(req, res) {
		var html = this.options.legend(req)
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'text/html');		
		res.send(html)
	}
	
	Query.prototype.Credits= function(req, res) {
		var str = this.options.credits(req)
	    res.header("Access-Control-Allow-Origin", "*");
		res.set('Content-Type', 'application/json');		
		res.send(str)
	}
	
	module.exports 		= Query;