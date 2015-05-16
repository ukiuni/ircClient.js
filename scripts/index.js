var remote = require('remote');
var ircConnector = remote.require('./scripts/irc');
var preference = remote.require('./scripts/preference');

var connections = preference.load("CONNECTIONS");
function scrollIfNeeds() {
	var scrollHeight = $("#messageInnerArea").height();
	var scrollPosition = $("#messageArea").height() + $("#messageArea").scrollTop();
	if ((scrollHeight - scrollPosition) < 20) {
		setTimeout(function() {
			$("#messageArea").scrollTop($("#messageInnerArea").height());
		}, 0);
	}
}
function sanitaize(str) {
	return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};
if (!connections) {
	connections = require("./config/config.json");
}
angular.module('ircApp', []).controller('ircController', [ "$scope", function($scope) {
	var irc = $scope;
	$scope.connections = connections;
	$scope.myNickname = connections.nickname;
	irc.handleKeydown = function(e) {
		if (13 == e.which && "" != $scope.newMessage) {
			ircConnector.say($scope.currentHost, $scope.currentChannel, $scope.newMessage);
			$scope.messages.push({
				name : $scope.myNickname,
				text : $scope.newMessage
			});
			scrollIfNeeds();
			$scope.newMessage = '';
		}
	}
	irc.addServer = function(server) {
		// TODO
	};

	irc.removeServer = function(server) {
		// TODO
	};

	irc.selectChannel = function(host, channel) {
		$scope.currentHost = host;
		$scope.currentChannel = channel;
		$scope.messages = messages[host + ":" + channel];
		$scope.hasNewMessageMap[host + ":" + channel] = false;
		$scope.hasNotificationMessageMap[host + ":" + channel] = false;
	};
	$scope.hasNewMessageMap = [];
	$scope.hasNotificationMessageMap = [];
	irc.hasNewMessage = function(host, channel) {
		return ($scope.hasNewMessageMap[host + ":" + channel])
	}
	irc.hasNotificationMessage = function(host, channel) {
		return ($scope.hasNotificationMessageMap[host + ":" + channel])
	}
	irc.isSelectChannel = function(host, channel) {
		return $scope.currentHost == host && $scope.currentChannel == channel;
	}
	$scope.logs = [];
	$scope.users = [];
	var messages = [];
	for ( var i in $scope.connections.servers) {
		var connectHost = $scope.connections.servers[i];
		for ( var j in connectHost.channels) {
			var channel = connectHost.channels[j];
			messages[connectHost.network + ":" + channel] = [];
		}
		function userJoined(host, channel, nick) {
			var users = $scope.users[host + ":" + channel];
			if (!users) {
				users = [];
				$scope.users[host + ":" + channel] = users;
			}
			var isThere = false;
			for ( var key in users) {
				if (nick == users[key]) {
					isThere = true;
					break;
				}
			}
			if (!isThere) {
				users.push(nick);
				users.sort();
			}
		}
		function userParted(host, channel, nick) {
			var users = $scope.users[host + ":" + channel];
			if (users) {
				var i = 0;
				for ( var key in users) {
					if (nick == users[key]) {
						users.splice(i, 1)
					} else {
						i++;
					}
				}
			}
		}
		ircConnector.connect($scope.myNickname, connectHost.network, connectHost.channels, function(host, message) {
			if (!message) {
				return;
			}
			if ("PING" == message.rawCommand) {
				return;
			}
			$scope.$apply(function() {
				if ("PRIVMSG" == message.rawCommand) {
					var channel = message.args[1];
					var messageObj
					if (331 == message.rawCommand) {
						channel = message.args[1];
						messageObj = {
							name : message.args[0],
							text : message.args[2]
						};
					} else if("PRIVMSG" == message.rawCommand){
						channel = message.args[0];
						messageObj = {
							name : message.nick,
							text : message.args[1]
						};
					}
					messages[host + ":" + channel].push(messageObj);
					if (messages[host + ":" + channel] != $scope.messages) {
						$scope.hasNewMessageMap[host + ":" + channel] = true;
					}
					// TODO valious notification message
					if (messageObj.text.indexOf($scope.myNickname) >= 0) {
						$scope.hasNotificationMessageMap[host + ":" + channel] = true;
					}
					scrollIfNeeds();
				} else if (353 == message.rawCommand) {
					var channel = message.args[2];
					userJoined(host, channel, message.args[3]);
				} else if ("JOIN" === message.rawCommand) {
					var channel = message.args[0];
					userJoined(host, channel, message.nick);
				} else if ("PART" === message.rawCommand) {
					var channel = message.args[0];
					userParted(host, channel, message.nick);
				}
				message.time = new Date();
				$scope.logs.push(JSON.stringify(message));
			});
		});
	}
	$scope.currentHost = $scope.connections.servers[0].network;
	$scope.currentChannel = $scope.connections.servers[0].channels[0];
	$scope.messages = messages[$scope.currentHost + ":" + $scope.currentChannel];

} ]).filter('highlight', [ "$sce", function($sce) {
	return function(text, phrase) {
		if (!text) {
			return "";
		}
		if (phrase) {
			text = sanitaize(text).replace(new RegExp('(' + phrase + ')', 'gi'), '<span class="highlighted">$1</span>')
		}
		return $sce.trustAsHtml(text)
	}
} ]);