module.exports = function startSocketBot() {

  if (!process.env.PORT) {
    console.error('ERROR: PORT not specified in environment');
    return null;
  }

  const Botkit = require('botkit');

  const bot_options = {
    replyWithTyping: false
  };

// Use a mongo database if specified, otherwise store in a JSON file local to the app.
// Mongo is automatically configured when deploying to Heroku
  if (process.env.MONGO_URI) {
    const mongoStorage = require('botkit-storage-mongo')({mongoUri: process.env.MONGO_URI});
    bot_options.storage = mongoStorage;
  } else {
    bot_options.json_file_store = __dirname + '/.data/db/'; // store user data in a simple JSON format
  }

// Create the Botkit controller, which controls all instances of the bot.
  const controller = Botkit.socketbot(bot_options);

// Set up an Express-powered webserver to expose oauth and webhook endpoints
  const webserver = require(__dirname + '/components/express_webserver.js')(controller);

// Open the web socket server
  controller.openSocketServer(controller.httpserver);

// Start the bot brain in motion!!
  controller.startTicking();

  console.info(`INFO: Socket bot started listening on ${process.env.PORT}`);

  return controller;
};
