import * as SimplePeer from './simplepeer.min.js';

export class Peer {
    
    constructor() {
        this.ws = new WebSocket("ws://localhost:9090");
        this.connectClient = null;
        this.dataClient    = null;
        this.connectServer = null;
        this.dataServer    = null;
    }

    makeSimplePeer(isInitiator) {

        var p = new SimplePeer({
            initiator: isInitiator,
            channelConfig: { //an unordered, unreliable channel (i.e., udp)
                ordered : false,
                maxRetransmits: 0
            },
            trickle: false
        });

        p.on('error', err => console.log('error', err));

        p.on('signal', data => {
            console.log(JSON.stringify(data));
            this.ws.send(JSON.stringify(data));
        });
        if(isInitiator) {
            p.on('connect', () => this.connectServer(p));
            p.on('data', this.dataServer);
        } else {
            p.on('connect', () => this.connectClient(p));
            p.on('data', this.dataClient);
        }
        return p;
    }

    connect() {
        var p = this.makeSimplePeer(false);
        this.ws.onmessage = function (evt) {
            console.log(evt.data);
            if (evt.data === "go ahead and start a session") {
                p = this.makeSimplePeer(true);
            }
            else {
                p.signal(JSON.parse(evt.data));
            }
        }.bind(this);
    }
}
