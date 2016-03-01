var http = require('https');
var util = require('util');
var auth = require("./auth.json");
var moment = require('moment');
var request = require('request');
var cheerio = require('cheerio');

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
	},
	"nawho": {
		"function": bnsNaWho
	},
	"euwho": {
		"function": bnsEuWho
	}
};

botcore.login(_commands, auth, "!", "with Memmie");

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
function bnsNaWho(params, message) {
	bnsWho(params, message, 'na');
}
function bnsEuWho(params, message) {
	bnsWho(params, message, 'eu');
}
function bnsWho(params, message, region) {
	if (botcore.accepting()) {
		botcore.bot().startTyping(message.channel);
		botcore.bot().setStatusOnline();
		if (params.length > 0) {
			var cData = bnsGetChara(params[0] + (params.length > 1 ? ' ' + params[1] : ''), region, function () {
				var cData = this;
				if (cData.name != "") {
					botcore.bot().sendMessage(message.channel, cData.name + "[" + cData.server + "] - " + cData.class + " " + cData.level + " - " + cData.clan + " - " + cData.faction + "\n" + cData.url);
					botcore.bot().stopTyping(message.channel);
					botcore.bot().setStatusIdle();
				} else {
					botcore.bot().sendMessage(message.channel, "`Character not found`");
					botcore.bot().stopTyping(message.channel);
					botcore.bot().setStatusIdle();
				}
			});
		} else {
			botcore.bot().sendMessage(message.channel, "`No character specified`");
			botcore.bot().stopTyping(message.channel);
			botcore.bot().setStatusIdle();
		}
	}
}
function bnsGetChara(name, region, callback) {
	request('http://' + region + '-bns.ncsoft.com/ingame/bs/character/profile?c=' + encodeURI(name) + '&s=202', function (error, response, html) {
		if (!error && response.statusCode == 200) {
			var $ = cheerio.load(html);
			if ($("#contents .characterInfo").length > 0) { // Exists
				var cData = {};
				cData.name = $("#contents .signature dt .name").text().replace("[", "").replace("]", "");
				cData.class = $("#contents .signature .desc li:nth-child(1)").text();
				cData.level = $("#contents .signature .desc li:nth-child(2)").text();
				cData.server = $("#contents .signature .desc li:nth-child(3)").text();
				cData.faction = $("#contents .signature .desc li:nth-child(4)").text();
				cData.clan = $("#contents .signature .desc li:nth-child(5)").text();
				cData.url = 'http://' + region + '-bns.ncsoft.com/ingame/bs/character/profile?c=' + encodeURI(name) + '&s=202';
				
				cData.stats = {};
				cData.stats.attack = {};
				cData.stats.attack.attack_power = $(".characterInfo .attack .stat-title .title:contains('Attack Power')").parent().find('.stat-point').text();
				cData.stats.attack.piercing = $(".characterInfo .attack .stat-title .title:contains('Piercing')").parent().find('.stat-point').text();
				cData.stats.attack.accuracy = $(".characterInfo .attack .stat-title .title:contains('Accuracy')").parent().find('.stat-point').text();
				cData.stats.attack.concentration = $(".characterInfo .attack .stat-title .title:contains('Concentration')").parent().find('.stat-point').text();
				cData.stats.attack.critical_hit = $(".characterInfo .attack .stat-title .title:contains('Critical Hit')").parent().find('.stat-point').text();
				cData.stats.attack.critical_damage = $(".characterInfo .attack .stat-title .title:contains('Critical Damage')").parent().find('.stat-point').text();
				cData.stats.attack.additional_damage = $(".characterInfo .attack .stat-title .title:contains('Additional Damage')").parent().find('.stat-point').text();
				cData.stats.attack.threat = $(".characterInfo .attack .stat-title .title:contains('Threat')").parent().find('.stat-point').text();
				
				cData.stats.defense = {};
				cData.stats.defense.hp = $(".characterInfo .defense .stat-title .title:contains('HP')").parent().find('.stat-point').text();
				cData.stats.defense.defense = $(".characterInfo .defense .stat-title .title:contains('Defense')").parent().find('.stat-point').text();
				cData.stats.defense.evasion = $(".characterInfo .defense .stat-title .title:contains('Evasion')").parent().find('.stat-point').text();
				cData.stats.defense.block = $(".characterInfo .defense .stat-title .title:contains('Block')").parent().find('.stat-point').text();
				cData.stats.defense.critical_defense = $(".characterInfo .defense .stat-title .title:contains('Critical Defense')").parent().find('.stat-point').text();
				cData.stats.defense.damage_reduction = $(".characterInfo .defense .stat-title .title:contains('Damage Reduction')").parent().find('.stat-point').text();
				cData.stats.defense.health_regen = $(".characterInfo .defense .stat-title .title:contains('Health Regen')").parent().find('.stat-point').text();
				cData.stats.defense.recovery = $(".characterInfo .defense .stat-title .title:contains('Recovery')").parent().find('.stat-point').text();
				cData.stats.defense.debuff_defense = $(".characterInfo .defense .stat-title .title:contains('Debuff Defense')").parent().find('.stat-point').text();
				
				callback.call(cData);
			} else {
				var cData = {};
				cData.name = ""
				callback.call(cData);
			}
		}
	});
}