var util = require('util');
var events = require('events');
var net = require('net');

var furcadia = require('./furcadia.js');
var translator = require('./furcadia-translator.js');
var character = require('./character.js');
var linebuffer = require('./line-buffer.js');

var DATA_ENCODING = 'ascii';

//-----------------------------------------------------------------------------
// Helper Functions
//-----------------------------------------------------------------------------

function parseAddress(address) {
	var result = furcadia.addresses.gameserver;
	if (typeof address == "string") {
		var t = address.split(':');

		result.host = t[0];
		if (t.length > 1)
			result.port = parseInt(t[1]);
	}
	else if (typeof address === "object") {
		if (typeof address.host != "undefined")
			result.host = address.host;
		if (typeof address.port != "undefined")
			result.port = address.port;
	}
	
	return result;
}


//-----------------------------------------------------------------------------
// FurcadiaClient Object
//-----------------------------------------------------------------------------

function FurcadiaClient(character, address) {
	var self = this;
	self.address = parseAddress(address);
	self.character = character;
	self.socket = null;
	self.buffer = null;

	// EventEmitter constructor
	events.EventEmitter.call(self);

	//--- Low-Level Methods
	self.connect = function() {
		if (self.socket !== null)
			self.socket.destroy();

		self.buffer = new linebuffer.LineBuffer("", function(data){
			// Received raw data is dispatched on to the raw
			// data listeners, without the newline character.
			self.emit('data', data);
		});

		self.socket = new net.Socket();
		self.socket.setEncoding(DATA_ENCODING);


		//--- Event Handling
		self.socket.on('connect', function(){
			self.emit('connect');
		});

		self.socket.on('data', function(buf){
			// Let the LineBuffer disect and dispatch this
			self.buffer.write(buf);
		});

		self.socket.on('close', function(had_error){
			self.emit('close', had_error);

			self.socket = null;
			self.buffer = null;
		});


		//--- Connection
		self.socket.connect(
			self.address.port,
			self.address.host,
			function(){
				self.emit('connected');
			});
	};

	self.close = function() {
		self.quit();
		self.socket.end();
	};

	self.raw = function(data) {
		if (self.socket === null)
			throw "Not connected";
		
		self.socket.write(data, DATA_ENCODING);
	}

	self.send = function(line) {
		if (line) self.raw(line + "\n", DATA_ENCODING);
	};

	self.sendMany = function(lines) {
		for (var i = 0; i < lines.length; i++)
			self.send(lines[i]);
	};

	
	//--- Higher-Level Methods ------------------------------------------//

	//-- Connection & State

	self.login = function(name, password) {
		self.send("connect "+ furcadia.shortname(name) +" "+ password);
	};

	self.desc = function(description) {
		self.send("desc "+ description);
	};

	self.quit = function() {
		self.send("quit");
	};

	self.afk = function(msg) {
		self.send("afk "+ msg);
	};

	self.unafk = function() {
		self.send("unafk");
	};

	self.winver = function(version) {
		self.send("Winver "+ version);
	};

	self.version = function(version) {
		self.send("version "+ version);
	};


	//-- Communication

	self.whisperson = function() {
		self.say("whisperson");
	};

	self.whispersoff = function() {
		self.say("whispersoff");
	};

	self.whisper = function(furreName, msg, sendOffline) {
		var name_prefix = sendOffline ? "%%" : "";
		var target = name_prefix + furcadia.shortname(furreName);

		self.send("wh "+ target +" "+ msg);
	};

	self.say = function(msg) {
		self.send('"'+ msg);
	};

	self.emote = function(action) {
		self.send(':'+ action);
	};

	self.shout = function(msg) {
		self.send('-'+ msg);
	};

	
	//-- Navigation

	self.__commandHelper = function(cmd, furreName) {
		var postfix = furreName
			? " "+ furcadia.shortname(furreName)
			: "";

		self.send(cmd + postfix);
	};

	self.join = function(furreName) {
		self.__commandHelper("join", furreName);
	};

	self.summon = function(furreName) {
		self.__commandHelper("summon", furreName);
	};

	self.lead = function(furreName) {
		self.__commandHelper("lead", furreName);
	};

	self.follow = function(furreName) {
		self.__commandHelper("follow", furreName);
	};

	self.stop = function() {
		self.send("stop");
	};

	self.gomap = function(mapID) {
		self.send("gomap "+ furcadia.toBase95(mapID));
	};

	self.gourl = function(dreamURL) {
		self.send("fdl "+ dreamURL);
	};

	self.goback = function() {
		self.send("goback");
	};

	self.bookmarkDream = function() {
		self.send("bookmarkdream");
	};


	//-- Character State

	self.stand = function() { self.send("stand"); };
	self.sit = function() { self.send("sit"); };
	self.liedown = function() { self.send("liedown"); }
	self.turnClockwise = function() { self.send(">"); };
	self.turnCounterclockwise = function() { self.send("<"); };

	self.move = function(directions) {
		if (directions instanceof Array)
			self.sendMany(directions.map(function(dir){
				return "m "+ dir;
			}));
		else
			self.send(directions);
	};

	self.get = function() { self.send("get"); };
	self.use = function() { self.send("use"); };
	self.cuddle = function(furreName) {
		self.__commandHelper("cuddle", furreName);
	};


	//-- Information

	self.look = function(furreName) {
		if (furreName)
			self.say("look "+ furcadia.shortname(furreName));
	};

	self.lookAt = function(x,y) {
		var xc = furcadia.toBase95(x,2);
		var yc = furcadia.toBase95(y,2);
		self.send("l "+ xc + yc);
	};

	self.info = function() {
		self.send("info");
	};

	self.time = function() {
		self.say("time");
	};

	self.dreamurl = function() {
		self.say("dreamurl");
	};

	self.online = function(furreName) {
		self.send("onln "+ furcadia.shortname(furreName));
	};


	//--- Basic Event Handlers ----------------------------------------------//
	self.on('data', function(buffer){
		// Pass it through the translator that will determine what kind of
		// Furc-related data this is, and emits the relevant events through
		// `self` as necessary.
		translator.translate(self, buffer);
	});

	self.on('auth', function(){
		self.login(self.character.Name, self.character.Password);
	});

	self.on('login', function(){
		self.send("color "+ self.character.Colors);
		self.desc(self.character.Desc);
	});

	self.on('loadCustomDream', function(name,crc){
		self.send("vascodagama");
	});
}

util.inherits(FurcadiaClient, events.EventEmitter);


//-----------------------------------------------------------------------------
// Exports
//-----------------------------------------------------------------------------

module.exports.FurcadiaClient = FurcadiaClient;

