//
// GitHub interface library
//
	var assert		= require('assert')
	var debug		= require('debug')('github');

	var crypto 		= require('crypto')
	  , shasum = crypto.createHash('sha1');
	  
	var GitHubApi 	= require("github");	

 	var personnal_access_token 	= process.env.GITHUB_PA
	assert( personnal_access_token )
 
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0

	var client = new GitHubApi({
	    // required
	    version: 	"3.0.0",
	    // optional
	    debug: 		false,
	    protocol: 	"https",
	    host: 		"api.github.com",
	    timeout: 	5000
	});
	
	var github_options = {
	    type: 	"oauth",
	    token: personnal_access_token
	}
	
	client.authenticate(github_options) 

	// horrible to work around throttling of github
	function sleep(milliseconds) {
	  var start = new Date().getTime();
	  for (var i = 0; i < 1e7; i++) {
	    if ((new Date().getTime() - start) > milliseconds){
	      break;
	    }
	  }
	}
	
	function base64_encode(unencoded) {
		return new Buffer(unencoded || '').toString('base64');
	};
 
	function base64_decode(encoded) {
		return new Buffer(encoded || '', 'base64').toString('utf8');
	};
	
	//
	// Works !
	//
	function blobShaHex(data, encoding)  {
	    return crypto.createHash('sha1').update('blob ' + data.length + '\0').update(data, encoding).digest('hex');
	}
	
	//
	// Does not work
	//
	function git_sha(content) {
		// http://stackoverflow.com/questions/552659/assigning-git-sha1s-without-git/552725#552725
		// git hash-object filename -> hash
		var size = content.length
		var blob = "blob "+size+"\0"+content
		
		var sha = crypto.createHash('sha1').update(blob).digest('hex');
		return sha
	};
		
module.exports = {
	getHistory: function(repo, path, cb) {
		console.log("github getHistory")
		client.repos.getCommits({
			"user": app.config.github.user,
			"repo": repo,
			"path": path
		}, function(err, content) {
			debug(content)
			cb(err, content)
		})
	},
	
	createNewFile: function( fname, repo, msg, content, author, cb) {
		console.log("github createNewFile", fname)
		client.repos.createFile({
			"user": 	app.config.github.user,
			"repo": 	repo,
			"path": 	fname,
			"message":  msg,
			"content": 	base64_encode(JSON.stringify(content,null, '\t' )),
			"author": 	author
		}, function(err, content) {
			err ? console.log("** github error creating newfile", err) : console.log("github created newfile", fname)
			cb(err, content)
		})
	},
	
	updateFile: function( fname, repo, msg, content, sha, author, committer, cb) {
		console.log("github updateFile", fname, sha, author, committer)
		client.repos.updateFile({
			"user": 		app.config.github.user,
			"repo": 		repo,
			"path": 		fname,
			"message":  	msg,
			"content": 		base64_encode(JSON.stringify(content,null, '\t' )),
			"sha": 			sha,
			"author": 		author,
			"committer": 	committer
		}, function(err, content) {
			err ? console.log("**err github updateFile", err) : console.log("github updated file", fname)
			cb(err, content)
		})
	},
	
	deleteFile: function( fname, repo, msg, sha, committer, cb) {
		console.log("github deleteFile", fname, sha, committer)
		client.repos.deleteFile({
			"user": 		app.config.github.user,
			"repo": 		repo,
			"path": 		fname,
			"message":  	msg,
			"sha": 			sha,
			"committer": 	committer
		}, function(err, content) {
			err ? console.log("**err github updateFile", err) : console.log("github updated file", fname);
			cb(err)
		})
	},
	
	getFileContents: function(fname, repo, cb) {
		console.log("github getFileContents", fname)
		client.repos.getContent({
				"user": app.config.github.user,
				"repo": repo,
				"path": fname
			}, function(err, content) {
				console.log(err)
				//console.log(content)
				if(!err && content ) {
					cb(err, JSON.parse(base64_decode(content.content)))
				} else {
					cb(err, content)
				}
		})
	},
	//
	// Get all GitHub metadata necessary for a particular file
	//
	getGitHubMetadata: function(fname, repo, cb) {
		console.log("github getGitHubMetadata", fname)
		client.repos.getContent({
			"user": app.config.github.user,
			"repo": repo,
			"path": fname
		}, function(err, metainfo) {
			console.log(err)
			console.log(metainfo)
			if( err ) {
				return cb(err)
			}
			var info = metainfo
			// now we need to get the first commit of the history
			client.repos.getCommits({
				"user": app.config.github.user,
				"repo": repo,
				"path": fname
			}, function(err, history) {
				if( !err ) {
					var first 		= history[0]
					var sha 		= first.sha
					var commit		= first.commit
					commit.sha		= sha
					info.commit		= commit
					
					delete info.content		
					cb(err, info)
				} else {
					console.log(err)
					cb(err, null)
				}
			})
		})
	}
}