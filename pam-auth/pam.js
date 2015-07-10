module.exports = function(RED) {
  "use strict";

  var pam = require('authenticate-pam');

  function PamAuthNode(n) {
    RED.nodes.createNode(this,n);

    var node = this;

    node.on('input', function (msg) {
      if (msg.username && msg.password) {
        pam.authenticate(msg.username,msg.password,function(err) {
          if (err) {
            msg.user = undefined;
            node.error("Failed PAM auth for user: "+msg.username);
          } else {
            node.warn("PAM auth successful: "+msg.username);
            msg.user = msg.username;
          }
        });
      }
      node.send(msg);
    });
  }

  RED.nodes.registerType("pam-auth",PamAuthNode)

}
