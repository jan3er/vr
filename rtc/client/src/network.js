import { makeConnection } from "./makeConnection";
import {beep1, beep2, beep3} from "./util";
import { Vector3 } from "@babylonjs/core";

//TODO: we probably want different update rates for ball and paddle. paddle every frame and ball less frequent?
const FRAMES_PER_UPDATE = 1;  //how often should the physics state be sent
const BUFFER_DELAY = 10       //how many packets should the buffer be ahead
const BUFFER_LENGTH = 20;     //some number. 10 is probably large enough

export class Network {
    
    constructor(scene) {
        this.scene = scene;
        this.renderCounter = 0; //the current render frame number. this number is not sent over the network
        this.connected = false; //true if a connection with the peer is established
        this.p = null;          //the peer connection object

        this.buffer = new Array(BUFFER_LENGTH); //where the incomming packages are stored before they are processed.
        this.timeLocal = 0;       //a counter that is incremented for every local physics snapshot
        this.timeRemote = 0;      //the counter of the currently applied physics snapshot of the remote peer
        this.timeRemoteMax = 0;   //the maximum snapshot time of any packet in the buffer
        this.averageGap = 0;      //rolling average of the distance between timeRemote and timeRemoteMax
        this.averageMissing = 0;  //rolling average of fraction of packages that did not arrive on time
    }

    //starts establishing the connection. to be called once at the beginning
    async start() {
        this.p = await makeConnection();
        this.p.on('data', data => this.receiveData(data));
    
        // if(this.p.initiator) { //server bumps up the ball every once in a while
        //     setInterval(function(){
        //         this.scene.getMeshByName("sphere").physicsImpostor.setLinearVelocity(new Vector3(0,7,0));
        //     }.bind(this), 5118);
        // }
        this.connected = true;
    }

    //to be called once every render frame
    render() {
        if(this.connected && this.renderCounter % FRAMES_PER_UPDATE === 0) {
            if(this.p.initiator) {
                this.updateServer();
            } else {
                this.updateClient();
            }
            this.timeLocal += 1;
        }
        this.renderCounter += 1;


        if(this.connected && this.p.initiator) {
            const speed = 1;

            const paddle = this.scene.getMeshByName("paddle");
            const pos = new Vector3(2.5*Math.sin(speed*this.renderCounter/25),0.5,2.5*Math.sin(speed*this.renderCounter/17));
            paddle.position = pos;
            //paddle.physicsImpostor.setLinearVelocity(new Vector3(100,100,100));

            const sphere = this.scene.getMeshByName("sphere");
            if (sphere.position._y > 5 || sphere.position._y < -1) {
                sphere.position = new Vector3(1,1,1);
                sphere.physicsImpostor.setLinearVelocity(new Vector3(0,0,0));
            }
        }
    }

    //called whenever some new data from the peer comes in
    receiveData(data){
        data = JSON.parse(data);
        this.buffer[data.time % BUFFER_LENGTH] = data;
        this.timeRemoteMax = Math.max(this.timeRemoteMax, data.time);
    }

    meshToDict(mesh) {
        const pos = mesh.position;
        const vel = mesh.physicsImpostor.getLinearVelocity();
        return {
            name : mesh.name,
            pos : {
                x : pos._x,
                y : pos._y,
                z : pos._z
            },            
            vel : {
                x : vel._x,
                y : vel._y,
                z : vel._z
            }
        }
    }
    
    dictToMesh(dict,mesh) {
        mesh.position = new Vector3(dict.pos.x, dict.pos.y, dict.pos.z);
        mesh.physicsImpostor.setLinearVelocity(new Vector3(dict.vel.x, dict.vel.y, dict.vel.z));
    }

    //called on the server once every network tick
    updateServer(){
        const toSend = ["paddle", "sphere"];
        const pack = { 
            time : this.timeLocal,
            meshes :  toSend.map(name => this.meshToDict(this.scene.getMeshByName(name)))
        }
        this.p.send(JSON.stringify(pack));
    }

    //called on the client once every network tick
    updateClient(){
    
        this.timeRemote+=1;
        const SMOOTH_GAP = 0.05
        //console.log("--");
        //console.log("gap:", this.jitterMax-this.jitterCurrent);
        this.averageGap = (1-SMOOTH_GAP) * this.averageGap + SMOOTH_GAP * (this.timeRemoteMax - this.timeRemote);
        //console.log(this.averageGap);
        if(this.averageGap > 1.5*BUFFER_DELAY){
            const newtarget = this.timeRemoteMax - BUFFER_DELAY;
            console.log("the buffer was ahead for some time. jump this many extra steps:", (newtarget - this.timeRemote));
            beep2();
            this.timeRemote = Math.max(this.timeRemote, newtarget);
            this.averageGap = BUFFER_DELAY;
        } else {
        }
    
        var bufferHealth = []
        for(var i = 0; i < BUFFER_LENGTH; i++){
            const data = this.buffer[(this.timeRemote + i) % BUFFER_LENGTH];
            if(data !== undefined && data.time >= this.timeRemote){
                bufferHealth.push(1);
            } else {
                bufferHealth.push(0);
            }
        }
        /*console.log(bufferHealth);*/
    
        /*console.log(jitterCurrent);*/
        /*console.log(averageGap);*/
    
        const data = this.buffer[this.timeRemote % BUFFER_LENGTH]
    
        const SMOOTH_MISSING = 0.05
        if(data === undefined || data.time < this.timeRemote) {
            /*console.log("old package was in buffer");*/
            beep1();
            this.averageMissing = SMOOTH_MISSING * 1 + (1-SMOOTH_MISSING) * this.averageMissing;
        } else {
            this.averageMissing = SMOOTH_MISSING * 0 + (1-SMOOTH_MISSING) * this.averageMissing;
        }
    
        if(this.averageMissing > 0.5) {
            console.log("we have been missing more than half of our data for some time. repeat frame.");
            beep3();
            this.averageMissing = 0;
            this.timeRemote-=1;
        }
    
        if(data === undefined || data.time < this.timeRemote) return;
    
        data.meshes.forEach(mesh => this.dictToMesh(mesh,this.scene.getMeshByName(mesh.name)));
    }
}

    