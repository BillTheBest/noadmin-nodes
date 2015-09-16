//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at

//   http://www.apache.org/licenses/LICENSE-2.0

//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.

module.exports = function(RED) {
    "use strict";
    var LDAP = require("LDAP");

    var connection;

    function ldapNode(n) {
        RED.nodes.createNode(this,n);

        this.server = n.server;
        this.port = n.port;
        this.tls = n.tls;
        this.operation = n.operation;
        this.objectclass = n.objectclass;
        this.basedn = n.basedn;
        if (this.credentials) {
            this.binddn = this.credentials.binddn;
            this.password = this.credentials.password;
        }
    }

    function LDAPWriteOutNode(n) {
        RED.nodes.createNode(this,n);
        this.server = n.server;
        this.base = n.base;
        this.filter = n.filter;
        this.topic = n.topic;
        this.operation = n.operation;
        this.objectclass = n.objectclass;
        this.basedn = n.basedn;
        this.ldapServer = RED.nodes.getNode(this.server);
        var credentials = RED.nodes.getCredentials(this.server);
        if (this.ldapServer) {
            this.status({fill:"red",shape:"ring",text:"disconnected"});
            var ldapOptions = {
                uri:'ldap://' + this.ldapServer.server,
                version: 3,
                starttls: false,
                connectiontimeout: 1,
                reconnect: true

            };
            if (this.ldapServer.tls) {
                if (this.ldapServer.port !== 636) {
                    ldapOptions.uri = ldapOptions.uri + ":" + this.ldapServer.port;
                }
            } else {
                if (this.ldapServer.port !== 389) {
                    ldapOptions.uri = ldapOptions.uri + ":" + this.ldapServer.port;
                }
            }

            this.ldap = new LDAP(ldapOptions);
            var node = this
            this.status({fill:"red",shape:"ring",text:"disconnected"});
            this.ldap.open(function(err){
                if (err) {
                    node.error("error opening connection to " + node.ldapServer.server +"\n" + err);
                    node.status({fill:"red",shape:"ring",text:"disconnected"});
                    return;
                }

                node.status({fill:"green",shape:"dot",text:"connected"});
                node.connected = true;

                if (credentials && credentials.binddn && credentials.password) {
                    var bindOptions = {
                        binddn: credentials.binddn,
                        password: credentials.password
                    };

                    node.ldap.simplebind(bindOptions, function(err){
                        if (err) {
                            node.error("failed to bind - " + err);
                        } else {
                            node.status({fill:"green",shape:"dot",text:"bound"});
                        }
                    });
                }

            });
            this.on('input', function(msg){
                if (node.connected) {

                    var payload = msg.payload

                    var attrs = [];

                    //Convert the objectClass to an array
                    var objectClass = node.objectclass.split(",");

                    //Push the objectclass to attrs array
                    attrs.push({'attr': 'objectClass', 'vals': objectClass});
                    //Get the attributes in the payload
                    //Iterate through the attributes and add to the attrs object
                    var payloadAttrs = payload.attrs;
                    for (var key in payloadAttrs) {
                        if(payloadAttrs.hasOwnProperty(key)) {
                            var singleAttribute = {};
                            singleAttribute['attr'] = key;
                            if(Array.isArray(payloadAttrs[key])){
                                singleAttribute['vals'] = payloadAttrs[key]
                            } else {
                                singleAttribute['vals'] = [payloadAttrs[key]]
                            }
                            attrs.push(singleAttribute);
                        }
                    }

                    var dn = payload.entry + "," + node.basedn;

                    //TODO: Pass message to next node
                    console.log("Operation:", node.operation);
                    if(node.operation == "add") {
                        node.ldap.add(dn, attrs, function(err){
                            if(err) {
                                if(err.code == 68) {
                                    // Object already exists
                                    // Try modifying the object
                                    for(var x in attrs) {
                                        attrs[x]['op'] = "replace";
                                    }
                                    node.ldap.modify(dn, attrs, function(err){
                                        if(err) {
                                            node.error(err.message, msg);
                                        } else {
                                            //Modified
                                            node.send(msg);
                                        }
                                    });
                                } else {
                                    node.error(err.message, msg);
                                }
                            } else {
                                //Added/Modified
                                node.send(msg);
                            }
                        });
                    } else if(node.operation == "modify") {
                        //TODO: Find if 'op' needs to be added to attribute
                        //Modify the LDAP record based on provided DN and modified attributes
                        node.ldap.modify(dn, attrs, function(err){
                            if(err) {
                                node.error(err.message, msg);
                            } else {
                                //Modified
                                node.send(msg);
                            }
                        });
                    } else if(node.operation == "remove") {
                        //Remove the LDAP record based on the provided DN
                        node.ldap.remove(dn, function(err){
                            if(err){
                                node.error(err.message, msg);
                            } else {
                                //Object Deleted
                                //Pass on object
                                node.send(msg);
                            }
                        });
                    }
                } else {
                    node.error("not connected");
                    node.error("Not connected to LDAP", msg);
                }
            });
            this.on('close',function() {
                if(node.ldap) {
                    node.ldap.close();
                }
            });
        }
    }

    RED.nodes.registerType("ldap-write out",LDAPWriteOutNode);
}