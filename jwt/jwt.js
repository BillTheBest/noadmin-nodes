module.exports = function(RED) {
    "use strict";
    // require any external libraries we may need....
    //var foo = require("foo-library");

    // The main node definition - most things happen in here
    var jwt = require('jsonwebtoken');

    function JwtNode(n) {
      RED.nodes.createNode(this,n);
      this.secret = n.secret;
    }

    RED.nodes.registerType("jwt-secret",JwtNode,{
      credentials: {
        secret: {type:"text"}
      }
    });

    function JwtSignNode(n) {
      // Create a RED node
      RED.nodes.createNode(this,n);

      // copy "this" object in case we need it in context of callbacks of other functions.
      this.jwtSecret = n.jwtSecret;
      var credentials = RED.nodes.getCredentials(this.jwtSecret);
      if (!(credentials && credentials.secret)) {
        this.error("Missing JWT secret.");
      }

      this.on('input', function (msg) {
        if (credentials.secret) {
          msg.jwtToken = jwt.sign({ foo: 'bar' }, credentials.secret);
        } else {
          this.error("No secret provided.");
        }
        this.warn("Produced signed token: "+msg.jwtToken);
        this.send(msg);
      });
    }

    // Register the node by name. This must be called before overriding any of the
    // Node functions.
    RED.nodes.registerType("jwt-sign",JwtSignNode);
    // RED.nodes.registerType("jwt-verify",JwtVerifyNode);

}
