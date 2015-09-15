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
    var schema = JSON.parse(configNode.schema);

    this.on('input', function (msg) {
      if (schema) {
        var valid = tv4.validate(msg.payload,schema);
        if (!valid) {
          this.error(tv4.error);
          msg.payload = '';
        }
      } else {
        this.error("Invalid JSON provided in config.");
        msg.payload = '';
      }
      this.send(msg);
    });
  }

  RED.nodes.registerType("json-schema-validator",JsonSchemaValidator);

  function GetJsonSchema(n) {
    RED.nodes.createNode(this,n);
    var configNode = RED.nodes.getNode(n.jsonSchema);
    var schema = JSON.parse(configNode.schema);

    this.on('input', function(msg) {
      if (schema) {
        msg.payload = schema;
      } else {
        this.error("Invalid JSON provided in config.");
        msg.payload = '';
      }
      this.send(msg);
    });
  }

  RED.nodes.registerType("get-json-schema",GetJsonSchema)

}
