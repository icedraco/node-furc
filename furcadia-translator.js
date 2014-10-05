var furcadia = require('./furcadia.js');

var EFFECT_TYPES = {
	'a': 'breath',
	'b': 'flame',
	'c': 'glamour'
};


//-----------------------------------------------------------------------------
// Helper Functions
//-----------------------------------------------------------------------------

function stripTags(data) {
	var output = [];
	var tag_opened = false;
	for (var i = 0; i < data.length; i++) {
		if (tag_opened) {
			if (data.charAt(i) === '>')
				tag_opened = false;
		}
		else {
			if (data.charAt(i) === '<')
				tag_opened = true;
			else
				output.push(data.charAt(i));
		}
	}
	return output.join('');
}



//-----------------------------------------------------------------------------
// Functions
//-----------------------------------------------------------------------------

function translateText(emitter, text) {
	var result;
    var data = null;

	//--- Communication
	
	if ((result = text.match(/^<name shortname='([^']+)'>([^<]+)<\/name>: (.*)$/i)) !== null)
	{
		data = {
			shortname: result[1],
			name: result[2],
			text: result[3]
		};

		emitter.emit('say', data);
	}

	else if ((result = text.match(/^<font color='emote'><name shortname='([^']+)'>([^<]+)<\/name> (.*)<\/font>$/i)) !== null)
	{
		data = {
			shortname: result[1],
			name: result[2],
			action: result[3]
		};

		emitter.emit('emote', data);
	}

	else if ((result = text.match(/^<font color='whisper'>\[ <name shortname='([^']+)' src='whisper-from'>([^<]+)<\/name> whispers, "(.*)" to you. ]<\/font>$/i)) !== null)
	{
		data = {
			shortname: result[1],
			name: result[2],
			message: result[3]
		};

		emitter.emit('whisper', data);
	}

	
	//--- Displacement Requests

	else if ((result = text.match(/^<font color='query'><name shortname='([^']+)'>([^<]+)<\/name> requests permission to (join|summon|lead|follow)/i)) !== null)
	{
		data = {
			shortname: result[1],
			name: result[2]
		};

		emitter.emit(result[3] +'Request', data);
	}

	else if ((result = text.match(/^<font color='query'><name shortname='([^']+)'>([^<]+)<\/name> asks you to join his or her company in <b>([^<]+)<\/b>./i)) !== null)
	{
		data = {
			shortname: result[1],
			name: result[2],
			dream: result[3].replace(/[|]/g, ' ')
		};

		emitter.emit('summonRequest', data);
	}


	//--- Displacement Request Confirmations

	else if ((result = text.match(/^<font color='success'><name shortname='([^']+)'>([^<]+)<\/name> (joins|summons) you.<\/font>$/i)) !== null)
	{
		data = {
			shortname: result[1],
			name: result[2]
		};

		switch (result[3]) {
            case "summons":
                emitter.emit('summonAccepted', data);
                break;

            case "joins":
                emitter.emit('joinAccepted', data);
                break;

            default:
                // Ignore
                break;
		}
	}

	else if ((result = text.match(/^<font color='success'><name shortname='([^']+)'>([^<]+)<\/name> begins to (lead|follow) you./i)) !== null)
	{
		data = {
			shortname: result[1],
			name: result[2]
		};

		switch (result[3]) {
            case "lead":
                emitter.emit('lead', data);
                break;

            case "follow":
                emitter.emit('follow', data);
                break;

            default:
                // Ignore
                break;
		}
	}
}


function translate(emitter, buffer) {
	if (!buffer) return;

    var data = null, elems = [], str = "";

	switch (buffer[0]) {
	case 0x21: /* ! */
		emitter.emit('playSound', furcadia.fromBase95(buffer.slice(1).toString()));
		break;
	
	case 0x25: /* % */
		emitter.emit('objectAtFeet', furcadia.fromBase95(buffer.slice(1,3).toString()));
		break;
	
	case 0x28: /* ( */
		var text = buffer.slice(1).toString();
		translateText(emitter, text);
		emitter.emit('text', text);
		break;
	
	case 0x29: /* ) */
		emitter.emit('clearAvatar', furcadia.fromBase220(buffer.slice(1).toString()));
		break;
	
	case 0x2f: /* / */
		data = {
			user_id: furcadia.fromBase220(buffer.slice(1,5).toString()),
			shape:   furcadia.fromBase220(buffer.slice(9,11).toString()),
			target: {
				x: furcadia.fromBase220(buffer.slice(5,7).toString()),
				y: furcadia.fromBase220(buffer.slice(7,9).toString())
			}
		};

		emitter.emit('move', data);
		break;

	case 0x30: /* 0 */
		// TODO: Sync Dream Variables
		break;

	case 0x31: /* 1 */
		// TODO: Set floor tiles
		break;
	
	case 0x32: /* 2 */
		// TODO: Set walls
		break;
	
	case 0x33: /* 3 */
		// TODO: PhoenixSpeak Event
		break;
	
	case 0x36: /* 6 */
		// TODO: Self-induced DragonSpeak Event
		break;
	
	case 0x37: /* 7 */
		// TODO: DragonSpeak Event
		break;
	
	case 0x38: /* 8 */
		// TODO: DragonSpeak Supplement
		break;

	case 0x3b: /* ; */
		emitter.emit('loadMap', buffer.slice(1).toString());
		break;
	
	case 0x3c: /* < */
		var name_len = furcadia.fromBase220(buffer.slice(11,12).toString());

        data = {
			user_id: furcadia.fromBase220(buffer.slice(1,5).toString()),
			shape:   furcadia.fromBase220(buffer.slice(9,11).toString()),
			name:    buffer.slice(11, 11+name_len).toString(),
			location: {
				x: furcadia.fromBase220(buffer.slice(5,7).toString()),
				y: furcadia.fromBase220(buffer.slice(7,9).toString())
			},
			flags_int: 0,
			flags: {},
			afk_time: 0
		};

		// Try to match colors
		if (buffer[0] == 0x74 /* t */) {
			data.color = buffer.slice(0,11).toString();
			data.flags_int = furcadia.fromBase220(buffer.slice(11,12).toString());
			data.afk_time = furcadia.fromBase220(buffer.slice(12,16).toString());
		}

		// Flag helpers
		data.flags.has_profile = Boolean(data.flags_int & 0x01);
		data.flags.set_visible = Boolean(data.flags_int & 0x02);
		data.flags.new_avatar  = Boolean(data.flags_int & 0x04);

		emitter.emit('putAvatar', data);
		break;

	case 0x3d: /* = */
		emitter.emit('resumeOutput');
		break;

	case 0x3e: /* > */
		// TODO: Set Object
		break;

	case 0x40: /* @ */
		data = {
			to: {
				x: furcadia.fromBase95(buffer.slice(1,3).toString()),
				y: furcadia.fromBase95(buffer.slice(3,5).toString())
			}
		};

		if (buffer.length > 5) {
			data.from = {
				x: furcadia.fromBase95(buffer.slice(5,7).toString()),
				y: furcadia.fromBase95(buffer.slice(7,9).toString())
			};
		}

		emitter.emit('camera', data);
		break;
	
	case 0x41: /* A */
		data = {
			user_id: furcadia.fromBase220(buffer.slice(1,5).toString()),
			shape:   furcadia.fromBase220(buffer.slice(9,11).toString()),
			location: {
				x: furcadia.fromBase220(buffer.slice(5,7).toString()),
				y: furcadia.fromBase220(buffer.slice(7,9).toString())
			}
		};

		emitter.emit('setUser', data);
		break;
	
	case 0x42: /* B */
		data = {
			user_id: furcadia.fromBase220(buffer.slice(1,5).toString()),
			shape:   furcadia.fromBase220(buffer.slice(5,7).toString()),
			color:   buffer.slice(7).toString()
		};

		emitter.emit('updateUser', data);
		break;
	
	case 0x43: /* C */
		data = {
			user_id: furcadia.fromBase220(buffer.slice(1,5).toString()),
			location: {
				x: furcadia.fromBase220(buffer.slice(5,7).toString()),
				y: furcadia.fromBase220(buffer.slice(7,9).toString())
			}
		};

		emitter.emit('removeUser', data);
		break;
	
	case 0x5b: /* [ */
		emitter.emit('disconnectMessage', buffer.slice(1).toString());
		break;

	case 0x5d: /* ] */
		switch (buffer[1]) {
		case 0x21: /* ! */
			emitter.emit('currentStandard', buffer.slice(2).toString());
			break;

		case 0x23: /* # */
			// TODO: Display pop-up dialog
			break;

		case 0x24: /* $ */
			emitter.emit('openUrl', buffer.slice(2).toString());
			break;

		case 0x25: /* % */
			data = {
				status: buffer[2] - 0x30,
				name:   buffer.slice(3).toString().replace(/[|]/g, ' ')
			};

			emitter.emit('characterOnlineStatus', data);
            break;

		case 0x26: /* & */
			elems = buffer.slice(2).toString().split(' ');
			data = {
				id: parseInt(elems[0]),
				name: elems[1]
			};

			emitter.emit('portrait', data);
			break;

		case 0x2d: /* - */
			var regularEmit = true;
			data = buffer.slice(2).toString();
			if (data.charAt(0) === '#') {
				switch (data.charAt(1)) {
				case 'A':
					emitter.emit('prefixSpecitag', data.substr(2));
					regularEmit = false;
					break;
				case 'B':
					emitter.emit('prefixBadge', data.substr(2));
					regularEmit = false;
					break;
                default:
                    // Ignore
                    break;
				}
			}

			if (regularEmit)
				emitter.emit('prefixText', buffer.slice(2).toString());
			
			break;

		case 0x33: /* 3 */
			emitter.emit('displayLocalUserlist', buffer[2] - 0x30);
			break;

		case 0x42: /* B */
			emitter.emit('currentUserID', parseInt(buffer.slice(2).toString()));
			break;

		case 0x43: /* C */
			data = {
				type: buffer[2] - 0x30,
				url: buffer.slice(3).toString()
			};

			emitter.emit('bookmarkDream', data);
			break;

		case 0x44: /* D */
			emitter.emit('beginShareEdit');
			break;

		case 0x45: /* E */
			emitter.emit('beginLiveEdit');
			break;

		case 0x46: /* F */
			emitter.emit('endLiveEdit');
			break;

		case 0x47: /* G */
			emitter.emit('disableTab', parseInt(buffer.slice(2).toString()));
			break;

		case 0x48: /* H */
			data = {
				user_id: furcadia.fromBase220(buffer.slice(2,6).toString()),
				offset: {
					x: furcadia.fromBase220(buffer.slice(7,8).toString()),
					y: furcadia.fromBase220(buffer.slice(9,10).toString())
				}
			};

			emitter.emit('offsetAvatar', data);
			break;

		case 0x49: /* I */
			emitter.emit('particleEffect', buffer.slice(2));
			break;

		case 0x4a: /* J */
			emitter.emit('webMapName', buffer.slice(2).toString());
			break;

		case 0x4d: /* M */
			// TODO: Dynamic avatar info		
			break;

		case 0x5d: /* ] */
			emitter.emit('loginFailed');
			break;

		case 0x61: /* a */
			emitter.emit('pendingUpload');
			break;

		case 0x63: /* c */
			if (buffer[2] == 0x63)
				emitter.emit('loadMarbledFile', buffer.slice(3).toString());
			break;

		case 0x66: /* f */
			if (buffer[2] != 0x74 /* t */) {
				data = {
					color: buffer.slice(2,16).toString(),
					name:  buffer.slice(17).toString()
				};
				emitter.emit('look', data);
			}
			break;

		case 0x6a: /* j */
			emitter.emit('playMusic', furcadia.fromBase95(buffer.slice(2).toString()));
			break;

		case 0x71: /* q */
			elems = buffer.slice(3).toString().split(' ');
			data = {
				name: elems[0],
				checksum: elems[1]
			};

			emitter.emit('loadCustomDream', data);
			break;

		case 0x72: /* r */
			elems = buffer.slice(3).toString().split(' ');
			data = {
				name: elems[0],
				checksum: elems[1]
			};

			emitter.emit('loadDefaultDream', data);
			break;

		case 0x73: /* s */
			elems = buffer.slice(8).toString().split(' ');
			data = {
				location: {
					x: furcadia.fromBase95(buffer.slice(2,3).toString()),
					y: furcadia.fromBase95(buffer.slice(4,5).toString())
				},
				name:  elems[0].replace(/[|]/g, ' '),
				title: elems[1].replace(/[|]/g, ' '),
				_unknown_int0: parseInt(elems[2]) // TODO: Figure out the meaning of this
			};

			emitter.emit('setDreamPortal', data);
			break;

		case 0x74: /* t */
			var loc = {
				x: furcadia.fromBase95(buffer.slice(2,3).toString()),
				y: furcadia.fromBase95(buffer.slice(4,5).toString())
			};
			
			emitter.emit('clearDreamPortal', loc);
			break;

		case 0x75: /* u */
			emitter.emit('upload');
			break;

		case 0x76: /* v */
			var typeChar = String.fromCharCode(buffer[2]);
			var typeStr  = EFFECT_TYPES[typeChar] || typeChar;

            data = {
				type: typeStr,
				location: {
					x: furcadia.fromBase95(buffer.slice(3,4).toString()),
					y: furcadia.fromBase95(buffer.slice(5,6).toString())
				}
			};

			emitter.emit('visualEffect', data);
			break;

		case 0x77: /* w */
			emitter.emit('clientVersion');
			break;

		case 0x78: /* x */
			emitter.emit('updateClient');
			break;

		case 0x7a: /* z */
			emitter.emit('uid', parseInt(buffer.slice(2).toString()));
			break;

		case 0x7b: /* { */
			// TODO: "Per-session Counter UID"
			break;

		case 0x7c: /* | */
			emitter.emit('flip', parseInt(buffer.slice(2).toString()));
			break;

		case 0x7d: /* } */
			emitter.emit('currentColorCode', buffer.slice(2).toString());
			break;

		case 0x7e: /* ~ */
			emitter.emit('suppressOutput');
			break;

		default:
			str = buffer.slice(1).toString();
			if (str.startsWith("]marco ")) {
				emitter.emit('marco', str.substr(7));
			}
			break;
		}

		break;

	case 0x5e: /* ^ */
		emitter.emit('objectInHand', furcadia.fromBase95(buffer.slice(1,3).toString()));
		break;
	
	default:
		str = buffer.toString();
		if (str === "Dragonroar")
			emitter.emit('auth');
		else if (str === '&&&&&&&&&&&&&')
			emitter.emit('login');
		
		break;
	}
}


//-----------------------------------------------------------------------------
// Enhancements
//-----------------------------------------------------------------------------

// Extend String to support startsWith()
if (typeof String.prototype.startsWith !== 'function') {
	String.prototype.startsWith = function(part) {
		return this.slice(0, part.length) === part;
	};
}


//-----------------------------------------------------------------------------
// Exports
//-----------------------------------------------------------------------------

module.exports.translate = translate;

