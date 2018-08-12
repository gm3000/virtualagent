module.exports = function (webserver, controller) {

  webserver.post('/agents/:agentId/sessions/:sessionId/query', function (req, res) {

    if (req.body.text) {
      req.body.type = "message";
      req.body.user = req.params.sessionId;
      req.body.channel = "restful";
      console.info("INFO: Incoming message session id: ", req.body.user);
      controller.handleWebhookPayload(req, res);
    } else {
      let err = {};
      err.error = "Missing \"text\" property in the request payload.";
      res.status(400).json(err);
    }

  });

};
