// Initialize default environment variables from .env
require('node-env-file')(__dirname + '/.env');

const botControllers = [
  {
    name: 'socket bot',
    controller: require('./socket_bot')()
  },
  {
    name: 'messenger bot',
    controller: require('./messenger_bot')()
  }
];

// initialize bot controllers
(() => {
  let startedCount = 0;

  botControllers.forEach((item) => {
    if (item.controller) {
      addSkills(item.controller);
      addFallbackResponse(item.controller);
      startedCount++;
    } else {
      console.error(`ERROR: Failed to start ${item.name}`);
    }
  });

  console.info(`INFO: ${startedCount} of ${botControllers.length} bot(s) started`);

  function addSkills(controller) {
    const normalizedPath = require("path").join(__dirname, "skills");
    require("fs").readdirSync(normalizedPath).forEach(function (file) {
      require("./skills/" + file)(controller);
    });
  }

  function addFallbackResponse(controller) {
    controller.on('message_received', function fallbackMessageReceivedHandler(bot, message) {
      console.debug(`DEBUG: Fallback response for: ${message.text}`);
      bot.reply(message, "Sorry, I don't understand.");
    });
  }
})();