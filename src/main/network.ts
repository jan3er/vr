import { Game } from "./game";
import { makeConnection } from "./makeConnection";
import { Serializer } from "./serialize";
import { World } from "./world";

export class Network 
{
    p;
    connected = false;
    latestIncomingPackage: ArrayBuffer = null;
    game: Game;
    
    constructor(game: Game) {
        this.game = game;
    }

    //starts establishing the connection. to be called once at the beginning
    async start() {
        this.p = await makeConnection();
        
        if(this.p.initiator) {
            document.title = "Player 1";
            this.game.world.players[0].isLocal = true;
            this.game.world.players[1].isLocal = false;
        } else {
            document.title = "Player 2";
            this.game.world.players[0].isLocal = false;
            this.game.world.players[1].isLocal = true;
        }

        let i = this.p.initiator;
        for(let o of this.game.world.objects){
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
            const pkg = this.game.serializer.serialize();
            this.p.send(pkg);
        }

        if(this.latestIncomingPackage !== null)
            this.game.serializer.deserialize(this.latestIncomingPackage);
            this.latestIncomingPackage = null;
    }
}