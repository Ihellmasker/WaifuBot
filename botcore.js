var auth = require("./auth.json");
var discord = require("discord.js");
var _bot = new discord.Client();
var config = require("./config.json");

var _commands = {};
var commandPrefix;

var newComInterval;
var acceptingCommands = true;

module.exports = {
	login: function (commands, prefix) {
		_commands = commands;
		commandPrefix = prefix;
		_bot.login(auth.email, auth.password)
		.then(function (token) {
		    loggedIn();
		}).catch(function (err) {
		    console.log(new Date().toString() + ": Login failed");
			console.log(err);
			delayedLogin();
		});
	},
	bot: function () {
		return _bot;
	},
	accepting: function () {
		return acceptingCommands;
	}
};

function stopCommands() {
	if (acceptingCommands) {
		acceptingCommands = false;
		setTimeout(function () {
			acceptingCommands = true;
		}, config.commandInterval);
	}
}

_bot.on("message", function (message) {
    //if (message.author.id == settings._botId) return;
	
	if (message.content.indexOf(commandPrefix) === 0 && message.content.length >= 2) {
		var stripedMessage = message.content.replace(commandPrefix, "");
		var params = stripedMessage.match(/(".*?"|[^"\s]+)(?=\s*|\s*$)/g);
		commandHandler(params, _commands, message);
		stopCommands();
	}
});
function commandHandler(params, commands, message) {
    if (params.length <= 0) return null; // Make sure it wasn't ran with no params

    if (typeof (commands[params[0]]) !== "undefined") { // Checks if the lowest parameter exists on the current command level
        if (typeof (commands[params[0]].aliasOf) === "undefined") { // Check this isn't an alias command
			if ((typeof (commands[params[0]].channels) === "undefined" || commands[params[0]].channels.indexOf(message.channel.id) > -1) && (typeof (commands[params[0]].notchannels) === "undefined" || commands[params[0]].notchannels.indexOf(message.channel.id) == -1)) { // Check that is applies to this channel
				if (params.length > 1 && typeof (commands[params[0]].channels) !== "undefined" && Object.keys(commands[params[0]].subs).length > 0) { // Has sub commands and sufficient params
					commandHandler(params.slice(1), commands[params[0]].subs, message);
				} else if (typeof (commands[params[0]].function) !== "undefined") { // If a function exists for this command
					commands[params[0]].function(params.slice(1), message);
				} else { // This command exists but theres nothing to handle this specific instance of it
					console.log(new Date().toString() + ": TODO: Return list of related functions");
				}
			} else {
				// Ignore it
			}
        } else { // Handle as an alias command
            params[0] = commands[params[0]].aliasOf;
            commandHandler(params, commands, message);
        }
    } else {
        console.log(new Date().toString() + ": TODO: Command doesn't exist " + message.content);
    }
}
function delayedLogin() {
	setTimeout(function () {
	    process.exit();
	}, 60000);
}
_bot.on("disconnected", function () {
	console.log(new Date().toString() + ": Disconnected");
	delayedLogin();
});
function loggedIn() {
	console.log(new Date().toString() + ": Connected");
	setTimeout(function () {
		_bot.setStatusIdle();
	}, 5000);
}