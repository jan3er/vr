import { makeConnection } from "./makeConnection";
import {beep1, beep2, beep3} from "./util";
import { Vector3, Color3 } from "@babylonjs/core";
import { Axis, Quaternion } from "@babylonjs/core";

//TODO: we probably want different update rates for ball and paddle. paddle every frame and ball less frequent?
const FRAMES_PER_UPDATE = 1;  //how often should the physics state be sent
const BUFFER_DELAY = 10       //how many packets should the buffer be ahead
const BUFFER_LENGTH = 20;     //some number. 10 is probably large enough

function dummy(){
    return 5;
}

export class Network {
    
    constructor(world) {
        this.world = world;
        this.scene = world.scene;
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
        this.localAuthority  = new Array(this.world.spheres.length);
        this.remoteAuthority = new Array(this.world.spheres.length);
    }

    //starts establishing the connection. to be called once at the beginning
    async start() {
        this.p = await makeConnection();
        
        if(this.p.initiator) {
            this.localAuthority.fill(1);
            this.remoteAuthority.fill(0);;
            document.title = "Player 1";
        } else {
            this.localAuthority.fill(0);
            this.remoteAuthority.fill(1);;
            document.title = "Player 2";
        }

        this.p.on('data', data => this.receiveData(data));
        this.connected = true;

        var remotePaddle;
        var localPaddle;
        if(this.p.initiator) {
            localPaddle   = this.world.paddle1;
            remotePaddle  = this.world.paddle2;
        } else {
            remotePaddle  = this.world.paddle1;
            localPaddle   = this.world.paddle2;
        }
        for(let i = 0; i < this.world.spheres.length; i++){
            this.world.spheres[i].physicsImpostor.registerOnPhysicsCollide(localPaddle.physicsImpostor, (main, collided) => {
                this.localAuthority[i] = this.remoteAuthority[i] + 1;
            });
        }

        for(let i = 0; i < this.world.spheres.length; i++){
            for(let j = 0; j < this.world.spheres.length; j++){
                if(i == j) continue;
                this.world.spheres[i].physicsImpostor.registerOnPhysicsCollide(this.world.spheres[j].physicsImpostor, (main, collided) => {
                    if(this.localAuthority[i] > this.remoteAuthority[i] &&
                        this.world.spheres[i].physicsImpostor.getAngularVelocity().length() > 
                        this.world.spheres[j].physicsImpostor.getAngularVelocity().length()) 
                    {
                        this.localAuthority[j] = this.remoteAuthority[j] + 1;
                    }
                });
            }
        }



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

        // if(this.connected && this.renderCounter % 20 === 0) {
        //     console.log("---");
        //     console.log(this.world.spheres[0].physicsImpostor.getAngularVelocity());

        //     console.log(this.world.spheres[0].physicsImpostor.getAngularVelocity().length());

        //     console.log(this.world.spheres[0].physicsImpostor.getLinearVelocity());

        //     console.log(this.world.spheres[0].physicsImpostor.getLinearVelocity().length());
        // }
        

        if(this.connected){
            
            const speed = 0.5;
            if(this.p.initiator){
                const pos = new Vector3(2.5*Math.sin(speed*this.renderCounter/25), 0, 5 + 3.5*Math.sin(speed*this.renderCounter/17));
                this.world.paddle1.position = pos;
            } else {
                const pos = new Vector3(2.5*Math.sin(speed*this.renderCounter/18), 0, -5 + 3.5*Math.sin(speed*this.renderCounter/27));
                this.world.paddle2.position = pos;
            }

            for(let i = 0; i < this.world.spheres.length; i++){
                const sphere = this.world.spheres[i];
                if (sphere.position.y > 10 || sphere.position.y < -1) {
                    sphere.position = new Vector3(1,2,1);
                    sphere.physicsImpostor.setLinearVelocity(new Vector3(0,0,0));
                }
            }

            if(this.world.xr.input.controllers.length != 0){
                const pos = this.world.xr.input.controllers[0].grip.position;
                if(this.p.initiator){
                    this.world.paddle1.position = pos;
                } else {
                    this.world.paddle2.position = pos;
                }
            }
        }

        
        this.renderCounter += 1;
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
        const quat = mesh.rotationQuaternion;
        const linVel = mesh.physicsImpostor.getLinearVelocity();
        const angVel = mesh.physicsImpostor.getAngularVelocity();
        return {
            name : mesh.name,
            pos : {
                x : pos.x,
                y : pos.y,
                z : pos.z
            },
            quat : {
                x : quat.x,
                y : quat.y,
                z : quat.z,
                w : quat.w
            },            
            linVel : {
                x : linVel.x,
                y : linVel.y,
                z : linVel.z
            },
            angVel : {
                x : angVel.x,
                y : angVel.y,
                z : angVel.z
            }
        }
    }
    //helper function to apply the network data to some mesh 
    packageToMesh(pack,mesh) {
        mesh.position = new Vector3(pack.pos.x, pack.pos.y, pack.pos.z);
        mesh.rotationQuaternion = new Quaternion(pack.quat.x, pack.quat.y, pack.quat.z, pack.quat.w);
        mesh.physicsImpostor.setLinearVelocity(new Vector3(pack.linVel.x, pack.linVel.y, pack.linVel.z));
        mesh.physicsImpostor.setAngularVelocity(new Vector3(pack.angVel.x, pack.angVel.y, pack.angVel.z));
    }

