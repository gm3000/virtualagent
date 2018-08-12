module.exports = function startMessengerBot() {

  if (!process.env.messenger_intg_port) {
    console.error('ERROR: messenger_intg_port not specified in environment');
    return null;
  }

  if (!process.env.messenger_intg_page_token) {
    console.error('ERROR: messenger_intg_page_token not specified in environment');
    return null;
  }

  if (!process.env.messenger_intg_verify_token) {
    console.error('ERROR: messenger_intg_verify_token not specified in environment');
    return null;
  }

  if (!process.env.messenger_intg_app_secret) {
    console.warn('WARNING: messenger_intg_app_secret not specified in environment');
  }

  const Botkit = require('botkit');

  const controller = Botkit.facebookbot({
    debug: true,
    log: true,
    access_token: process.env.messenger_intg_page_token,
    verify_token: process.env.messenger_intg_verify_token,
    app_secret: process.env.messenger_intg_app_secret,
    validate_requests: false, // Refuse any requests that don't come from FB on your receive webhook, must provide FB_APP_SECRET in environment variables
    json_file_store: __dirname + '/.data/messenger_db/',
    replyWithTyping: true
  });

  const bot = controller.spawn({});

  controller.setupWebserver(process.env.messenger_intg_port || 8090, function (err, webserver) {
    controller.createWebhookEndpoints(webserver, bot, function () {
      console.info(`INFO: Messenger bot started listening on ${process.env.messenger_intg_port}`);
    });
  });

  return controller;
};
