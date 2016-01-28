var http = require('https');
var util = require('util');
var auth = require("./auth.json");
var moment = require('moment');

var botcore = require('./../lib/botcore.js');

var streamIntTimer;

var _commands = {
    "joineu": {
        "function": joinEU
    },
    "joinna": {
        "function": joinNA
    },
    "leaveeu": {
        "function": leaveEU
    },
    "leavena": {
        "function": leaveNA
    },
	"installer": {
		"function": installerLink
	},
	"download": {
		"aliasOf": "installer"
	}
};

botcore.login(_commands, auth, "!");

function installerLink(params, message) {
	if (botcore.accepting()) {
	    botcore.bot().sendMessage(message.channel, "You can download the game at http://www.bladeandsoul.com/en/download/");
	}
}
function joinEU(params, message) {
    joinregion(params, message, "EU");
}
function joinNA(params, message) {
    joinregion(params, message, "NA");
}
function joinregion(params, message, region) {
    if (!message.channel.isPrivate) {
        botcore.bot().addMemberToRole(message.author, message.channel.server.roles.get("name", region));
    }
}
function leaveEU(params, message) {
    leaveregion(params, message, "EU");
}
function leaveNA(params, message) {
    leaveregion(params, message, "NA");
}
function leaveregion(params, message, region) {
    if (!message.channel.isPrivate) {
        botcore.bot().removeMemberFromRole(message.author, message.channel.server.roles.get("name", region));
    }
}