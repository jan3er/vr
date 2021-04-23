import * as SimplePeer from './simplepeer.min.js';

//todo: maybe use this package https://www.npmjs.com/package/simple-signal-client?activeTab=readme


//uses websockets to create a new peer-to-peer connection
//one of the two endpoints has the p.initiator flag set
//this can be used to decide who is server and who is client
export function makeConnection() {
    return new Promise(function(resolve, reject) {

        const ws = new WebSocket("ws://vr-matchmaker.herokuapp.com");

        function makeSimplePeer(isInitiator) {
            var p = new SimplePeer({
                initiator: isInitiator,
                channelConfig: { //an unordered, unreliable channel (i.e., udp)
                    ordered: false,
                    maxRetransmits: 0,
                },
                config: {
                    iceTransportPolicy: "all"
                },
                trickle: false
            });
            p.on('connect', () => resolve(p));
            p.on('error', err => reject(err));
            p.on('signal', data => {
                console.log("send:", JSON.stringify(data));
                ws.send(JSON.stringify(data));
            });
            return p;
        }
        var p = null;
        ws.onmessage = function(evt) {
            console.log("receive:", evt.data);
            if (evt.data === "go ahead and start a session") {
                p = makeSimplePeer(true);
            }
            else if (evt.data === "somebody will offer you a session soon") {
                p = makeSimplePeer(false);
            } else {
                p.signal(JSON.parse(evt.data));
            }
        };
    });
}