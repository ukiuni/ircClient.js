var irc = require('irc');
var hostMap = [];
var exports = {
	connect : function(nickname, host, channels, callback) {
		var client = null;
		if (hostMap[host]) {
			client = hostMap[host];
			for ( var i in channels) {
				channel = channels[i];
				client.join(channel)
			}
		} else {
			var client = new irc.Client(host, nickname, {
				channels : channels
			});
			hostMap[host] = client;
		}
		if (callback) {
			client.addListener('raw', function(message) {
				callback(host, message);
			});
		}
	},
	say : function(host, channel, message) {
		hostMap[host].say(channel, message);
	},
	join : function(host, channel) {
		hostMap[host].join(channel);
	}
};

module.exports = exports;