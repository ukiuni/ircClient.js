var remote = require('remote');
var ircConnector = remote.require('./scripts/irc');
var preference = remote.require('./scripts/preference');

var connections = preference.load("CONNECTIONS");

if (connections) {
	for ( var serverIndex in connections.servers) {
		var server = connections.servers[serverIndex];
		if (server.$$hashKey) {
			server.$$hashKey = null;
			delete server["$$hashKey"];
		}
	}
	connections = angular.copy(connections);
} else {
	connections = require("./config/config.json");
}

function scrollIfNeeds() {
	var scrollHeight = $("#messageInnerArea").height();
	var scrollPosition = $("#messageArea").height() + $("#messageArea").scrollTop();
	if ((scrollHeight - scrollPosition) < 20) {
		setTimeout(function() {
			$("#messageArea").scrollTop($("#messageInnerArea").height());
		}, 0);
	}
}
function showNotificationIfNeeds(title, text, callback) {
	if (!document.hasFocus()) {
		var notifyWindow = new Notification(title, {
			icon : "",
			body : text
		});
		notifyWindow.onclick = function() {
			window.focus();
			if (callback) {
				callback();
			}
		};
	}
}
function sanitaize(str) {
	return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};
angular.module('ircApp', [ 'ng-context-menu', 'ui.bootstrap' ]).controller('ircController', [ "$scope", "$modal", function($scope, $modal) {
	var irc = $scope;
	$scope.connections = connections;
	$scope.myNickname = connections.nickname;
	irc.handleKeydown = function(e) {
		if (13 == e.which && "" != $scope.newMessage) {
			ircConnector.say($scope.currentHost, $scope.currentChannel, $scope.newMessage);
			$scope.messages.push({
				name : $scope.myNickname,
				text : $scope.newMessage,
				date : new Date()
			});
			scrollIfNeeds();
			$scope.newMessage = '';
		}
	}
	function openOneValueDialog(message, placeholder, callback) {
		var dialogController = [ "$scope", "$modalInstance", function($scope, $modalInstance) {
			$scope.message = message;
			$scope.placeholder = placeholder;
			$scope.save = function() {
				$modalInstance.close({
					func : "save",
					item : $scope.argument
				});
			}
		} ];
		var modalInstance = $modal.open({
			templateUrl : 'oneValueDialog.html?time=' + new Date().getTime(),
			controller : dialogController,
		});
		modalInstance.result.then(function(res) {
			if ("save" == res.func) {
				callback(res.item);
			}
		}, function() {
		});
	}

	function openConfirmDialog(message, callback) {
		var dialogController = [ "$scope", "$modalInstance", function($scope, $modalInstance) {
			$scope.message = message;
			$scope.save = function() {
				$modalInstance.close({
					func : "save",
					item : $scope.argument
				});
			}
		} ];
		var modalInstance = $modal.open({
			templateUrl : 'confirmDialog.html?time=' + new Date().getTime(),
			controller : dialogController,
		});
		modalInstance.result.then(function(res) {
			if ("save" == res.func) {
				callback(res.item);
			}
		}, function() {
		});
	}

	$scope.openAddChannelDialog = function(host) {
		openOneValueDialog("Add channel to " + host, "channel", function(channel) {
			if (channel.lastIndexOf("#", 0) !== 0) {
				channel = "#" + channel;
			}
			irc.addChannel(host, channel);
		})
	}

	$scope.openRemoveServerDialog = function(host) {
		openConfirmDialog("Delete host \"" + host + "\" ?", function() {
			irc.removeServer(host);
		})
	}

	$scope.openDeleteChannelDialog = function(host, channel) {
		openConfirmDialog("Delete channel \"" + channel + "\" ?", function() {
			irc.removeChannel(host, channel);
		})
	}

	$scope.openAddServerDialog = function() {
		var dialogController = [ "$scope", "$modalInstance", function($scope, $modalInstance) {
			$scope.newServer = {};
			$scope.newServer.name = "";
			$scope.newServer.network = "";
			$scope.newServer.port = "";
			$scope.save = function() {
				$modalInstance.close({
					func : "save",
					item : $scope.newServer
				});
			}
		} ];
		var modalInstance = $modal.open({
			templateUrl : 'addServerDialog.html?time=' + new Date().getTime(),
			controller : dialogController,
		});
		modalInstance.result.then(function(res) {
			if ("save" == res.func) {
				irc.addServer(res.item);
			}
		}, function() {
		});
	}
	irc.addServer = function(server) {
		if (findServerFromList(server.network)) {
			return;
		}
		var newServer = {};
		newServer.name = server.name;
		newServer.network = server.network;
		newServer.port = parseInt(server.port);
		newServer.channels = [];
		$scope.connections.servers.push(newServer);
		preference.save("CONNECTIONS", $scope.connections);
	};

	irc.removeServer = function(host) {
		for ( var serverKey in $scope.connections.servers) {
			if ($scope.connections.servers[serverKey].network == host) {
				delete $scope.connections.servers[serverKey];
				preference.save("CONNECTIONS", $scope.connections);
				ircConnector.disconnect(host);
				return;
			}
		}
	};

	irc.addChannel = function(host, channel) {
		var server = findServerFromList(host);
		if (server) {
			var isThere = false;
			for ( var i in server.channels) {
				if (server.channels[i] == channel) {
					isThere = true;
					break;
				}
			}
			if (!isThere) {
				if (!server.channels) {
					server.channels = [];
				}
				server.channels.push(channel);
				preference.save("CONNECTIONS", $scope.connections);
				ircConnector.join(host, channel);
				messages[host + ":" + channel] = [];
			}
		}
	};

	irc.removeChannel = function(host, channel) {
		var server = findServerFromList(host);
		if (server) {
			for ( var i in server.channels) {
				if (server.channels[i] == channel) {
					delete server.channels[i];
					ircConnector.part(host, channel);
					preference.save("CONNECTIONS", $scope.connections);
					return;
				}
			}
		}
	};

	function findServerFromList(host) {
		for ( var serverKey in $scope.connections.servers) {
			var server = $scope.connections.servers[serverKey];
			if (host == server.network) {
				return server;
			}
		}
	}
	function saveOldScrollTop(host, channel) {
		$scope.scrollTopsMap[host + ":" + channel] = $("#messageInnerArea").height() - $("#messageArea").scrollTop();
	}
	irc.selectChannel = function(host, channel) {
		saveOldScrollTop($scope.currentHost, $scope.currentChannel);
		$scope.currentHost = host;
		$scope.currentChannel = channel;
		$scope.messages = messages[host + ":" + channel];
		$scope.hasNewMessageMap[host + ":" + channel] = false;
		$scope.hasNotificationMessageMap[host + ":" + channel] = false;
		setTimeout(function() {
			$scope.$apply(function() {
				$("#messageArea").scrollTop($("#messageInnerArea").height() - $scope.scrollTopsMap[host + ":" + channel]);
			});
		}, 0);
	};
	$scope.scrollTopsMap = []
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
	irc.startPrivateMessage = function(host, user, notShow) {
		messages[host + ":" + user] = [];
		for ( var serverKey in $scope.connections.servers) {
			var server = $scope.connections.servers[serverKey];
			if (host == server.network) {
				server.channels.push(user);
				break;
			}
		}
		$scope.users[host + ":" + user] = [ user ];
		if (!notShow) {
			irc.selectChannel(host, user);
		}
	}
	$scope.logs = [];
	$scope.users = [];
	var messages = [];
	for ( var scopeServerKey in $scope.connections.servers) {
		var connectHost = $scope.connections.servers[scopeServerKey];
		for ( var j in connectHost.channels) {
			var channel = connectHost.channels[j];
			messages[connectHost.network + ":" + channel] = [];
		}
		function userJoined(host, channel, nicks) {
			var users = $scope.users[host + ":" + channel];
			if (!users) {
				users = [];
				$scope.users[host + ":" + channel] = users;
			}
			for ( var nickKey in nicks) {
				var nick = nicks[nickKey];
				var isThere = false;
				for ( var key in users) {
					if (nick == users[key]) {
						isThere = true;
						break;
					}
				}
				if (!isThere) {
					users.push(nick);
				}
			}
			users.sort();
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
					} else if ("PRIVMSG" == message.rawCommand) {
						channel = message.args[0];
						if ($scope.myNickname == channel) {
							channel = message.nick;
						}
						messageObj = {
							name : message.nick,
							text : message.args[1],
							date : new Date()
						};
					}
					if (!messages[host + ":" + channel]) {
						irc.startPrivateMessage(host, channel, true);
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
					showNotificationIfNeeds("[" + messageObj.name + " → " + channel + "]", messageObj.text, function() {
						$scope.$apply(function() {
							irc.selectChannel(host, channel);
						});
					});
				} else if (353 == message.rawCommand) {
					var channel = message.args[2];
					userJoined(host, channel, message.args[3].split(" "));
				} else if ("JOIN" === message.rawCommand) {
					var channel = message.args[0];
					userJoined(host, channel, [ message.nick ]);
				} else if ("PART" === message.rawCommand) {
					var channel = message.args[0];
					userParted(host, channel, message.nick);
				} else if ("NICK" === message.rawCommand) {
					var oldNick = message.nick;
					var newNick = message.args[0];
					for ( var userArrayKey in $scope.users) {
						if (userArrayKey.lastIndexOf(host + ":", 0) === 0) {
							for ( var userKey in $scope.users[userArrayKey]) {
								if (oldNick === $scope.users[userArrayKey][userKey]) {
									$scope.users[userArrayKey][userKey] = newNick;
								}
							}
						}
					}
				}
				message.time = new Date();
				$scope.logs.push(JSON.stringify(message));
			});
		}, function(host, error) {

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