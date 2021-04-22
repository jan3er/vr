import { makeConnection } from "./makeConnection";
import {beep1, beep2, beep3} from "./util";
import { Vector3, Color3 } from "@babylonjs/core";

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

        //apply updates on ball only if local authority is greater than remote authority
        this.localAuthority = 0;
        this.remoteAuthority = 0;
    }

    //starts establishing the connection. to be called once at the beginning
    async start() {
        this.p = await makeConnection();
    
        // if(this.p.initiator) { //server bumps up the ball every once in a while
        //     setInterval(function(){
        //         this.scene.getMeshByName("sphere").physicsImpostor.setLinearVelocity(new Vector3(0,7,0));
        //     }.bind(this), 5118);
        // }
        
        if(this.p.initiator) {
            this.localAuthority = 1;
            this.remoteAuthority = 0;
            document.title = "Player 1";
        } else {
            this.localAuthority = 0;
            this.remoteAuthority = 1;
            document.title = "Player 2";
        }

        this.p.on('data', data => this.receiveData(data));
        this.connected = true;

        var remotePaddle;
        var localPaddle;
        const sphere = this.scene.getMeshByName("sphere");
        if(this.p.initiator) {
            localPaddle   = this.scene.getMeshByName("paddle1");
            remotePaddle  = this.scene.getMeshByName("paddle2");
        } else {
            remotePaddle  = this.scene.getMeshByName("paddle1");
            localPaddle   = this.scene.getMeshByName("paddle2");
        }
        sphere.physicsImpostor.registerOnPhysicsCollide(localPaddle.physicsImpostor, (main, collided) => {
            this.localAuthority = this.remoteAuthority + 1;
        });

        //the default physics filter group is 1. we want the ball to not collide with the remote paddle
        remotePaddle.physicsImpostor._physicsBody.collisionFilterGroup = 2;

        localPaddle.material.diffuseColor = new Color3(1, 0, 0);
        remotePaddle.material.diffuseColor = new Color3(0.9, 0.9, 0.9);

        
    }

    //to be called once every render frame
    render() {
        if(this.connected && this.renderCounter % FRAMES_PER_UPDATE === 0) {
            this.sendData();
            this.processData();
            this.timeLocal += 1;
        }
        this.renderCounter += 1;

        const speed = 1;
        if(this.connected && this.p.initiator) {
            
            const paddle = this.scene.getMeshByName("paddle1");
            const pos = new Vector3(2.5*Math.sin(speed*this.renderCounter/25), 1, 5 + 3.5*Math.sin(speed*this.renderCounter/17));
            paddle.position = pos;

            const sphere = this.scene.getMeshByName("sphere");
            if (sphere.position._y > 10 || sphere.position._y < -1) {
                sphere.position = new Vector3(1,2,1);
                sphere.physicsImpostor.setLinearVelocity(new Vector3(0,0,0));
            }
        }
        if(this.connected && !this.p.initiator) {
            
            const paddle = this.scene.getMeshByName("paddle2");
            const pos = new Vector3(2.5*Math.sin(speed*this.renderCounter/18), 1, -5 + 3.5*Math.sin(speed*this.renderCounter/27));
            paddle.position = pos;

            const sphere = this.scene.getMeshByName("sphere");
            if (sphere.position._y > 10 || sphere.position._y < -1) {
                sphere.position = new Vector3(1,2,1);
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

    //heper function to get the network data from a mesh
    meshToPackage(mesh) {
        const pos = mesh.position;
        const rot = mesh.rotation;
        const linVel = mesh.physicsImpostor.getLinearVelocity();
        const angVel = mesh.physicsImpostor.getAngularVelocity();
        return {
            name : mesh.name,
            pos : {
                x : pos._x,
                y : pos._y,
                z : pos._z
            },
            rot : {
                x : rot._x,
                y : rot._y,
                z : rot._z
            },            
            linVel : {
                x : linVel._x,
                y : linVel._y,
                z : linVel._z
            },
            angVel : {
                x : angVel._x,
                y : angVel._y,
                z : angVel._z
            }
        }
    }
    //helper function to apply the network data to some mesh 
    packageToMesh(pack,mesh) {
        mesh.position = new Vector3(pack.pos.x, pack.pos.y, pack.pos.z);
        //console.log(pack.rot);
        //console.log(mesh.rotation);
        mesh.rotation.x = pack.rot.x;
        mesh.rotation.y = pack.rot.y;
        mesh.rotation.z = pack.rot.z;
        //mesh.rotation = new Vector3(pack.rot.x, pack.rot.y, pack.rot.z);
        mesh.physicsImpostor.setLinearVelocity(new Vector3(pack.linVel.x, pack.linVel.y, pack.linVel.z));
        mesh.physicsImpostor.setAngularVelocity(new Vector3(pack.angVel.x, pack.angVel.y, pack.angVel.z));
    }

    //send local data to remote peer
    sendData(){
        if(this.p.initiator) {
            this.p.send(JSON.stringify({ 
                time      : this.timeLocal,
                paddle    : this.meshToPackage(this.scene.getMeshByName("paddle1")),
                sphere    : this.meshToPackage(this.scene.getMeshByName("sphere")),
                authority : this.localAuthority
            }));
        } else {
            this.p.send(JSON.stringify({ 
                time      : this.timeLocal,
                paddle    : this.meshToPackage(this.scene.getMeshByName("paddle2")),
                sphere    : this.meshToPackage(this.scene.getMeshByName("sphere")),
                authority : this.localAuthority
            }));
        }
    }

    processData(){
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
    
        var remotePaddle;
        var localPaddle;
        const sphere = this.scene.getMeshByName("sphere");
        if(this.p.initiator) {
            localPaddle   = this.scene.getMeshByName("paddle1");
            remotePaddle  = this.scene.getMeshByName("paddle2");
        } else {
            remotePaddle  = this.scene.getMeshByName("paddle1");
            localPaddle   = this.scene.getMeshByName("paddle2");
        }
        this.packageToMesh(data.paddle, remotePaddle);

        //only apply the ball position if the remote authority is higher
        //visualize it by making ball red if its under our control
        this.remoteAuthority = this.buffer[this.timeRemoteMax % BUFFER_LENGTH].authority;
        if(this.localAuthority < this.remoteAuthority){
            this.packageToMesh(data.sphere, sphere);
            sphere.material.diffuseColor = new Color3(0.9,0.9,0.9);
        } else {
            sphere.material.diffuseColor = new Color3(1,0,0);
        }
    }

}

    