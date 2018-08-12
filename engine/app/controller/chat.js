'use strict';

const Controller = require('egg').Controller;

class ChatController extends Controller {

  async query() {
    this.ctx.body = 'hahaha';
  }

}

module.exports = ChatController;
