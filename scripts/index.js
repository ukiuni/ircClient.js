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

	irc.changeMessage = function(host, channel) {
		$scope.currentHost = host;
		$scope.currentChannel = channel;
		$scope.messages = messages[host + ":" + channel];
	};
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
				scrollIfNeeds();
			});
		});
	}
	$scope.currentHost = $scope.connections.servers[0].network;
	$scope.currentChannel = $scope.connections.servers[0].channels[0];
	$scope.messages = messages[$scope.currentHost + ":" + $scope.currentChannel];

} ]);