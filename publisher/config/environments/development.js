var express = require('express'),
	path	= require('path'),
	debug 	= require('debug')('settings');

	//app.configure('development', function() {
	//	debug("configure development");
	//	app.set('tmp_dir', path.join(app.root,'tmp'))
  	//app.use(express.logger('dev'));
  	//app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
	//});

app.set('tmp_dir', path.join(app.root,'../tmp'))

app_port= process.env.PORT || 7465;
app.set('port', app_port)
