var util		= require('util'),
	eyes		= require('eyes'),
	fs			= require('fs'),
	crypto 		= require('crypto'),
	request		= require('request'),
	User		= require('../../models/user')
	debug		= require('debug')('login');

	// generate new_avatar
	function new_avatar( str ) {
		var md5 	= crypto.createHash('md5').update(str).digest("hex");
		grav_url 	= 'http://www.gravatar.com/avatar.php/'+md5
		grav_url	+= "?s=32&d=identicon"
		//console.log("Made gravatar:", grav_url)
		return grav_url
	}
	
module.exports = {
	
	verify: function(req, res) {
		var audience = "http://" + req.headers.host

		//console.log("Persona verify audience", audience )
		request.post({
			url: 'https://verifier.login.persona.org/verify',
			json: {
				assertion: req.body.assertion,
				audience: audience
			}
		}, function(e, r, body) {
			//eyes.inspect(body, "persona body")
			if (e) console.log(e);
			if (body && body.status === 'okay') {
				var email = body.email;

				User.get_by_email(email, function(err, user) {
					if (!err && user) {
						//console.log("found user by email")
						req.session.user = user
						res.sendStatus(200);
					} else {
						logger.error("user not found by email.. creating one")
						var md5 = crypto.createHash('md5').update(email + app.secret).digest("hex");

						var json = {
							name: email,
							email: email,
							organization: 'TBD',
							created_at: new Date(),
							updated_at: new Date(),
							gravatar: new_avatar(md5)
						}

						User.save(json, function(err, user) {
							if (err) return res.send(400)
							req.session.user = user
						    res.header("Access-Control-Allow-Origin", "*");
							res.sendStatus(200)
						})
					}
				})
			} else {
				//req.logout();
				req.session.destroy()
			    res.header("Access-Control-Allow-Origin", "*");
				res.sendStatus(200);
			}
		});
	},

	logout: function(req, res) {
		logger.info("persona logout")
		//req.logout()

	    //req.session.user 	= null;
	    //req.session 		= null;
		delete req.session.user
		req.session.destroy()
		//delete req.headers.cookie
	    //res.clearCookie('email');
		//res.send(200);
		res.sendStatus(200)	    
	}
}