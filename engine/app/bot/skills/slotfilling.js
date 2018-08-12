'use strict';

const fp = require('lodash/fp');

/**
 * review the slotfilling result, if got all required, reply with action,
 * if not, start new conversation to continue
 * @param {Conversation} endConvo the ended conversation
 */
function handleConversationEnd(endConvo) {
  const task = endConvo.task;
  const bot = endConvo.context.bot;
  const slotPanel = endConvo.vars.slotPanel;
  const source_message = endConvo.source_message;
  // check if get all required information, else start a new conversation for remaining
  if (!slotPanel.hasAllRequired) {
    const convo = task.createConversation(source_message);
    convo.setVar('slotPanel', slotPanel);
    addQuestions4Slots(convo);
    convo.gotoThread('slot_filling');
    // activate the conversation
    convo.activate();
    bot.reply(source_message, { text: 'There are required information missing to continue...' });
  } else if (endConvo.status === 'completed') {
    const response = {
      action: slotPanel.action,
      text: slotPanel.response,
    };
    bot.reply(source_message, response);
  }
}

function addQuestions4Slots(convo) {
  if (!convo.vars.slotPanel) return convo;

  const slotPanel = convo.vars.slotPanel;
  slotPanel.unfilled.forEach(
    slot => {
      if (slot.filled) return;

      convo.addQuestion(
        { text: slot.question, quick_replies: slot.choices },
        function handleAnswer(response, convo) {
          // if user clicked on quick rely
          if (response.type === 'quick_reply') {
            slot.content = response.text;
            convo.next();
          }
          // if user typed something to answer, then I`ll try to fill more slots
          // and remove corresponding questions which i don`t need to ask again.
          if (response.type === 'message_received') {
            slotPanel.fillSlots(response.entities, function rmQuestions(filledSlotKeys = []) {
              const filterTool = msg => !filledSlotKeys.includes(msg.capture_options.key);
              convo.messages = convo.messages.filter(filterTool);
              convo.threads.slot_filling = convo.threads.slot_filling.filter(filterTool);
            });
            convo.next();
          }

          // if (convo.vars.slotPanel.unfilled.size === 0) {
          //   convo.gotoThread('slot_filling_end');
          // }
        }, { key: slot.value }, 'slot_filling');
    }
  );
  return convo;
}

/**
 * used to create new conversation
 * @param {bot} bot the spawned bot
 * @param {message} message the message from client
 */
function newConversation(bot, message) {
  bot.createConversation(message, (err, convo) => {
    convo.on('end', handleConversationEnd);

    const message = convo.source_message;
    const slotPanel = message.slotPanel;
    convo.setVar('slotPanel', slotPanel);

    // fill slots for the first nlu response
    slotPanel.fillSlots(message.entities);

    // add questions and fill each slot, slots is Map[Slot]. you can extend behavior with more functions
    fp.compose(
      [
        addQuestions4Slots,
        // addQuestions4PostSlotsFilling,
      ]
    )(convo);
    convo.gotoThread('slot_filling');
    // activate the conversation
    convo.activate();

  });
}

function reCreateConversation(bot, message) {
  bot.createConversation(message, (err, convo) => {
    convo.on('end', handleConversationEnd);
    const message = convo.source_message;
    const slotPanel = message.slotPanel;
    convo.setVar('slotPanel', slotPanel);

    // need to tell client that something happend
    // TODO: i18n
    convo.addMessage('Conversation recreated because of some unkown issue, new agent created for you...', 'slot_filling');
    addQuestions4Slots(convo);
    convo.gotoThread('slot_filling');
    convo.activate();
  });
}


module.exports = function(controller) {

  controller.on('new_conv', newConversation);

  controller.on('re_create_conv', reCreateConversation);

  // controller.on('conversationEnded', handleConversationEnd);

};
