'use strict';

const Botkit = require('botkit');

/**
 * 
 * @param {*} ctx ctx which run botkit
 * @param {*} option options for botkit to start
 */
module.exports = function(ctx, options) {
    options.stats_optout = true;
    options.replyWithTyping = false;

    if(!options.storage) options.json_file_store = __dirname + '/.data/db/'; 

    const controller = Botkit.socketbot(options);
    controller.runtimeContext = ctx;

    // add skills
    const normalizedPath = require("path").join(__dirname, "skills");
    require("fs").readdirSync(normalizedPath).forEach(function (file) {
      require("./skills/" + file)(controller);
    });
    // add fallback response
    controller.on('message_received', function fallbackMessageReceivedHandler(bot, message) {
        console.debug(`DEBUG: Fallback response for: ${message.text}`);
        bot.reply(message, "Sorry, I don't understand.");
      });
    
    controller.startTicking();

    return controller;
}
