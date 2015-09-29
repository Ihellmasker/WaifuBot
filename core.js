var discord = require("discord.js");
var http = require('https');
var jsonfile = require('jsonfile');
jsonfile.spaces = 4;
var util = require('util');

var auth = require("./auth.json");
var settings = require("./settings.json");

var waifubot = new discord.Client();
var streamIntTimer;

var commandPrefix = "!";
var _commands = {
	"stream": {
		"channels": "streams",
		"subs": {
			"add": {
			    "function": streamAdd
			},
			"remove": {
				"function": streamRemove
			},
			"interval": {
				"function": streamIntervalChange
			},
			"refresh": {
				"function": streamRefresh
			},
			"list": {
				"function": streamList
			}
		}
	},
	"streams": {
		"aliasOf": "stream"
	}
};

function saveSettings() {
	jsonfile.writeFile("/home/pi/bots/waifubot/settings.json", settings, function (err) {});
}

waifubot.on("message", function (message) {
    if (message.author.id != settings.botId) { // Make sure the bot doesn't handle itself
        if (message.content.indexOf(commandPrefix) === 0 && message.content.length >= 2) {
            var stripedMessage = message.content.replace(commandPrefix, "");
            var params = stripedMessage.match(/(".*?"|[^"\s]+)(?=\s*|\s*$)/g);
            commandHandler(params, _commands, message);
        }
    }
});
function commandHandler(params, commands, message) {
    if (params.length <= 0) return null; // Make sure it wasn't ran with no params

    if (typeof (commands[params[0]]) !== "undefined") { // Checks if the lowest parameter exists on the current command level
        if (typeof (commands[params[0]].aliasOf) === "undefined") { // Check this isn't an alias command
            if (params.length > 1 && typeof (commands[params[0]].subs) !== "undefined" && Object.keys(commands[params[0]].subs).length > 0) { // Has sub commands and sufficient params
                commandHandler(params.slice(1), commands[params[0]].subs, message);
            } else if (typeof (commands[params[0]].function) !== "undefined") { // If a function exists for this command
                commands[params[0]].function(params.slice(1), message);
            } else { // This command exists but theres nothing to handle this specific instance of it
                console.log("TODO: Return list of related functions");
            }
        } else { // Handle as an alias command
            params[0] = commands[params[0]].aliasOf;
            commandHandler(params, commands, message);
        }
    } else {
        console.log("TODO: Command doesn't exist");
    }
}

function streamAdd(params, message) {
	console.log("STREAM ADD");
    if (params.length <= 0) {
        console.log("TODO: Missing param error");
        return null; // Requires extra parameters to run
    }

    if (params[0] != "" && !streamExists(params[0])) {
        settings.streamerList.push({ "msg": "", "name": params[0] });
        saveSettings();
        buildStreamsList();
        waifubot.sendMessage(message.author, params[0] + " has been added");
        console.log("(STREAM) " + message.author.username + " added " + params[0]);
    } else {
        console.log("TODO: Stream exists error");
    }
	
	waifubot.deleteMessage(message);
}
function streamRemove(params, message) {
	console.log("STREAM REMOVE");
    if (params.length <= 0) {
        console.log("TODO: Missing param error");
        return null; // Requires extra parameters to run
    }

    if (params[0] != "" && !streamExists(params[0])) {
        var savedMessageId = "";
        if (settings.streamerList.length > 0) {
            for (var i = 0; i < settings.streamerList.length; i++) {
                if (settings.streamerList[i].name.toLowerCase() == params[0].toLowerCase()) {
                    savedMessageId = settings.streamerList[i].msg;
                    settings.streamerList.splice(i, 1);
                    waifubot.sendMessage(message.author, params[0] + " has been removed");
                    console.log("(STREAM) " + message.author.username + " removed " + params[0]);
                    break;
                }
            }
        }
        if (savedMessageId != "") {
            var messageObj = waifubot.getChannel("id", settings.channels.streams).getMessage("id", savedMessageId);
            if (messageObj) {
                waifubot.deleteMessage(messageObj);
            }
        }
        saveSettings();
        buildStreamsList();
    } else {
        console.log("TODO: Stream doesnt exist error");
    }
	
	waifubot.deleteMessage(message);
}
function streamIntervalChange(params, message) {
	console.log("STREAM INTERVAL");
    if (params.length <= 0) {
        console.log("TODO: Missing param error");
        return null; // Requires extra parameters to run
    }

    if (params[0] != "" && !isNaN(params[0])) {
        settings.streamUpdateTime = parseInt(params[2]) * 60 * 1000;
        saveSettings();
        console.log("(STREAM) Interval changed to " + command[2]);
    } else {
        console.log("TODO: Not a number error");
    }
	
	waifubot.deleteMessage(message);
}
function streamRefresh(params, message) {
	console.log("STREAM REFRESH");
    buildStreamsList();
	
	waifubot.deleteMessage(message);
}
function streamList(params, message) {
	console.log("STREAM LIST");
    waifubot.sendMessage(message.author, "The streams I'm watching are " + listOfStreams(true));
	
	waifubot.deleteMessage(message);
}

login();
function login() {
    waifubot.login(auth.email, auth.password)
		.then(function (token) {
		    loggedIn();
		}).catch(function (err) {
		    console.log("Login failed");
		});
}
waifubot.on("disconnected", function () {
	console.log("Disconnected, reconnecting in 1 minute");
	clearInterval(streamIntTimer);
	setTimeout(function () {
	    login();
	}, 60000);
});

function loggedIn() {
	console.log("Connected");
	streamIntTimer = setTimeout(function () {
		buildStreamsList();
	}, settings.streamUpdateTime);
}

function buildStreamsList() {
	clearTimeout(streamIntTimer);
	if (settings.streamerList.length > 0) {
		var url = 'https://api.twitch.tv/kraken/streams?channel=' + listOfStreams(false);
		http.get(url, function (res) {
			var body = '';
			res.on('data', function (chunk) { body += chunk; });

			res.on('end', function () {
				var streams = JSON.parse(body).streams;
				for (var j = 0; j < settings.streamerList.length; j++) {
					var stream = null;
					var currentId = j;
					if (streams.length > 0) {
						for (var i = 0; i < streams.length; i++) {
							if (settings.streamerList[currentId].name.toLowerCase() == streams[i].channel.name.toLowerCase()) {
								stream = streams[i];
								break;
							}
						}
						if(stream != null) {
						    var savedMessageId = settings.streamerList[currentId].msg;
						    if (savedMessageId == "") {
								(function () {
									var myId = currentId;
									waifubot.sendMessage(settings.channels.streams, "**" + stream.channel.status + "**\n" + stream.channel.display_name + " *playing* " + stream.channel.game + " -*" + stream.viewers + "*-\n" + stream.channel.url, function (err, msg) {
										settings.streamerList[myId].msg = msg.id;
										saveSettings();
									});
								})();
							} else {
						        var messageObj = waifubot.getChannel("id", settings.channels.streams).getMessage("id", savedMessageId);
						        if (messageObj) {
						            waifubot.updateMessage(messageObj, "**" + stream.channel.status + "**\n" + stream.channel.display_name + " *playing* " + stream.channel.game + " -*" + stream.viewers + "*-\n" + stream.channel.url);
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
						    var savedMessageId = settings.streamerList[currentId].msg;
						    if (savedMessageId != "") {
						        var messageObj = {
								    "id": savedMessageId,
									"channel": {
										"id": settings.channels.streams
									}
								};
						        waifubot.deleteMessage(messageObj);
							}
							settings.streamerList[currentId].msg = "";
							saveSettings();
						}
					} else {
					    var savedMessageId = settings.streamerList[currentId].msg;
					    if (savedMessageId != "") {
						    var messageObj = {
						        "id": savedMessageId,
								"channel": {
									"id": settings.channels.streams
								}
							};
						    waifubot.deleteMessage(messageObj);
						}
						settings.streamerList[currentId].msg = "";
						saveSettings();
					}
				}
			});
		});
	}
	streamIntTimer = setTimeout(function () {
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
function listOfStreams(spaced) {
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