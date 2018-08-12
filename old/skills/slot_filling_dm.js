module.exports = function (controller) {

  const NodeCache = require('node-cache');
  const intentCache = new NodeCache({stdTTL: 3600});

  const DEFAULT_AGENT = '1';

  var request = require('request');
  var rasa = require('../middleware/middleware-rasa')({
    rasa_uri: process.env.va_rasa_nlu_api_base,
    rasa_project: DEFAULT_AGENT
  });

  var hearIntent = function (patterns, message) {
    let intentDef = intentCache.get(message.user);
    if (!intentDef) {
      intentDef = intentDefinitions;
      intentCache.set(message.user, intentDefinitions);
    }
    message.intentDefinitions = intentDef;
    console.info('INFO: User says: ', message.text);
    console.info('        - Intent:', message.intent);
    console.info('        - Entities:', message.entities);
    // return (!cache[message.user]) && (Boolean(message.intent.name) && message.intent.confidence >= 0.4 && intentDefinitions[message.intent.name]);
    return (Boolean(message.intent.name) && message.intent.confidence >= 0.4 && message.intentDefinitions[message.intent.name]);
  };

  var intentDefinitions = {};
  loadIntentDefinitions(DEFAULT_AGENT);
  setInterval(function () {
    loadIntentDefinitions(DEFAULT_AGENT);
  }, 60000);

  controller.middleware.receive.use(rasa.receive);

  controller.hears('', 'message_received', hearIntent, function (bot, message) {

    var intentName = message.intent.name;
    if (message.intentDefinitions[intentName]) {
      bot.startConversation(message, (err, convo) => {
        console.info("INFO: Start conversation for intent " + intentName);

        convo.on('end', function (convo) {

          if (convo.status == 'completed') {
            var matchFunc = (match, contents, offset, input_string) => {
              var value;
              convo.vars.slots.map(slot => {
                if (match.substr(1) == slot.name) {
                  value = slot.value;
                  return;
                }
              });
              if (value) {
                return value;
              }
              return match;
            };
            var response = {};
            var messages = intentDefinition.responses[0].messages;
            var message = messages[Math.floor(Math.random() * messages.length)];
            response.text = message.speech.replace(/\$[\w\d]+/g, matchFunc);
            var actionDefinition = intentDefinition.responses[0].action;
            var action = {name: actionDefinition.name, parameters: {user_options: []}};
            for (var fieldName in actionDefinition.parameters) {
              if (fieldName == "user_options") {
                var optionDefinitions = actionDefinition.parameters.user_options;
                optionDefinitions.map((optionDef) => {
                  var option = {
                    name: optionDef.name,
                    value: optionDef.value.replace(/\$[\w\d]+/g, matchFunc)
                  };
                  action.parameters.user_options.push(option);
                });
              }
              else {
                action.parameters[fieldName] = actionDefinition.parameters[fieldName].replace(/\$[\w\d]+/g, matchFunc);
              }
            }
            if (action.name) {
              response.action = action;
            }
            bot.reply(convo.source_message, response);

          } else {
            // something happened that caused the conversation to stop prematurely
          }

        });

        var intentDefinition = message.intentDefinitions[intentName];
        convo.setVar("slots", buildSlotFillingContext(intentDefinition));
        fillSlots(convo.vars.slots, message.entities);
        convo.setVar("unfilledSlots", getUnfilledSlots(convo.vars.slots));

        if (convo.vars.unfilledSlots.length > 0) {
          convo.setVar("currentUnfilledSlotIndex", 0);
          convo.vars.unfilledSlots.map(unfilledSlot => {
            convo.ask({text: unfilledSlot.prompt, quick_replies: unfilledSlot.quick_replies}, (response, convo) => {
              if (response.type == 'message_received') {
                var unfilledSlots = convo.vars.unfilledSlots;
                var currentUnfilledSlot = unfilledSlots[convo.vars.currentUnfilledSlotIndex];
                fillSlots(unfilledSlots, response.entities);
                if (currentUnfilledSlot.dataType == "@sys.any") {
                  currentUnfilledSlot.value = response.text;
                  currentUnfilledSlot.filled = true;
                } else if (currentUnfilledSlot.dataType == "@sys.option") {
                  if (Array.isArray(currentUnfilledSlot.quick_replies)) {
                    let trimmedResponse = (response.text || '').trim();
                    currentUnfilledSlot.quick_replies.some(function (item) {
                      if (item.payload.indexOf(trimmedResponse) >= 0 || item.title.indexOf(trimmedResponse) >= 0) {
                        currentUnfilledSlot.value = item.payload;
                        currentUnfilledSlot.filled = true;
                        return true;
                      }
                    });
                  }
                }
                if (!currentUnfilledSlot.filled) {
                  bot.reply(convo.source_message, {
                    text: currentUnfilledSlot.prompt,
                    quick_replies: currentUnfilledSlot.quick_replies
                  });
                } else {
                  convo.setVar('currentUnfilledSlotIndex', convo.vars.currentUnfilledSlotIndex + 1);
                  convo.next();
                }
              }
            });
          });
        } else {
          convo.stop('completed');
        }


      });
    } else {
      bot.reply(message, "Sorry, I don't understand.");
    }

  });

/*
  var cache = {};
  controller.hears('', 'message_received', function (bot, message) {
    var sessionId = message.user;
    if (!cache[sessionId]) {
      cache[sessionId] = {context: "", histIDs: ""};
    }
    var sessionCache = cache[sessionId];
    var text = message.text;
    var historyContext = sessionCache.context;
    var histIDs = sessionCache.histIDs;
    var postData = {
      context: historyContext + text,
      histIDs: histIDs
    };

    var url = "http://16.187.190.227:8080";
    var options = {
      method: 'post',
      body: postData,
      json: true,
      url: url
    };
    request(options, function (err, response, body) {
      if (err) {
        console.error('error posting json: ', err);
        bot.reply(message, "Sorry I cannot understand.");
        return;
      }
      sessionCache.context = body.context;
      sessionCache.histIDs = body.histIDs;
      bot.reply(message, Boolean(body.utterance) ? (body.utterance.replace("__eou__", "")) : "Sorry I cannot understand for now.");
    });
  });
*/

  function buildSlotFillingContext(intentDefinition) {
    var slots = [];
    var params = intentDefinition.responses[0].parameters;
    for (var i = 0; i < params.length; i++) {
      var param = params[i];
      // if the parameter is not required, bot won't ask for information
      if (!param.required) {
        continue;
      }
      var slot = {};
      slot.prompt = param.prompts[0].value;
      slot.name = param.name;
      slot.filled = false;
      slot.dataType = param.dataType;
      slot.quick_replies = param.quick_replies;
      slots.push(slot);
    }
    return slots;
  }

  function fillSlots(slots, entities) {
    for (var i = 0; i < entities.length; i++) {
      var entity = entities[i];
      slots.map(slot => {
        if (!slot.filled && entity.entity == slot.name) {
          slot.value = entity.value;
          slot.filled = true;
        }
      });
    }
  }

  function getUnfilledSlots(slots) {
    var unfilledSlots = [];
    slots.map(slot => {
      if (!slot.filled) {
        unfilledSlots.push(slot);
      }
    });
    return unfilledSlots;
  }

  // for POC, load file based intent definitions
  function loadFileBasedIntentDefinitions() {
    var intentDefinitions = {};
    var normalizedPath = require("path").join(__dirname, "../intents");
    require("fs").readdirSync(normalizedPath).forEach(function (file) {
      var intent = require('../intents/' + file);
      intentDefinitions[intent.name] = intent;
    });
    return intentDefinitions;
  }

  async function loadIntentDefinitions(agent) {
    const axios = require('axios');

    let entities = {};
    try {
      let response = await axios({
        url: `${process.env.va_admin_ui_api_base}/agents/${agent}/entities`,
        method: 'get',
        proxy: false,
      });
      if (response.data && response.data.length > 0) {
        response.data.forEach((entity) => {
          entities[entity.name] = entity;
        });
      }
    } catch (e) {
      console.error(`ERROR: Failed to load entity definition of agent ${agent}. Quick replies will NOT be available.`);
      console.error(e);
    }

    let intents = {};
    try {
      let response = await axios({
        url: `${process.env.va_admin_ui_api_base}/agents/${agent}/intents`,
        method: 'get',
        proxy: false,
      });
      if (response.data && response.data.length > 0) {
        response.data.forEach((intent) => {
          if (Array.isArray(intent.action.parameters)) {
            intent.action.parameters.forEach((param) => {
              // convert referenced entity to quick replies
              if (entities[param.dataType] && Array.isArray(entities[param.dataType].definitions)) {
                param.quick_replies = [];
                entities[param.dataType].definitions.forEach((val) => {
                  param.quick_replies.push({
                    title: val.displayName || val.name,
                    payload: val.name
                  });
                });
                param.dataType = '@sys.option';
              }
              // check undefined prompt for required parameter and use default prompt
              if (param.required && (!param.prompts || param.prompts.length === 0)) {
                console.warn(`WARNING: No prompt defined for required parameter ${param.name} of intent ${intent.name}. Use default prompt.`);
                param.prompts = [{value: `Please specify ${param.name}`}];
              }
            });
          }
          intent.responses = [{
            action: intent.action.action,
            parameters: intent.action.parameters,
            messages: intent.responses
          }];
          intents[intent.name] = intent;
        })
      }

      intentDefinitions = intents;
    }
    catch (e) {
      console.error(`ERROR: Failed to load intent definition of agent ${agent}.`);
      console.error(e);
    }
  }

};
