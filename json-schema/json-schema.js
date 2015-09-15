module.exports = function(RED) {
  "use strict";

  var tv4 = require('tv4');

  function JsonSchemaNode(n) {
    RED.nodes.createNode(this,n);
    this.name = n.name;
    this.schema = n.schema;
  }

  RED.nodes.registerType("json-schema",JsonSchemaNode);

  function JsonSchemaValidator(n) {
    RED.nodes.createNode(this,n);
    var configNode = RED.nodes.getNode(n.jsonSchema);

    this.on('input', function (msg) {
      var valid = tv4.validate(msg.payload, configNode.schema);
      if (!valid) {
        this.error(tv4.error);
        msg.payload = '';
      }
      this.send(msg);
    });
  }

  RED.nodes.registerType("json-schema-validator",JsonSchemaValidator);

  function GetJsonSchema(n) {
    RED.nodes.createNode(this,n);
    var configNode = RED.nodes.getNode(n.jsonSchema);

    this.on('input', function(msg) {
      msg.payload = configNode.schema;
      this.send(msg);
    });
  }

  RED.nodes.registerType("get-json-schema",GetJsonSchema)

}
