var discord = require("discord.js");
var http = require('https');
var jsonfile = require('jsonfile');
jsonfile.spaces = 4;
var util = require('util');

var auth = require("./auth.json");
var settings = require("./waifubotsettings.json");

var waifubot = new discord.Client();
var streamInterval;

function saveSettings() {
	jsonfile.writeFile("/home/pi/bots/waifubot/waifubotsettings.json", settings, function (err) {});
}

waifubot.on("message", function (message) {
	if (message.author.id != settings.botId) {
		if (message.content.indexOf("!") === 0) {
			var command = message.content.match(/(".*?"|[^"\s]+)(?=\s*|\s*$)/g);
			if (message.channel.id == settings.channels.streams) { // Only handle stream related messages in the stream channel
				if (command[0] === "!stream" || command[0] === "!streams") {
					if (command[1] === "add") { // Add a stream to the list
						if (command[2] != "" && !streamExists(command[2])) {
							settings.streamerList.push({ "msg": "", "name": command[2]});
							saveSettings();
							buildStreamsList();
							waifubot.sendMessage(message.author, command[2] + " has been added");
							console.log("(STREAM) " + message.author.username + " added " + command[2]);
						}
					} else if (command[1] === "remove") { // Remove a stream from the list
						if (command[2] != "" && streamExists(command[2])) {
							var nmsg = "";
							if (settings.streamerList.length > 0) {
								for (var i = 0; i < settings.streamerList.length; i++) {
									if (settings.streamerList[i].name.toLowerCase() == command[2].toLowerCase()) {
										nmsg = settings.streamerList[i].msg; 
										settings.streamerList.splice(i, 1);
										waifubot.sendMessage(message.author, command[2] + " has been removed");
										console.log("(STREAM) " + message.author.username + " removed " + command[2]);
										break;
									}
								}
							}
							if (nmsg != "") {
								var rmsg = waifubot.getChannel("id", settings.channels.streams).getMessage("id", nmsg);
								if (rmsg) {
									waifubot.deleteMessage(rmsg);
								}
							}
							saveSettings();
							buildStreamsList();
						}
					} else if (command[1] === "interval") { // Change the interval for updates
						if (command[2] != "" && !isNaN(command[2])) {
							settings.streamUpdateTime = parseInt(command[2]) * 60 * 1000;
							saveSettings();
							console.log("(STREAM) Interval changed to " + command[2]);
						}
					} else if (command[1] === "refresh") { // Force update the streams
						buildStreamsList();
					} else if (command[1] === "list") { // PM a list of the streams that will be checked
						waifubot.sendMessage(message.author, "The streams I'm watching are " + streamList(true));
					}
				}
				waifubot.deleteMessage(message);
			}
		}
	}
});
waifubot.on("disconnected", function () {
	console.log("Disconnected, reconnecting in 1 minute");
	clearInterval(streamInterval);
	streamInterval = setTimeout(function () {
		waifubot.login(auth.email, auth.password)
			.then(function (token) {
				loggedIn();
			}).catch(function (err) {
				console.log("Login failed");
			});
	}, 60000);
});

function loggedIn() {
	console.log("Connected");
	streamInterval = setTimeout(function () {
		buildStreamsList();
	}, settings.streamUpdateTime);
}

function buildStreamsList() {
	clearTimeout(streamInterval);
	if (settings.streamerList.length > 0) {
		var url = 'https://api.twitch.tv/kraken/streams?channel=' + streamList(false);
		http.get(url, function (res) {
			var body = '';

			res.on('data', function (chunk) {
				body += chunk;
			});

			res.on('end', function () {
				var streams = JSON.parse(body).streams;
				for (var j = 0; j < settings.streamerList.length; j++) {
					var stream = null;
					var currentId = j;
					if (streams.length > 0) {
						for (var i = 0; i < streams.length; i++) {
							if (settings.streamerList[currentId].name.toLowerCase() == JSON.parse(body).streams[i].channel.name.toLowerCase()) {
								stream = JSON.parse(body).streams[i];
								break;
							}
						}
						if(stream != null) {
							var nmsg = settings.streamerList[currentId].msg;
							if (nmsg == "") {
								(function () {
									var myId = currentId;
									waifubot.sendMessage(settings.channels.streams, "**" + stream.channel.status + "**\n" + stream.channel.display_name + " *playing* " + stream.channel.game + " -*" + stream.viewers + "*-\n" + stream.channel.url, function (err, msg) {
										settings.streamerList[myId].msg = msg.id;
										saveSettings();
									});
								})();
							} else {
								var rmsg = waifubot.getChannel("id", settings.channels.streams).getMessage("id", nmsg);
								if (rmsg) {
									waifubot.updateMessage(rmsg, "**" + stream.channel.status + "**\n" + stream.channel.display_name + " *playing* " + stream.channel.game + " -*" + stream.viewers + "*-\n" + stream.channel.url);
								} else {
									(function () {
										var myId = currentId;
										waifubot.sendMessage(settings.channels.streams, "**" + stream.channel.status + "**\n" + stream.channel.display_name + " *playing* " + stream.channel.game + " -*" + stream.viewers + "*-\n" + stream.channel.url, function (err, msg) {
											settings.streamerList[myId].msg = msg.id;
											saveSettings();
										});
									})();
								}
							}
						} else {
							var msg = settings.streamerList[currentId].msg;
							if (msg != "") {
								var rmsg = {
									"id": msg,
									"channel": {
										"id": settings.channels.streams
									}
								};
								if (rmsg) {
									waifubot.deleteMessage(rmsg);
								}
							}
							settings.streamerList[currentId].msg = "";
							saveSettings();
						}
					} else {
						var msg = settings.streamerList[currentId].msg;
						if (msg != "") {
							var rmsg = {
								"id": msg,
								"channel": {
									"id": settings.channels.streams
								}
							};
							if (rmsg) {
								waifubot.deleteMessage(rmsg);
							}
						}
						settings.streamerList[currentId].msg = "";
						saveSettings();
					}
				}
			});
		});
	}
	streamInterval = setTimeout(function () {
		buildStreamsList();
	}, settings.streamUpdateTime);
}

function streamExists(streamName) {
	if (settings.streamerList.length > 0) {
		for (var i = 0; i < settings.streamerList.length; i++) {
			if (settings.streamerList[i].name.toLowerCase() == streamName.toLowerCase())
				return true;
		}
	}
	return false;
}
function streamList(spaced) {
	var str = "";
	if (settings.streamerList.length > 0) {
		for (var i = 0; i < settings.streamerList.length; i++) {
			if (str != "") {
				str += ",";
				if (spaced)
					str += " ";
			}
			str += settings.streamerList[i].name;
		}
	}
	return str;
}

waifubot.login(auth.email, auth.password)
	.then(function (token) {
		loggedIn();
	}).catch(function (err) {
		console.log("Login failed");
	});