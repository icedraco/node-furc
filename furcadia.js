//------------------------------------------------------------------------------
// Furcadia Number Systems
//------------------------------------------------------------------------------


function fromBase95(b95num) {
	var num = 0;
	var mult = 1;

	for (var i = b95num.length - 1; i >= 0; i--) {
		num  += (b95num.charCodeAt(i) - 0x20) * mult;
		mult *= 95;
	}
	
	return num;
}


function toBase95(num, len) {
	var buffer = [];
	
	// Length is optional
	if (typeof len !== "number")
		len = 1;
	
	// Conversion
	while (num > 0) {
		buffer.push( String.fromCharCode( (num % 95) + 0x20 ) );
		num = ~~(num/95); // Beats Math.floor()
	}
	
	// Padding
	len -= buffer.length;
	while (len > 0) {
		buffer.push(' ');
		len--;
	}
	
	return buffer.reverse().join('');
}


function fromBase220(b220num) {
	var num = 0;
	var mult = 1;
	
	for (var i = 0; i < b220num.length; i++) {
		num  += (b220num.charCodeAt(i) - 0x23) * mult;
		mult *= 220;
	}
	
	return num;
}


function fromBase220(num, len) {
	var buffer = [];
	
	// Length is optional
	if (typeof len !== "number")
		len = 1;
	
	// Conversion
	while (num > 0) {
		buffer.push( String.fromCharCode( (num % 220) + 0x23 ) );
		num = ~~(num/220); // Beats Math.floor()
	}
	
	// Padding
	len -= buffer.length;
	while (len > 0) {
		buffer.push(' ');
		len--;
	}
	
	return buffer.reverse().join('');
}


//------------------------------------------------------------------------------
// Shortnames
//------------------------------------------------------------------------------

function isAlphaNum(ch) {
	var ch = ch.charCodeAt(0) | 0x20; // Lowercase
	return (ch >= 0x30 && ch <= 0x39) ||
		   (ch >= 0x61 && ch <= 0x7a);
}


function shortname(name) {
	var output = [];
	name = name.toLowerCase();
	for (var i = 0; i < name.length; i++) {
		var ch = name.charAt(i);
		if (isAlphaNum(ch))
			output.push(ch);
	}
	
	return output.join('');
}


function shorturl(dreamUrl) {
	return module.exports.shortname(
					dreamUrl.substr(0,7) === "furc://" ? dreamUrl.substr(7) : dreamUrl
				);
}



//------------------------------------------------------------------------------
// Exports
//------------------------------------------------------------------------------

module.exports.fromBase95 = fromBase95;
module.exports.toBase95 = toBase95;
module.exports.fromBase220 = fromBase220;
module.exports.toBase220 = fromBase220;
module.exports.shortname = shortname;
module.exports.shorturl = shorturl;
