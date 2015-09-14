// Copyright 2013,2014 IBM Corp.

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

            // this.log(util.inspect(ldapOptions));

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

                    for (var key in payload) {
                        if(payload.hasOwnProperty(key)) {
                            if(key != 'ou' && key != 'dn'){
                                var singleAttribute = {};
                                singleAttribute['attr'] = key;
                                if(Array.isArray(payload[key])){
                                    singleAttribute['vals'] = payload[key]
                                } else {
                                    singleAttribute['vals'] = [payload[key]]
                                }
                                
                                attrs.push(singleAttribute);
                            }
                        }
                    }
                    
                    var binddncomponents = node.ldapServer.binddn.split(',');
                    var bindcn = "", bindou = "", binddc = "", binduid = "";

                    for(var index = 0; index < binddncomponents.length; index++) {
                        var component = binddncomponents[index];
                        if(component.indexOf("cn=") == 0) {
                            bindcn = component.replace('cn=', '');
                        } else if(component.indexOf('ou=') == 0) {
                            bindou = component.replace('ou=', '');
                        } else if(component.indexOf('dc=') == 0) {
                            binddc = component.replace('dc=', '');
                        } else if(component.indexOf('uid=') == 0) {
                            binduid = component.replace('uid=', '');
                        }
                    }

                    // Form DN
                    // TODO: change to reflect tree structure in LDAP instance
                    var dn = ""
                    if(typeof payload['uid'] != 'undefined' || binduid != "") {
                        dn += 'uid=' + (payload['uid'] || binduid); 
                    }
                    if(typeof payload['dc'] != 'undefined' || binddc != "") {
                        if(dn == '') {
                            dn += 'dc=' + (payload['dc'] || binddc);
                        } else {
                            dn += ',dc=' + (payload['dc'] || binddc);
                        }
                    }

                    //TODO: Pass message to next node
                    node.ldap.add(dn, attrs, function(err){
                        if(err) {
                            console.log("", err);
                        } else {
                            console.log("Added/Modified");
                        }
                    });
                } else {
                    node.error("not connected");
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