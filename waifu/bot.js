var http = require('https');
var util = require('util');
var auth = require("./auth.json");
var settings = require("./settings.json");
var jsonfile = require('jsonfile');
jsonfile.spaces = 4;
var fs = require('fs')
var moment = require('moment');
var warframeAlerts = [];
//var feed = require("feed-read");

var botcore = require('./../lib/botcore.js');

var streamIntTimer/*, warframeIntTimer*/;

var _commands = {
	"stream": {
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
		"function": ds3Timer
	},
	"sf5": {
		"function": sf5Timer
	}/*,
	"warframe": {
		"subs": {
			"refresh": {
				"function": warframeRefresh
			}
		}
	}*/
};

botcore.login(_commands, auth, "!", "Botstuff");
streamIntTimer = setTimeout(function () {
	buildStreamsList();
}, settings.streamUpdateTime);
/*warframeIntTimer = setTimeout(function () {
    buildWarframeList();
}, settings.warframeAlertTime);*/
	
function saveSettings() {
	jsonfile.writeFile("/home/pi/bots/discordbots/waifu/settings.json", settings, function (err) {});
}

function streamAdd(params, message) {
	console.log(new Date().toString() + ": STREAM ADD");
    if (params.length <= 0) {
        //console.log(new Date().toString() + ": TODO: Missing param error");
        return null; // Requires extra parameters to run
    }

    if (params[0] != "" && !streamExists(params[0])) {
        settings.streamerList.push({ "msg": "", "name": params[0] });
        saveSettings();
        buildStreamsList();
        botcore.bot().sendMessage(message.author, params[0] + " has been added");
        console.log(new Date().toString() + ": (STREAM) " + message.author.username + " added " + params[0]);
    } else {
        console.log(new Date().toString() + ": TODO: Stream exists error");
    }
	botcore.bot().deleteMessage(message);
}
function streamRemove(params, message) {
	console.log(new Date().toString() + ": STREAM REMOVE");
    if (params.length <= 0) {
        //console.log(new Date().toString() + ": TODO: Missing param error");
        return null; // Requires extra parameters to run
    }

    if (params[0] != "" && streamExists(params[0])) {
        var savedMessageId = "";
        if (settings.streamerList.length > 0) {
            for (var i = 0; i < settings.streamerList.length; i++) {
                if (settings.streamerList[i].name.toLowerCase() == params[0].toLowerCase()) {
                    savedMessageId = settings.streamerList[i].msg;
                    settings.streamerList.splice(i, 1);
                    botcore.bot().sendMessage(message.author, params[0] + " has been removed");
                    console.log(new Date().toString() + ": (STREAM) " + message.author.username + " removed " + params[0]);
                    break;
                }
            }
        }
        if (savedMessageId != "") {
            var messageObj = botcore.bot().channels.get("id", settings.channels.streams).messages.get("id", savedMessageId);
            if (messageObj) {
                botcore.bot().deleteMessage(messageObj);
            }
        }
        saveSettings();
        buildStreamsList();
    } else {
        console.log(new Date().toString() + ": TODO: Stream doesnt exist error");
    }
	
	botcore.bot().deleteMessage(message);
}
function streamIntervalChange(params, message) {
	if (botcore.accepting()) {
		console.log(new Date().toString() + ": STREAM INTERVAL");
		if (params.length <= 0) {
			//console.log(new Date().toString() + ": TODO: Missing param error");
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
		botcore.bot().deleteMessage(message);
}
function streamRefresh(params, message) {
	if (botcore.accepting()) {
		console.log(new Date().toString() + ": STREAM REFRESH");
		buildStreamsList();
	}
	
	botcore.bot().deleteMessage(message);
}
function streamList(params, message) {
	console.log(new Date().toString() + ": STREAM LIST");
    botcore.bot().sendMessage(message.author, "The streams I'm watching are " + listOfStreams(true));
	
	botcore.bot().deleteMessage(message);
}

function buildStreamsList() {
	clearTimeout(streamIntTimer);
	if (settings.streamerList.length > 0) {
		var url = 'https://api.twitch.tv/kraken/streams?channel=' + listOfStreams(false);
		http.get(url, function (res) {
			var body = '';
			res.on('data', function (chunk) { body += chunk; });

			res.on('end', function () {
				if (body.indexOf("<?xml") <= -1) {
					var streams = JSON.parse(body).streams;
					for (var j = 0; j < settings.streamerList.length; j++) {
						var stream = null;
						var currentId = j;
						if (typeof(streams) !== "undefined" && streams.length > 0) {
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
										botcore.bot().sendMessage(settings.channels.streams, "**" + stream.channel.status + "**\n" + stream.channel.display_name + " *playing* " + stream.channel.game + " -*" + stream.viewers + "*-\n" + stream.channel.url, function (err, msg) {
											settings.streamerList[myId].msg = msg.id;
											saveSettings();
										});
									})();
								} else {
									var messageObj = botcore.bot().channels.get("id", settings.channels.streams).messages.get("id", savedMessageId);
									if (messageObj) {
										botcore.bot().updateMessage(messageObj, "**" + stream.channel.status + "**\n" + stream.channel.display_name + " *playing* " + stream.channel.game + " -*" + stream.viewers + "*-\n" + stream.channel.url);
									} else {
										(function () {
											var myId = currentId;
											botcore.bot().sendMessage(settings.channels.streams, "**" + stream.channel.status + "**\n" + stream.channel.display_name + " *playing* " + stream.channel.game + " -*" + stream.viewers + "*-\n" + stream.channel.url, function (err, msg) {
												settings.streamerList[myId].msg = msg.id;
												saveSettings();
											});
										})();
									}
								}
							} else {
								var savedMessageId = settings.streamerList[currentId].msg;
								if (savedMessageId != "") {
									var messageObj = botcore.bot().channels.get("id", settings.channels.streams).messages.get("id", savedMessageId);
									botcore.bot().deleteMessage(messageObj);
								}
								settings.streamerList[currentId].msg = "";
								saveSettings();
							}
						} else {
							var savedMessageId = settings.streamerList[currentId].msg;
							if (savedMessageId != "") {
								var messageObj = botcore.bot().channels.get("id", settings.channels.streams).messages.get("id", savedMessageId);
								botcore.bot().deleteMessage(messageObj);
							}
							settings.streamerList[currentId].msg = "";
							saveSettings();
						}
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
/*function warframeRefresh(params, message) {
	if (botcore.accepting()) {
		console.log(new Date().toString() + ": WARFRAME REFRESH");
		buildWarframeList();
	}
}
function buildWarframeList() {
    clearTimeout(warframeIntTimer);
    if (botcore.connected) {
        feed("http://content.warframe.com/dynamic/rss.php", function (err, articles) {
			if (typeof(articles) !== 'undefined') {
				for (var i = 0; i < articles.length; i++) {
					var posted = false;
					for (var j = 0; j < warframeAlerts.length; j++) {
						if (warframeAlerts[j].title.toLowerCase() == articles[i].title.toLowerCase()) {
							posted = true;
							break;
						}
					}
					if (!posted) {
						if (articles[i].author == 'Alert') {
							var titleReward = articles[i].title.substr(0, articles[i].title.lastIndexOf(") - ") + 1);
							var titleDuration = articles[i].title.substr(articles[i].title.lastIndexOf(") - ") + 4);
							var endTime = new moment(articles[i].published);
							endTime.add(parseInt(titleDuration), "minutes");
							var alertObj = {
								"title": articles[i].title,
								"msg": '',
								"reward": titleReward,
								"duration": titleDuration,
								"endTime": endTime.unix()
							};
							warframeAlerts.push(alertObj);
							(function () {
								var myId = warframeAlerts.length - 1;
								var cAlert = alertObj;
								var todaydate = new moment();
								var difference = Math.ceil((cAlert.endTime - todaydate.unix()) / 60);
								botcore.bot().sendMessage(settings.channels.warframe, "**" + cAlert.reward + "**\n*Ends in " + difference + " minutes*", function (err, msg) {
									warframeAlerts[myId].msg = msg.id;
								});
							})();
						}
					}
				}
				for (var i = warframeAlerts.length - 1; i >= 0; i--) {
					var todaydate = new moment();
					var difference = warframeAlerts[i].endTime - todaydate.unix();
					var messageObj = null;
					if (botcore.bot().channels.get("id", settings.channels.warframe) !== null)
						messageObj = botcore.bot().channels.get("id", settings.channels.warframe).messages.get("id", warframeAlerts[i].msg);
					if (difference > 0) { // Not expired
						if (messageObj !== null)
							botcore.bot().updateMessage(messageObj, "**" + warframeAlerts[i].reward + "**\n*Ends in " + Math.ceil(difference / 60) + " minutes*");
					} else if (difference <= 0 && difference >= -600) { // Expired
						if (messageObj !== null)
							botcore.bot().deleteMessage(messageObj);
					} else if (difference < -600) {
						warframeAlerts.splice(i, 1);
					}
				}
			}
        });
    }
	warframeIntTimer = setTimeout(function () {
		buildWarframeList();
	}, settings.warframeAlertTime);
}*/
function ds3Timer(params, message) {
	if (botcore.accepting()) {
		var todaydate = new moment();
		var releasedate = new moment("04/12/2016");
		var difference = Math.floor((releasedate.unix() - todaydate.unix()) / (60 * 60 * 24));
		botcore.bot().reply(message, "We gonna die in " + difference + " days D:");
	}
}
function sf5Timer(params, message) {
	if (botcore.accepting()) {
		var todaydate = new moment();
		var releasedate = new moment("02/16/2016");
		var difference = Math.floor((releasedate.unix() - todaydate.unix()) / (60 * 60 * 24));
		botcore.bot().reply(message, "We eSports in " + difference + " days!");
	}
}