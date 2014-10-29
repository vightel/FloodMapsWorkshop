/* Downloads the latest translations from Transifex */

var request = require('request'),
    yaml 	= require('js-yaml'),
    fs 		= require('fs'),
    _ 		= require('./public/js/lodash.js'),
    delve 	= require('delve');

	var resources 	= ['core', 'geoapp', 'id', 'api'];

var outdir 		= './locale/';
var api 		= 'http://www.transifex.com/api/2/';

var project = api + 'project/ojo/';

/*
 * Transifex oddly doesn't allow anonymous downloading
 *
 * auth is stored in transifex.auth in a json object:
 *  {
 *      "user": "username",
 *      "pass": "password"
 *  }
 *  */

var auth = JSON.parse(fs.readFileSync('./transifex.auth', 'utf8'));
console.log("auth", auth)

//var sourceCore 		= yaml.load(fs.readFileSync('./locale/core.yaml', 'utf8'));
//var sourceGeoApp 	= yaml.load(fs.readFileSync('./locale/geoapp.yaml', 'utf8'));
//var sourceID 		= yaml.load(fs.readFileSync('./locale/ID.yaml', 'utf8'));

var sourceAPI 		= yaml.load(fs.readFileSync('./locale/api.yaml', 'utf8'));

asyncMap(resources, getResource, function(err, locales) {
    if (err) return console.log(err);

    var locale = _.merge(sourceAPI);
    locales.forEach(function(l) {
        locale = _.merge(locale, l);
    });

    for (var i in locale) {
        //if (i === 'en') continue;
        fs.writeFileSync(outdir + i + '.json', JSON.stringify(locale[i], null, 4));
    }
});

function getResource(resource, callback) {
    resource = project + 'resource/' + resource + '/';
    //resource = project + 'resource/' + resource;
    getLanguages(resource, function(err, codes) {
        if (err) return callback(err);
        asyncMap(codes, getLanguage(resource), function(err, results) {
            if (err) return callback(err);

            var locale = {};
            results.forEach(function(result, i) {
                locale[codes[i]] = result;
            });

            callback(null, locale);

        });

        fs.writeFileSync('./locale/locales.json', JSON.stringify(codes, null, 4));
    });
}

function getLanguage(resource) {
    return function(code, callback) {
        code = code.replace(/-/g, '_');
        var url = resource + 'translation/' + code;
        if (code === 'vi') url += '?mode=reviewed';
        request.get(url, { auth : auth },
            function(err, resp, body) {
			console.log("getLanguage", url, err, body)
            if (err) return callback(err);
            callback(null, yaml.load(JSON.parse(body).content)[code]);
        });
    };
}

function getLanguages(resource, callback) {
	console.log("getlanguages", resource+ '?details', auth)
    request.get(resource + '?details', { auth: auth },
        function(err, resp, body) {
        if (err) return callback(err);
		console.log("Resource body", err, body)
        callback(null, JSON.parse(body).available_languages.map(function(d) {
            return d.code.replace(/_/g, '-');
        }).filter(function(d) {
            return d !== 'en';
        }));
    });
}

function asyncMap(inputs, func, callback) {
    var remaining = inputs.length,
        results = [],
        error;

    inputs.forEach(function(d, i) {
        func(d, function done(err, data) {
            if (err) error = err;
            results[i] = data;
            remaining --;
            if (!remaining) callback(error, results);
        });
    });
}
