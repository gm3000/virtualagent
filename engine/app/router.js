'use strict';

module.exports = app => {
  const { router, controller } = app;
  router.post('/agents/:agentId/sessions/:sessionId/query', controller.chat.query);
};
