var util = require('util');
var events = require('events');

function LineBuffer(data, callback) {
	var self = this;
	self.buf = new Buffer(data || "");

	// EventEmitter constructor
	events.EventEmitter.call(self);

	self.write = function(newBuffer) {
		if (typeof newBuffer === 'string')
			newBuffer = new Buffer(newBuffer);

		var tempbuf = Buffer.concat([self.buf, newBuffer]);
		var start_index = 0; // Slice start index
		for (var i = self.buf.length; i < tempbuf.length; i++) {
			if (tempbuf[i] == 0x0a) {
				self.emit('data', tempbuf.slice(start_index, i));
				start_index = i+1;
			}
		}

		self.buf = tempbuf.slice(start_index);
	};

	if (typeof callback == 'function')
		self.on('data', callback);
}

util.inherits(LineBuffer, events.EventEmitter);


module.exports.LineBuffer = LineBuffer;

