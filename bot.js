var http = require('https');
var util = require('util');
var settings = require("./settings.json");
var jsonfile = require('jsonfile');
jsonfile.spaces = 4;
var moment = require('moment');

var waifubot = require('./waifubot.js');

var streamIntTimer;

var _commands = {
	"stream": {
		"channels": ["91115816954658816"],
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
	},
	"ds3": {
		"notchannels": ["91115816954658816"],
		"function": ds3Timer
	},
	"sf5": {
		"notchannels": ["91115816954658816"],
		"function": sf5Timer
	}
};

waifubot.login(_commands, "!");
streamIntTimer = setTimeout(function () {
	buildStreamsList();
}, settings.streamUpdateTime);
	
function saveSettings() {
	jsonfile.writeFile("/home/pi/bots/waifubot/settings.json", settings, function (err) {});
}

function streamAdd(params, message) {
	console.log(new Date().toString() + ": STREAM ADD");
    if (params.length <= 0) {
        console.log(new Date().toString() + ": TODO: Missing param error");
        return null; // Requires extra parameters to run
    }

    if (params[0] != "" && !streamExists(params[0])) {
        settings.streamerList.push({ "msg": "", "name": params[0] });
        saveSettings();
        buildStreamsList();
        waifubot.bot().sendMessage(message.author, params[0] + " has been added");
        console.log(new Date().toString() + ": (STREAM) " + message.author.username + " added " + params[0]);
    } else {
        console.log(new Date().toString() + ": TODO: Stream exists error");
    }
	waifubot.bot().deleteMessage(message);
}
function streamRemove(params, message) {
	console.log(new Date().toString() + ": STREAM REMOVE");
    if (params.length <= 0) {
        console.log(new Date().toString() + ": TODO: Missing param error");
        return null; // Requires extra parameters to run
    }

    if (params[0] != "" && streamExists(params[0])) {
        var savedMessageId = "";
        if (settings.streamerList.length > 0) {
            for (var i = 0; i < settings.streamerList.length; i++) {
                if (settings.streamerList[i].name.toLowerCase() == params[0].toLowerCase()) {
                    savedMessageId = settings.streamerList[i].msg;
                    settings.streamerList.splice(i, 1);
                    waifubot.bot().sendMessage(message.author, params[0] + " has been removed");
                    console.log(new Date().toString() + ": (STREAM) " + message.author.username + " removed " + params[0]);
                    break;
                }
            }
        }
        if (savedMessageId != "") {
            var messageObj = waifubot.bot().getChannel("id", settings.channels.streams).getMessage("id", savedMessageId);
            if (messageObj) {
                waifubot.bot().deleteMessage(messageObj);
            }
        }
        saveSettings();
        buildStreamsList();
    } else {
        console.log(new Date().toString() + ": TODO: Stream doesnt exist error");
    }
	
	waifubot.bot().deleteMessage(message);
}
function streamIntervalChange(params, message) {
	if (waifubot.accepting()) {
		console.log(new Date().toString() + ": STREAM INTERVAL");
		if (params.length <= 0) {
			console.log(new Date().toString() + ": TODO: Missing param error");
			return null; // Requires extra parameters to run
		}

		if (params[0] != "" && !isNaN(params[0])) {
			settings.streamUpdateTime = parseInt(params[2]) * 60 * 1000;
			saveSettings();
			console.log(new Date().toString() + ": (STREAM) Interval changed to " + command[2]);
		} else {
			console.log(new Date().toString() + ": TODO: Not a number error");
		}
	}	
		waifubot.bot().deleteMessage(message);
}
function streamRefresh(params, message) {
	if (waifubot.accepting()) {
		console.log(new Date().toString() + ": STREAM REFRESH");
		buildStreamsList();
	}
	
	waifubot.bot().deleteMessage(message);
}
function streamList(params, message) {
	console.log(new Date().toString() + ": STREAM LIST");
    waifubot.bot().sendMessage(message.author, "The streams I'm watching are " + listOfStreams(true));
	
	waifubot.bot().deleteMessage(message);
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
									waifubot.bot().sendMessage(settings.channels.streams, "**" + stream.channel.status + "**\n" + stream.channel.display_name + " *playing* " + stream.channel.game + " -*" + stream.viewers + "*-\n" + stream.channel.url, function (err, msg) {
										settings.streamerList[myId].msg = msg.id;
										saveSettings();
									});
								})();
							} else {
						        var messageObj = waifubot.bot().getChannel("id", settings.channels.streams).getMessage("id", savedMessageId);
						        if (messageObj) {
						            waifubot.bot().updateMessage(messageObj, "**" + stream.channel.status + "**\n" + stream.channel.display_name + " *playing* " + stream.channel.game + " -*" + stream.viewers + "*-\n" + stream.channel.url);
								} else {
									(function () {
										var myId = currentId;
										waifubot.bot().sendMessage(settings.channels.streams, "**" + stream.channel.status + "**\n" + stream.channel.display_name + " *playing* " + stream.channel.game + " -*" + stream.viewers + "*-\n" + stream.channel.url, function (err, msg) {
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
						        waifubot.bot().deleteMessage(messageObj);
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
						    waifubot.bot().deleteMessage(messageObj);
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
function ds3Timer(params, message) {
	if (waifubot.accepting()) {
		var todaydate = new moment();
		var releasedate = new moment("04/12/2016");
		var difference = Math.floor((releasedate.unix() - todaydate.unix()) / (60 * 60 * 24));
		waifubot.bot().reply(message, "We gonna die in " + difference + " days D:");
	}
}
function sf5Timer(params, message) {
	if (waifubot.accepting()) {
		var todaydate = new moment();
		var releasedate = new moment("02/16/2016");
		var difference = Math.floor((releasedate.unix() - todaydate.unix()) / (60 * 60 * 24));
		waifubot.bot().reply(message, "We eSports in " + difference + " days!");
	}
}