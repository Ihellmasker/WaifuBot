var http = require('https');
var util = require('util');
var auth = require("./auth.json");
var moment = require('moment');

var botcore = require('./../lib/botcore.js');

var streamIntTimer;

var _commands = {
	"beta": {
		"function": betaTimer
	},
	"installer": {
		"function": installerLink
	},
	"download": {
		"aliasOf": "installer"
	}
};
var betaDates = [
	{
		"date": "24-11-2015 10:00 -0800",
		"type": "start",
		"event": "Beta 3"
	},
	{
		"date": "30-11-2015 22:00 -0800",
		"type": "end",
		"event": "Beta 3"
	},
	{
		"date": "11-12-2015 10:00 -0800",
		"type": "start",
		"event": "Beta 4"
	},
	{
		"date": "14-12-2015 22:00 -0800",
		"type": "end",
		"event": "Beta 4"
	},
	{
		"date": "18-12-2015 10:00 -0800",
		"type": "start",
		"event": "Beta 5"
	},
	{
		"date": "21-12-2015 22:00 -0800",
		"type": "end",
		"event": "Beta 5"
	}
];

botcore.login(_commands, auth, "!");

function betaTimer(params, message) {
	if (botcore.accepting()) {
		var todaydate = new moment();
		var releasedate = new moment();
		var difference = -1;
		var current = 0;
		while (difference < 0 && current < betaDates.length) {
			releasedate = new moment(betaDates[current].date, "DD-MM-YYYY HH:mm Z");;
			difference = Math.floor((releasedate.unix() - todaydate.unix()));
			if (difference > 86400) { // Over a day
				var days = Math.floor(difference / (24 * 60 * 60));
				botcore.bot().sendMessage(message.channel, betaDates[current].event + " will " + betaDates[current].type + " in over " + days + " day" + (days > 1 ? "s" : ""));
			} else if (difference > 3600) { // Over an hour
				var hours = Math.floor(difference / (60 * 60));
				botcore.bot().sendMessage(message.channel, betaDates[current].event + " will " + betaDates[current].type + " in over " + hours + " hour" + (hours > 1 ? "s" : ""));
			} else if (difference > 0){ // MINUTES
				var minutes = Math.floor(difference / 60);
				botcore.bot().sendMessage(message.channel, betaDates[current].event + " will " + betaDates[current].type + " in " + minutes + " minute" + (minutes > 1 ? "s" : ""));
			}
			current++;
		}
	}
}
function installerLink(params, message) {
	if (botcore.accepting()) {
		botcore.bot().sendMessage(message.channel, "You can download the game at http://cbt.patcher.bladeandsoul.com/BnS_CBT/installer/BnS_CBT%20Lite%20Installer.exe");
	}
}