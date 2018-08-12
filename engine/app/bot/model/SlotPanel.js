'use strict';

const _ = require('lodash');

class Slot {
  constructor(raw) {
    this.raw = raw;
    this.required = raw.required === true;
    this.name = raw.name;
    this.value = raw.value;
    this.entityDef = raw.dataType;
    this.questions = raw.promps.map(p => p.value);
    this.choices = [];
    this.filled = false;
    this.repeatCount = 0;
    this._content = null;

    if (this.hasChoices) {
      this.choices = this.entityDef.definitions.map(def => ({
        title: def.displayName || def.name,
        payload: def.value || def.name,
      }));
    }
  }

  get question() { // TODO: i18n
    return this.questions[ Math.floor(Math.random() * this.questions.length) ] || `Please specify ${this.name}`;
  }

  get hasChoices() {
    return this.entityDef !== null && Array.isArray(this.entityDef.definitions) && this.entityDef.definitions.length > 0;
  }

  toString() {
    return `${this.name}:${this._content}`;
  }

  set content(text) {
    if (!_.isEmpty(text)) {
      const choice = this.choices.find(ch => ch.title === text || ch.payload === text);
      if (choice) this._content = choice.payload;
      this.filled = true;
    }
  }

  get content() {
    return this._content;
  }
}

/**
 * rawIntent: Object
 */
class SlotPanel {
  constructor(raw) {
    this.raw = raw;
    this.name = raw.name;
    this._action = raw.action.action;
    this._parameters = raw.action.parameters || [];
    this._responses = raw.responses || [];
    this.slots = new Map();

    this._parameters.forEach(param => {
      this.slots.set(param.value, new Slot(param));
    });
  }

  get response() { // TODO: response maybe empty
    const speech = this._responses[ Math.floor(Math.random() * this._responses.length) ];
    const filledSlots = Array.from(this.filled.values());
    if (!speech) {
      return filledSlots.reduce((content, slot) => content + ` ${slot.toString()};`, 'You specified:');
    }

    const tpl = _.template(speech);
    const vars = filledSlots.reduce((obj, slot) => (obj[slot.value] = slot.content), {});
    return tpl(vars);
  }

  get action() {
    if (_.isEmpty(this._action)) return null;
    const actionString = JSON.stringify(this._action);
    const filledSlots = Array.from(this.filled.values());
    const tpl = _.template(actionString);
    const vars = filledSlots.reduce((obj, slot) => (obj[slot.value] = slot.content), {});
    const filledActionString = tpl(vars);
    return JSON.parse(filledActionString);
  }

  get filled() {
    return new Map([ ...this.slots ].filter(slot => slot[1].filled === true));
  }

  get unfilled() {
    return new Map([ ...this.slots ].filter(slot => slot[1].filled === false));
  }

  get hasAllRequired() {
    return [ ...this.slots ]
      .filter(slot => slot[1].filled === false && slot[1].required === true)
      .length === 0;
  }

  get required() {
    return new Map([ ...this.slots ].filter(slot => slot[1].required === true));
  }

  get optional() {
    return new Map([ ...this.slots ].filter(slot => slot[1].required === false));
  }

  fillSlots(entities, cb) {
    if (!Array.isArray(entities)) return null;
    const slots = this.slots;
    const filledSlotKeys = entities.filter(
      function filterSlotsByEntity({ entity, value }) {
        if (slots.has(entity)) {
          const slot = slots.get(entity);
          slot.content = value;
          if (slot.filled) return true;
        }
        return false;
      }
    );

    if (cb && typeof cb === 'function') {
      cb(filledSlotKeys);
    }

  }

}

module.exports = SlotPanel;
