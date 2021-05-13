import { makeConnection } from "./makeConnection";
import { World } from "./world";

export class Network 
{
    //TODO: we probably want different update rates for ball and paddle. paddle every frame and ball less frequent?
    static readonly FRAMES_PER_UPDATE = 1;  //how often should the physics state be sent
    static readonly BUFFER_DELAY = 10       //how many packets should the buffer be ahead
    static readonly BUFFER_LENGTH = 20;     //some number. 10 is probably large enough

    world: World;
    p;
    latestPackage: ArrayBuffer;
    connected = false;
    
    constructor(world: World) {
        this.world = world;
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
            this.latestPackage = data.buffer;
        });
        this.connected = true;
    }

    //to be called once every render frame
    mainLoop() {
        if(this.connected) {
            this.world.deserializeRecursive(this.latestPackage);
            this.p.send(this.world.serializeRecursive());
        }
    }
}