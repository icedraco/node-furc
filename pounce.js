var http = require('http');
var furcadia = require('./furcadia.js');
var base_url = 'http://on.furcadia.com/q/';

function query(furres, dreams, callback) {
	// dreams is an optional argument
	if (typeof dreams === "function") {
		callback = dreams;
		dreams = [];
	}
	
	http.get(prepareUrl(furres, dreams), function(res){
		var buffer = [];
		
		res.on('data', function(chunk) {
			buffer.push(chunk);
		});

		res.on('end', function() {
			if (typeof callback === "function")
				callback(prepareResult(buffer.join('')));
		});
	});
}

function prepareResult(data) {
	var result = {
		timeout: 30000,
		numFurres: 0,
		numDreams: 0,
		onlineFurres: [],
		onlineDreams: []
	};
	
	var lines = data.split("\n");
	for (var i = 0; i < lines.length; i++) {
		if (lines[i].length < 2) continue;
		
		var rest = lines[i].substr(1);
		switch (lines[i].charAt(0)) {
		case 'T':
			result.timeout = parseInt(rest);
			break;
			
		case 'O':
			result.numFurres = parseInt(rest);
			break;
			
		case 'D':
			result.numDreams = parseInt(rest);
			break;
			
		case '@':
			result.onlineFurres.push(rest.substr(3).replace(/[|]/g, ' '));
			break;
		
		case '#':
			result.onlineDreams.push(rest.substr(1));
			break;
		
		default:
			// Ignore
		}
	}
	
	return result;
}

function prepareUrl(furres, dreams) {
	if (typeof dreams === "undefined")
		dreams = [];
		
	if (typeof furres === "undefined")
		furres = [];
	
	var str_furres = furres.map(function(f){ return "&u[]=" + furcadia.shortname(f); }).join("");
	var str_dreams = dreams.map(function(d){ return "&d[]=" + furcadia.shorturl(d); }).join("");

	return base_url + "?" + (new Date()).getTime() + str_furres + str_dreams;
}



module.exports.query = query;
