var express = require('express');
	debug 	= require('debug')('settings');

	//app.configure(function(){
	//debug("configure...");
    //var cwd = process.cwd();
    
	// not sure which to use now... it might be enabled by default.... grrr!
    //app.enable('jsonp callback');
    //app.set('jsonp callback', true);
	//});


Date.prototype.getDOY = function() {
	//var onejan = new Date(this.getFullYear(),0,1);
	//return Math.ceil((this - onejan) / 86400000);
	var timestmp 		= new Date(this.getFullYear(),0,1);
	var yearFirstDay 	= Math.floor(timestmp/86400000);
	var dateDay			= Math.ceil(this.getTime()/86400000);
	return dateDay - yearFirstDay; 
}

Date.prototype.rfc339 = function() {
	var pad = function(amount, width) {
		var padding = "";
		while (padding.length < width - 1 && amount < Math.pow(10, width - padding.length - 1))
			padding += "0";
		return padding + amount.toString();
	}
	date = this; //date ? date : new Date();
	var offset = date.getTimezoneOffset();
	debug("rfc339 offset:" + offset);
	return pad(date.getFullYear(), 4) + "-" + pad(date.getMonth() + 1, 2) + "-" + pad(date.getDate(), 2) + "T" + pad(date.getHours(), 2) + ":" + pad(date.getMinutes(), 2) + ":" + pad(date.getSeconds(), 2) + "." + pad(date.getMilliseconds(), 3) + (offset > 0 ? "-" : "+") + pad(Math.floor(Math.abs(offset) / 60), 2) + ":" + pad(Math.abs(offset) % 60, 2);
}

/*
 * JavaScript Pretty Date
 * Copyright (c) 2011 John Resig (ejohn.org)
 * Licensed under the MIT and GPL licenses.
 */

// Takes an ISO time and returns a string representing how
// long ago the date represents.
Date.prototype.prettyDate = function() {
	var date = this;
	//var date = time.replace(/-/g,"/").replace(/[TZ]/g," "),
	
	var	diff = (((new Date()).getTime() - date.getTime()) / 1000),
		day_diff = Math.floor(diff / 86400);
			
	if ( isNaN(day_diff) || day_diff < 0 )
		return "day_diff:"+day_diff;
			
	return day_diff == 0 && (
			diff < 60 && "just now" ||
			diff < 120 && "1 minute ago" ||
			diff < 3600 && Math.floor( diff / 60 ) + " minutes ago" ||
			diff < 7200 && "1 hour ago" ||
			diff < 86400 && Math.floor( diff / 3600 ) + " hours ago") ||
		day_diff == 1 && "Yesterday" ||
		day_diff < 7 && day_diff + " days ago" ||
		day_diff < 31 && Math.ceil( day_diff / 7 ) + " weeks ago" ||
		day_diff < 365 && Math.ceil(day_diff / 30 ) + " months ago" ||
		Math.ceil(day_diff / 365 ) + " years ago"
}

	
var http = require('http')
  , req = http.IncomingMessage.prototype

req.fmt = function() {
	var fmt = this.param('format') || this.param('fmt');
	if( fmt == undefined && this.query) fmt = this.query['format'];
	if( fmt == undefined && this.query) fmt = this.query['fmt'];
	if( fmt == undefined && this.query) fmt = this.query['alt'];
	if( fmt == undefined && this.query) fmt = this.query['output'];
	if( fmt == undefined) {
		var accept = this.headers.accept;
		if( accept ) {
			//debug("Accept:"+util.inspect(accept))
			if( accept.indexOf('json') >= 0 ){
				fmt = 'json';
			} else if( 	accept.indexOf('atom') >= 0 ){
				fmt = 'atom';
			} else if( 	accept.indexOf('html') >= 0 ){
				fmt = 'html'
			} else if( 	accept.indexOf('*/*') >= 0 ){
				fmt = 'html'					
			}
		}
	}	
	return fmt;
}

String.prototype.sha1_hex = function() {
	var s = this;
    var hash = crypto.createHash('sha1');
    hash.update(String(s));
    return hash.digest('hex');
}