# Connect PostgreSQL

Connect-pg is a middleware session storage for the connect framework using 
PostgreSQL.  Why?  Because sometimes you need a relational database 
handling your data.  

## Requirements

* **Production**
	* *[connect](https://github.com/senchalabs/connect) 1.5.0 or later* The HTTP server framework used by Express.
	* *[pg](https://github.com/brianc/node-postgres) 0.50 or later* The node.js client for PostgreSQL.  
	* *[PostgreSQL](http://www.postgresql.org) 9.0 or later* The database.
	* *[pgtap](http://pgtap.org)* TAP style testing framework for PostgreSQL databases.  
* **Development**
	* *[jasmine-node](https://github.com/mhevery/jasmine-node)* The BDD style testing framework for JavaScript.  

##Feature List

* Create or update session information.
* Retreive information stored for the session.
* Delete the information for a session.
* Count the total number of active sessions.
* Delete all session information.
* Automatically delete session information that has expired.

## Installation 

1. **Setup PostgreSQL to Use Passwords to Log In**

	Refer to PostgreSQL's manual for changing the pg_hba.conf file.  The 
	database needs to be setup so that database users can log into the 
	system using a password.  

2. **Install pgTap into the Database**

	[pgTap](http://pgtap.org) is a development tool that validates whether 
	the database is functioning properly or not.  The same tests can also 
	be used to determine what changes need to be made to the database 
	in an installation or upgrade.  So it needs to be installed first.  The link 
	to their website will provide instructions.  

3. **Install the connect-pg library**

	*Standard Method:* npm install connect-pg
	
	*Manual Method:* [Download](https://github.com/jebas/connect-pg) the 
	files to your server.  The only file your script needs access to is 
	connect-pg.js found in the lib directory.  
	
4. **Install the Testing, Upgrading, and Installation Functions**

	As the superuser for the database, install the functions that test, 
	install, and upgrade the connect-pg database. As shown in the 
	following example:
	
	`psql -d {database name} -U postgres -f {path to file}/session_install.sql`

5. **Run the Database Correction Function**

	As the database's superuser, run the database correction function.  
	This will install the tables and functions into a new database, or it will 
	update an existing database to add the new features.  The following is 
	an example of the command.  

	`psql -d {database name} -U postgres -c 'select correct_web()'`
	
6. **Change the nodepg user's password**

	As part of the database setup, the correct_web function will confirm 
	or create a PostgreSQL user called nodepg.  For security reasons, this 
	user is only given enough rights to operate the connect-pg functions, 
	and no more.  Since the default password for this user is 'password', 
	you will want to change the password for this user to something that 
	is more secure.  Example as follow:
	
	`psql -d {database name} -U postgres -c 'alter user nodepg with password {something secret}'`

## Usage

1. The database installation goes through the process of creating the 
connection user, and setting permissions.  To use connect-pg in your 
Express of Connection application, you will need to create a function 
whose callback will contain a pg client.  The following is an example:

<pre><code>
	var pg = require('pg');

	function pgConnect (callback) {
		pg.connect('tcp://nodepg:password@localhost/pgstore',
			function (err, client) {
				if (err) {
					console.log(JSON.stringify(err));
				}
				if (client) {
					callback(client);
				}
			}
		);
	};
</code></pre>

Obviously, you would change the pg connection string to something 
appropriate for your system.  

2. Include the requirement for connect-pg.

	`var PGStore = require('connect-pg');`

3. Setup the session software to use the connect-pg for storage.  

	* **In connect:**
	
		`connect.session({ store: new PGStore(pgConnect), 
		secret: 'keyboard cat'});`
		
	* **In Express:**
	
		`app.use(express.session({store: new PGStore(pgConnect), 
		secret: 'keyboard cat'}));`

## Development 

Connect-pg is the first module in a series that is being developed for 
node.js and Express.  Using the Model, View, Controller (MVC) analogy, 
PostgreSQL is used for the model, templates are used for the view, and 
Express is used for the controller.  

If you wish to contribute, please follow these guidelines:

* Only pgTap, installation/upgrade, and functions supporting them 
are placed in the root of the database.
* Everything else should be placed into a given schema.  
* Tests functions should start with 'test_{schema name}_' so they 
don't conflict with other modules.
* Nodepg should only be given the minimum permissions to make 
the module run.
* Use pgTap tests to create an installation/upgrade function.  Use 
connect-pg's correct_web() as an example.
* Though you don't have to use Jasmine for every module, some 
automated testing method is preferred.  
* Be careful of using pgTAP's startup, setup, teardown, and shutdown 
functions.  These run before and after the test function is run.  In 
development this is fine, but it may cause the installation to call on 
features that have not been installed yet.  

## LICENSE

This software is using the [MIT](./connect-pg/blob/master/LICENSE) to match 
the connect license.