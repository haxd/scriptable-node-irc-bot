init = function() {
	//
};

info = function() {
	return "Google Script Test";
};

event_message = function(from, to, msg) {
	var respond = '';

	if (to == me) {
		respond = from;
	} else {
		respond = to;
	}

	if (msg.substr(0, "!gasync".length) == "!gasync") {
		run(respond, msg.substr("!gasync ".length));
	}
};


rtt = function(tag, b) {
	var text = '';

	for (var i = 0; i < tag.children.length; i++) {
		if (tag.children[i].type == 'text') {
			if (tag.name == 'em') text += b;
			text += tag.children[i].data;
			if (tag.name == 'em') text += b;
		}

		if (tag.children[i].children) {
			text += rtt(tag.children[i], b);
		}
	}

	return text;
};

run = function(res, query) {
	var request = require('request');
	var htmlparser = require('htmlparser');
  var select = require('soupselect').select;

	var url = 'http://google.com/search?q=' + encodeURIComponent(query);

	request({uri: url}, function(err, resp, body) {
		if (!err) {
			var handler = new htmlparser.DefaultHandler(function(err, dom) {
				if (err) {
					logit('Err: ' + err);
				} else {
					var ires = select(dom, '#ires ol li .r a');
					var max = 10;
					var c = 0;

					var b = String.fromCharCode(2);
					var u = String.fromCharCode(37);
					var i = String.fromCharCode(26);
					var n = String.fromCharCode(17);
					var cl = String.fromCharCode(3);

					var cs = {
						white: 0,
						black: 1,
						blue: 2,
						green: 3,
						lightred: 4,
						brown: 5,
						purple: 6,
						orange: 7,
						yellow: 8,
						lightgreen: 9,
						cyan: 10,
						lightcyan: 11,
						lightblue: 12,
						pink: 13,
						grey: 14,
						lightgrey: 15
					};

					var google = b+cl+'2G'+cl+'4o'+cl+'7o'+cl+'2g'+cl+'3l'+cl+'4e'+cl+b;

					var mess = [google];

					ires.forEach(function(result) {
						c++;
						if (c >= max) return;

						var link = result.attribs.href;

						text = rtt(result, b);
						text = text.replace('&#39;', "'");
						text = text;

						if (link.charAt(0) == '/') link = 'http://google.com' + link;

						mess.push(text + ' (' +cl+'2'+ link +cl+ ')');
					});

					var chl = 'PRIVMSG ' + res + ' :';
					var maxlength = 450;
					var messagelength = maxlength - chl.length;

					var joinc = ' | ';

					var sendqueue = [];
					var message = [];

					var combined = function(arr, joi) {
						var len = 0;

						if (arr.length > 0) {
							for (var i = 0; i < arr.length; i++) {
								len += arr[i].length + joi.length;
							}
						}

						return len;
					};

					var total = combined(mess, joinc);

					if (total < messagelength) {
						say(res, mess.join(joinc));
					} else {
						for (var i = 0; i < mess.length; i++) {
							var sofar = combined(sendqueue, joinc);
							var next = mess[i].length;

							if (sofar + next < messagelength) {
								sendqueue.push(mess[i]);
							} else {
								message.push(sendqueue.join(joinc));
								sendqueue = [];
							}
						}

						if (sendqueue.length > 0) {
							message.push(sendqueue.join(joinc));
							sendqueue = [];
						}

						for (var i = 0; i < message.length; i++) {
							say(res, message[i]);
						}
					}
				}
			});
			
			var parser = new htmlparser.Parser(handler);
			parser.parseComplete(body);
		}
	});
};
/*
if (undefined == this['me']) {
	// Test
	//
	
	say = function(nick, msg) {
		console.log('-> ' + nick + ': ' + msg);
	};
	
	run('#supertorrents', 'Harry Potter');
}*/
