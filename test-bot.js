var character = require("./character.js");
var furcadia = require("./furcadia.js");
var client = require("./client.js");


var master = "Artex";

function doError(msg) {
	console.error("Error: "+ msg);
}


function characterReady(character) {
	cli = new client.FurcadiaClient(character);
	cli.on('connected', function(){
		console.log("Connected!");
	});

	// Handle problematic conditions
	cli.on('disconnectMessage', doError);
	cli.on('loginFailed', function(){ doError("Login failed!"); });


	// Autorun - execute this upon successful login attempt
	cli.on('login', function(){
		cli.whisper(master, "Rawr!");
	});
	

	// Speech processing
	cli.on('say', function(data){
		
		console.log("(say) <"+ data.name +"> "+ data.text);
	});

	cli.on('emote', function(data){
		if (data.shortname === furcadia.shortname(master)) {
			var words = data.action.split(' ');
			if (furcadia.shortname(words[1]) === furcadia.shortname(character.Name)) {
				cli.emote(words[0] +" "+ data.name);
			}
		}

		console.log("(act) "+ data.name +" "+ data.action);
	});

	cli.on('whisper', function(data){
		console.log("(whi) ["+ data.name +"] "+ data.message);
	});


	// Request handling
	cli.on('joinRequest', function(data){
		if (data.shortname === furcadia.shortname(master))
			cli.summon(data.shortname);

		console.log("(joinRequest) "+ data.name);
	});

	cli.on('summonRequest', function(data){
		if (data.shortname === furcadia.shortname(master))
			cli.join(data.shortname);

		console.log("(summonRequest) "+ data.name);
	});

	cli.on('leadRequest', function(data){
		if (data.shortname === furcadia.shortname(master))
			cli.follow(data.shortname);

		console.log("(leadRequest) "+ data.name);
	});

	cli.on('text', function(text){
		console.log(":: "+ text);
	});


	// Establish connection
	cli.connect();
}

character.parseCharacterFile('character.ini', characterReady);
console.log("Loading character...");
