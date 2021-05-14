import { makeConnection } from "./makeConnection";
import { Serializer } from "./serialize2";
import { World } from "./world";

export class Network 
{
    //TODO: we probably want different update rates for ball and paddle. paddle every frame and ball less frequent?
    //static readonly FRAMES_PER_UPDATE = 1;  //how often should the physics state be sent
    //static readonly BUFFER_DELAY = 10       //how many packets should the buffer be ahead
    //static readonly BUFFER_LENGTH = 20;     //some number. 10 is probably large enough

    world: World;
    p;
    connected = false;
    latestIncomingPackage: ArrayBuffer = null;
    serializer: Serializer;
    
    constructor(world: World, serializer: Serializer) {
        this.world = world;
        this.serializer = serializer;
    }

    //starts establishing the connection. to be called once at the beginning
    async start() {
        this.p = await makeConnection();
        
        if(this.p.initiator) {
            document.title = "Player 1";
            this.world.players[0].isLocal = true;
            this.world.players[1].isLocal = false;
        } else {
            document.title = "Player 2";
            this.world.players[0].isLocal = false;
            this.world.players[1].isLocal = true;
        }

        this.p.on('data', data => {
            this.latestIncomingPackage = data.buffer;
        });
        this.connected = true;
    }

    //to be called once every render frame
    mainLoop() {
        if(this.connected) {
            const pkg = this.serializer.serialize();
            this.world.texts[7].text = "" + pkg;
            this.p.send(pkg);
        }

        if(this.latestIncomingPackage !== null)
            this.serializer.deserialize(this.latestIncomingPackage);
            this.latestIncomingPackage = null;
    }
}