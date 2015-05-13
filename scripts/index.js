var remote = require('remote');
var ircConnector = remote.require('./scripts/irc');
var preference = remote.require('./scripts/preference');

var connections = preference.load("CONNECTIONS");
function scrollIfNeeds() {
	var scrollHeight = $("#messageInnerArea").height();
	var scrollPosition = $("#messageArea").height() + $("#messageArea").scrollTop();
	if ((scrollHeight - scrollPosition) / scrollHeight === 0) {
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
	var messages = [];
	for ( var i in $scope.connections.servers) {
		var connectHost = $scope.connections.servers[i];
		for ( var j in connectHost.channels) {
			var channel = connectHost.channels[j];
			messages[connectHost.network + ":" + channel] = [];
		}
		ircConnector.connect($scope.myNickname, connectHost.network, connectHost.channels, function(host, from, channel, message) {
			$scope.$apply(function() {
				var messageObj = {
					name : from,
					text : message
				};
				messages[host + ":" + channel].push(messageObj);
				if (messages[host + ":" + channel] != $scope.messages) {
					$scope.hasNewMessageMap[host + ":" + channel] = true;
				}
				// TODO valious notification message
				if (message.indexOf($scope.myNickname) >= 0) {
					$scope.hasNotificationMessageMap[host + ":" + channel] = true;
				}
				scrollIfNeeds();
			});
		});
	}
	$scope.currentHost = $scope.connections.servers[0].network;
	$scope.currentChannel = $scope.connections.servers[0].channels[0];
	$scope.messages = messages[$scope.currentHost + ":" + $scope.currentChannel];

} ]).filter('highlight', [ "$sce", function($sce) {
	return function(text, phrase) {
		if (phrase) {
			text = sanitaize(text).replace(new RegExp('(' + phrase + ')', 'gi'), '<span class="highlighted">$1</span>')
		}
		return $sce.trustAsHtml(text)
	}
} ]);