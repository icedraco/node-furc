var fs = require('fs')
var DEFAULT_HEADER = "V3.0 character";

function isNumeric(value) {
	for (var i = 0; i < value.length; i++) {
		var ch = value.charCodeAt(i);
		if (ch < 0x30 || ch > 0x39)
			return false;
	}
	return true;
}

function parseValue(value) {
	return isNumeric(value) ? parseInt(value) : value;
}

function parseCharacterData(data) {
	var lines = data.toString('ascii').split("\n");
	var result = {
		Name: '',
		Password: '',
		Desc: '',
		Colors: 't#############'
	};
	
	if (lines[0].trim() === DEFAULT_HEADER) {
		for (var i = 1; i < lines.length; i++) {
			var line  = lines[i].trim();
			var index = line.indexOf('=');
			if (index < 0)
				continue; // Lines without a single = in them should be ignored
				
			result[line.substr(0, index).trim()] = parseValue(line.substr(index+1).trim());
		}
	}
	
	return result;
}


function parseCharacterFile(filename, callback) {
	fs.readFile(filename, function(err, data){
		if (err) throw err;
		if (typeof callback === "function")
			callback(parseCharacterData(data));
	});
}


module.exports.DEFAULT_HEADER = DEFAULT_HEADER;
module.exports.parseCharacterData = parseCharacterData;
module.exports.parseCharacterFile = parseCharacterFile;
