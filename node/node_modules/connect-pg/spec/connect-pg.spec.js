// Example of function to pass a client object back to the storage.
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

// Actual testing begins here.

var PGStore = require('../'),
	Store = require('connect').session.Store;

describe('connect-pg', function () {
	beforeEach(function () {
		this.pgStore = new PGStore(pgConnect);
		this.callback = jasmine.createSpy();
		this.callCount = this.callback.callCount;
		var callback = jasmine.createSpy();
		var callCount = callback.callCount;
		this.pgStore.set('session-1', 'Test data', callback);
		waitsFor(function () {
				return callCount != callback.callCount;
			},
			'session-1 callback',
			10000);
		runs(function () {});
	});
	
	afterEach(function () {
		var callback = jasmine.createSpy();
		var callCount = callback.callCount;
		this.pgStore.clear(callback);
		waitsFor(function () {
				return callCount != callback.callCount;
			},
			'test clear callback',
			10000);
		runs(function () {});
	});

	describe('constructor', function () {
		it('should have a constructor function', function () {
			expect(typeof PGStore).toEqual('function');
		});
		
		it('should throw exception with no client function', function () {
			expect(function () {
				var pgStore = new PGStore();
			}).toThrow(TypeError);
		});

		it('should throw exception callback is not a function', function () {
			expect(function () {
				var pgStore = new PGStore('text');
			}).toThrow(TypeError);
		});

		it("should create an object based on connect's Store", function () {
			var pgStore = new PGStore(function () {});
			var parent = Object.getPrototypeOf(pgStore);
			expect(Object.getPrototypeOf(parent)).toEqual(Store.prototype);
		});
	});
	
	describe('set', function () {
		it('should have a set function', function () {
			expect(typeof this.pgStore.set).toEqual('function');
		});
		
		it('should accept a callback function', function () {
			this.pgStore.set('new-session', '{}', this.callback);
			waitsFor( function () {
					return this.callCount != this.callback.callCount;
				},
				"set's callback",
				10000);
			runs(function () {
				expect(this.callback).toHaveBeenCalled();
			});
		});
		
		it('should keep callback optional', function () {
			var pgStore = this.pgStore;
			expect(function () {
					pgStore.set('new-session', '{}');
				}).not.toThrow();
		});
		
		it('should ignore expired sessions', function () {
			var expire = new Date();
			expire.setDate(expire.getDate() - 1);
			var sessData = {
				'data': 'Test data',
				'cookie': {
					'expires': expire
				}
			};
			this.pgStore.set('session-1', sessData, this.callback);
			waitsFor(function () {
					return this.callCount != this.callback.callCount;
				},
				"set date callback",
				10000);
			runs(function () {
				var callback = jasmine.createSpy();
				this.callCount = callback.callCount;
				this.pgStore.get('session-1', callback);
				waitsFor(function () {
						return this.callCount != callback.callCount;
					},
					'get callback',
					10000);
				runs(function () {
					expect(callback).toHaveBeenCalledWith(null, null);
				});
			});
		});
	});
	
	describe('get', function () {
		it('should have a get function', function () {
			expect(typeof this.pgStore.get).toEqual('function');
		});
		
		it('should return null for a bad session name', function () {
			this.pgStore.get('bad-session', this.callback);
			waitsFor(function () {
					return this.callCount != this.callback.callCount;
				},
				"bad session get's callback",
				10000);
			runs(function () {
				expect(this.callback).toHaveBeenCalledWith(null, null);
			});
		});
		
		it('should return the stored information to the callback', function () {
			this.pgStore.get('session-1', this.callback);
			waitsFor(function () {
					return this.callCount != this.callback.callCount;
				},
				"get's callback",
				10000);
			runs(function () {
				expect(this.callback).toHaveBeenCalledWith(null, 'Test data');
			});
		});
	});

	describe('destroy', function () {
		it('should have a destroy function', function () {
			expect(typeof this.pgStore.destroy).toEqual('function');
		});
		
		it('should accept a callback function', function () {
			this.pgStore.destroy('session-1', this.callback);
			waitsFor( function () {
					return this.callCount != this.callback.callCount;
				},
				"set's callback",
				10000);
			runs(function () {
				expect(this.callback).toHaveBeenCalled();
			});
		});
		
		it('should keep callback optional', function () {
			var pgStore = this.pgStore;
			expect(function () {
					pgStore.destroy('session-1');
				}).not.toThrow();
		});
		
		it('should remove the session from storage', function () {
			this.pgStore.destroy('session-1', this.callback);
			waitsFor(function () {
					return this.callCount != this.callback.callCount;
				},
				"destroy's callback",
				10000);
			runs(function () {
				var callback = jasmine.createSpy();
				var callCount = callback.callCount;
				this.pgStore.get('session-1', callback);
				waitsFor(function () {
						return callCount != callback.callCount;
					},
					"Deleted's get callback",
					10000);
				runs(function () {
					expect(callback).toHaveBeenCalledWith(null, null);
				});
			});
		});
	});

	describe('length', function () {
		it('should have a length function', function () {
			expect(typeof this.pgStore.length).toEqual('function');
		});
		
		it('should return the number of active sessions', function () {
			var callback2 = jasmine.createSpy();
			var callCount2 = callback2.callCount;
			var callback3 = jasmine.createSpy();
			var callCount3 = callback3.callCount;
			this.pgStore.set('session-2', 'Test data', callback2);
			this.pgStore.set('session-3', 'Test data', callback3);
			waitsFor(function () {
				return callCount2 != callback2.callCount
					&& callCount3 != callback3.callCount;
			},
			'additional session callbacks',
			10000);
			runs(function () {
				this.pgStore.length(this.callback);
				waitsFor(function () {
						return this.callCount != this.callback.callCount;
					},
					'Length callback',
					10000);
				runs(function () {
					expect(this.callback).toHaveBeenCalledWith(null, 3);
				});
			});
		});
	});
	
	describe('clear', function () {
		it('should have a clear function', function () {
			expect(typeof this.pgStore.clear).toEqual('function');
		});
		
		it('should accept a callback function', function () {
			this.pgStore.clear(this.callback);
			waitsFor( function () {
					return this.callCount != this.callback.callCount;
				},
				"set's callback",
				10000);
			runs(function () {
				expect(this.callback).toHaveBeenCalled();
			});
		});
		
		it('should keep callback optional', function () {
			var pgStore = this.pgStore;
			expect(function () {
					pgStore.clear();
				}).not.toThrow();
		});
		
		it('should remove all sessions', function () {
			this.pgStore.clear(this.callback);
			waitsFor( function () {
					return this.callCount != this.callback.callCount;
				},
				"set's callback",
				10000);
			runs(function () {
				var callback = jasmine.createSpy();
				this.callCount = callback.callCount;
				this.pgStore.length(callback);
				waitsFor(function () {
						return this.callCount != callback.callCount;
					},
					"Clear's call count callback",
					10000);
				runs(function () {
					expect(callback).toHaveBeenCalledWith(null, 0);
				});
			});
		});
	});
});