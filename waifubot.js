var discord = require("discord.js");
var http = require('https');
var jsonfile = require('jsonfile');
var util = require('util');

var authdetails = require("./auth.json");

var waifubot = new discord.Client();
var settings;
var streamInterval;

function saveSettings() {jsonfile.writeFile("/home/pi/bots/waifubot/waifubotsettings.js", settings, function (err) {});}

waifubot.on("message", function (message) {
	if (message.channel.id == settings.channels.streams && message.author.id != settings.botId) {
		if (message.content.indexOf("!") === 0) {
			var command = message.content.match(/(".*?"|[^"\s]+)(?=\s*|\s*$)/g);
			if (command[0] === "!stream" || command[0] === "!streams") {
				if (command[1] === "add") {
					if (command[2] != "" && !streamExists(command[2])) {
						settings.streamerList.push({ "msg": "", "name": command[2]});
						saveSettings();
						buildStreamsList();
						waifubot.sendMessage(message.author, command[2] + " has been added senpai");
					}
				} else if (command[1] === "remove") {
					if (command[2] != "" && streamExists(command[2])) {
						var nmsg = "";
						if (settings.streamerList.length > 0) {
							for (var i = 0; i < settings.streamerList.length; i++) {
								if (settings.streamerList[i].name.toLowerCase() == command[2].toLowerCase()) {
									nmsg = settings.streamerList[i].msg; 
									settings.streamerList.splice(i, 1);
									waifubot.sendMessage(message.author, command[2] + " has been removed senpai");
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
				} else if (command[1] === "interval") {
					if (command[2] != "" && !isNaN(command[2])) {
						settings.streamUpdateTime = parseInt(command[2]) * 60 * 1000;
					}
				} else if (command[1] === "refresh") {
					buildStreamsList();
				} else if (command[1] === "list") {
					waifubot.sendMessage(message.author, "The streams I'm watching are " + streamList());
				}
			}
		}
		waifubot.deleteMessage(message);
	}
});

function loggedIn() {
	streamInterval = setTimeout(function () {
		buildStreamsList();
	}, settings.streamUpdateTime);
}

function buildStreamsList() {
	clearTimeout(streamInterval);
	/*var thisLogs = waifubot.getChannel("id", settings.channels.streams).messages;
	if (thisLogs.length > 0) {
		for (var i = 0; i < thisLogs.length; i++) {
			waifubot.deleteMessage(thisLogs[i]);
		}
	}*/
	if (settings.streamerList.length > 0) {
		var url = 'https://api.twitch.tv/kraken/streams?channel=' + streamList();
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
										});
									})();
								}
							}
						} else {
							var msg = settings.streamerList[currentId].msg;
							if (msg != "") {
								var rmsg = waifubot.getChannel("id", settings.channels.streams).getMessage("id", msg);
								if (rmsg) {
									waifubot.deleteMessage(rmsg);
								}
							}
						}
					} else {
						var msg = settings.streamerList[currentId].msg;
						if (msg != "") {
							var rmsg = waifubot.getChannel("id", settings.channels.streams).getMessage("id", msg);
							if (rmsg) {
								waifubot.deleteMessage(rmsg);
							}
						}
					}
				}
				
				/*if (streams.length > 0) {
					for (var i = 0; i < streams.length; i++) {
						var nmsg = "";
						var stream = JSON.parse(body).streams[i].channel;
						var streamerId = -1;
						for (var j = 0; j < settings.streamerList.length; j++) {
							if (settings.streamerList[i].name.toLowerCase() == stream.display_name.toLowerCase()) {
								nmsg = settings.streamerList[j].msg;
								streamerId = j;
							}
						}
						if (nmsg == "") {
							waifubot.sendMessage(settings.channels.streams, "**" + stream.display_name + "** - " + stream.game + " - *" + stream.status + "* " + stream.url, function (err, msg) {
								settings.streamerList[streamerId].msg = msg.id;
								saveSettings();
							});
						} else {
							var rmsg = waifubot.getChannel("id", settings.channels.streams).getMessage("id", nmsg);
							if (rmsg) {
								waifubot.updateMessage(rmsg.id, "**" + stream.display_name + "** - " + stream.game + " - *" + stream.status + "* " + stream.url);
							} else {
								waifubot.sendMessage(settings.channels.streams, "**" + stream.display_name + "** - " + stream.game + " - *" + stream.status + "* " + stream.url, function (err, msg) {
									settings.streamerList[streamerId].msg = msg.id;
									saveSettings();
								});
							}
						}
					}
				}*/
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
function streamList() {
	var str = "";
	if (settings.streamerList.length > 0) {
		for (var i = 0; i < settings.streamerList.length; i++) {
			if (str != "")
				str += ",";
			str += settings.streamerList[i].name;
		}
	}
	return str;
}

jsonfile.readFile("/home/pi/bots/waifubot/waifubotsettings.js", function (err, obj) {
	settings = obj;
	waifubot.login(authdetails.email, authdetails.password, function (err2, token) {
		if(!err2)
			loggedIn();
	});
});