    isAtRest(mesh){
        //there is some vibration on the objects. therefore the linear velocity is not zero at rest
        //maybe this can be solved by increasing the number of iterations of the solver
        //https://sbcode.net/threejs/physics-cannonjs/
        
        // const speed = mesh.physicsImpostor.getLinearVelocity().length() + mesh.physicsImpostor.getAngularVelocity().length();
        const speed = mesh.physicsImpostor.getAngularVelocity().length();
        return speed <= 0.05;
    }    
    isAtRest2(mesh){
        const speed = mesh.physicsImpostor.getLinearVelocity().length() + mesh.physicsImpostor.getAngularVelocity().length();
        //const speed = mesh.physicsImpostor.getAngularVelocity().length();
        return speed <= 0.05;
    }
    //send local data to remote peer
    sendData(){
        //console.log(this.meshToPackage(this.scene.getMeshByName("sphere")));
        if(this.p.initiator) {
            this.p.send(JSON.stringify({ 
                time      : this.timeLocal,
                paddle    : this.meshToPackage(this.world.paddle1),
                spheres   : this.world.spheres.map(sphere => this.meshToPackage(sphere)),
                authority : this.localAuthority
            }));
        } else {
            this.p.send(JSON.stringify({ 
                time      : this.timeLocal,
                paddle    : this.meshToPackage(this.world.paddle2),
                spheres   : this.world.spheres.map(sphere => this.meshToPackage(sphere)),
                authority : this.localAuthority
            }));
        }
    }

    processData(){
        // this.timeRemote+=1;
        // const SMOOTH_GAP = 0.05
        // //console.log("--");
        // //console.log("gap:", this.jitterMax-this.jitterCurrent);
        // this.averageGap = (1-SMOOTH_GAP) * this.averageGap + SMOOTH_GAP * (this.timeRemoteMax - this.timeRemote);
        // //console.log(this.averageGap);
        // if(this.averageGap > 1.5*BUFFER_DELAY || this.averageGap < -5*BUFFER_DELAY){
        //     const newtarget = this.timeRemoteMax - BUFFER_DELAY;
        //     console.log("the buffer was ahead for some time. jump this many extra steps:", (newtarget - this.timeRemote));
        //     beep2();
        //     this.timeRemote = newtarget; //Math.max(this.timeRemote, newtarget);
        //     this.averageGap = BUFFER_DELAY;
        // } 
    
        // var bufferHealth = []
        // for(let i = 0; i < BUFFER_LENGTH; i++){
        //     const data = this.buffer[(this.timeRemote + i) % BUFFER_LENGTH];
        //     if(data !== undefined && data.time >= this.timeRemote){
        //         bufferHealth.push(1);
        //     } else {
        //         bufferHealth.push(0);
        //     }
        // }
    
        // const data = this.buffer[this.timeRemote % BUFFER_LENGTH];
    
        // const SMOOTH_MISSING = 0.05
        // if(data === undefined || data.time < this.timeRemote) {
        //     /*console.log("old package was in buffer");*/
        //     beep1();
        //     this.averageMissing = SMOOTH_MISSING * 1 + (1-SMOOTH_MISSING) * this.averageMissing;
        // } else {
        //     this.averageMissing = SMOOTH_MISSING * 0 + (1-SMOOTH_MISSING) * this.averageMissing;
        // }
    
        // if(this.averageMissing > 0.5) {
        //     console.log("we have been missing more than half of our data for some time. repeat frame.");
        //     beep3();
        //     this.averageMissing = 0;
        //     this.timeRemote-=1;
        // }

        this.timeRemote = this.timeRemoteMax;
        const data = this.buffer[this.timeRemote % BUFFER_LENGTH];
    
        if(data === undefined || data.time < this.timeRemote) return;
    
        var remotePaddle;
        var localPaddle;
        if(this.p.initiator) {
            localPaddle   = this.world.paddle1;
            remotePaddle  = this.world.paddle2;
        } else {
            remotePaddle  = this.world.paddle1;
            localPaddle   = this.world.paddle2;
        }
        this.packageToMesh(data.paddle, remotePaddle);

        //only apply the ball position if the remote authority is higher
        //visualize it by making ball red if its under our control
        for(let i = 0; i < this.world.spheres.length; i++){
            this.remoteAuthority[i] = this.buffer[this.timeRemoteMax % BUFFER_LENGTH].authority[i];
        }
        //console.log("remote", this.remoteAuthority, "local", this.localAuthority);
        for(let i = 0; i < this.world.spheres.length; i++) {
            if(this.localAuthority[i] < this.remoteAuthority[i]){
                this.packageToMesh(data.spheres[i], this.world.spheres[i]);
                this.world.spheres[i].material.diffuseColor = new Color3(0.9,0.9,0.9);
            } else {
                this.world.spheres[i].material.diffuseColor = new Color3(1,0,0);
            }
            if(this.isAtRest2(this.world.spheres[i])){
                this.world.spheres[i].material.diffuseColor = new Color3(0,0,0);
            }

        }
    }

}