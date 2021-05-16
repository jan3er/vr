import { makeConnection } from "./makeConnection";
import { Serializer } from "./serialize";
import { World } from "./world";

export class Network 
{
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

        let i = this.p.initiator;
        for(let o of this.world.objects){
            if(i){
                o.localAuthority = 1;
                o.remoteAuthority = 0;
            } else {
                o.localAuthority = 0;
                o.remoteAuthority = 1;
            }
            i = !i;
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
            this.p.send(pkg);
        }

        if(this.latestIncomingPackage !== null)
            this.serializer.deserialize(this.latestIncomingPackage);
            this.latestIncomingPackage = null;
    }
}