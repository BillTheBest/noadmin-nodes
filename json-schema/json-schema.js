module.exports = function(RED) {
  "use strict";
  
  var tv4 = require('tv4');
  
  function JsonSchemaNode(n) {
    RED.nodes.createNode(this,n);
    this.name = n.name;
    this.schema = n.schema;
  }
  
  RED.nodes.registerType("json-hyperschema",JsonSchemaNode);
 
  function JsonSchemaValidator(n) {
    RED.nodes.createNode(this,n);
    var jsonSchema = n.jsonSchema;
  }
  
  RED.nodes.registerType("json-schema-validator",JsonSchemaValidator);
  
}
