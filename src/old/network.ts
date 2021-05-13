import { makeConnection } from "./makeConnection";
import {beep1, beep2, beep3} from "./util";
import { Vector3, Color3, Mesh, StandardMaterial } from "@babylonjs/core";
import { Axis, Quaternion } from "@babylonjs/core";
import { World } from "./world";

//TODO: we probably want different update rates for ball and paddle. paddle every frame and ball less frequent?
const FRAMES_PER_UPDATE = 1;  //how often should the physics state be sent
const BUFFER_DELAY = 10       //how many packets should the buffer be ahead
const BUFFER_LENGTH = 20;     //some number. 10 is probably large enough

export class Network 
{
    world: World;
    p;
    //manipulator: Manipulator;
    renderCounter = 0;
    connected = false;
    
    buffer = new Array(BUFFER_LENGTH); //where the incomming packages are stored before they are processed.
    timeLocal = 0;       //a counter that is incremented for every local physics snapshot
    timeRemote = 0;      //the counter of the currently applied physics snapshot of the remote peer
    timeRemoteMax = 0;   //the maximum snapshot time of any packet in the buffer
    averageGap = 0;      //rolling average of the distance between timeRemote and timeRemoteMax
    averageMissing = 0;  //rolling average of fraction of packages that did not arrive on time

    //apply updates on ball only if local authority is greater than remote authority
    localAuthority: Array<number>;
    remoteAuthority: Array<number>;

    //shortcuts to this.world.paddle1 and 2
    localPaddle: Mesh;
    remotePaddle: Mesh;

    //either 1 or 2
    localId = 0;
    remoteId = 0;

    // //for the random movement of uncontrolled paddles
    // randomX = 10 + Math.random() * 10;
    // randomY = 10 + Math.random() * 10;
    
    constructor(world: World) {
        this.world = world;
        //this.manipulator = manipulator;
        //apply updates on ball only if local authority is greater than remote authority
        this.localAuthority  = new Array(this.world.spheres.length);
        this.remoteAuthority = new Array(this.world.spheres.length);
    }

    //starts establishing the connection. to be called once at the beginning
    async start() {
        this.world.texts[4].text = "connecting...";
        this.p = await makeConnection();
        
        if(this.p.initiator) {
            this.localAuthority.fill(1);
            this.remoteAuthority.fill(0);;
            document.title = "Player 1";
            this.localId = 1;
            this.remoteId = 2;
        } else {
            this.localAuthority.fill(0);
            this.remoteAuthority.fill(1);;
            document.title = "Player 2";
            this.localId = 2;
            this.remoteId = 1;
        }

        this.p.on('data', data => this.receiveData(data));
        this.connected = true;
        this.world.texts[4].text = "connected";

        if(this.p.initiator) {
            this.localPaddle   = this.world.paddle1;
            this.remotePaddle  = this.world.paddle2;
        } else {
            this.localPaddle   = this.world.paddle1;
            this.remotePaddle  = this.world.paddle2;
        }

        //update authority if we hit it with the paddle
        //also grab objects
        for(let i = 0; i < this.world.spheres.length; i++){
            this.world.spheres[i].physicsImpostor.registerOnPhysicsCollide(this.localPaddle.physicsImpostor, (main, collided) => {
                this.localAuthority[i] = this.remoteAuthority[i] + 1;
            });
        }

        //propagate authority if an object hits another object.
        //the faster one takes authority
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
        this.remotePaddle.physicsImpostor.physicsBody.collisionFilterGroup = 2;

        (<StandardMaterial>this.localPaddle.material).diffuseColor = new Color3(1, 0, 0);
        (<StandardMaterial>this.remotePaddle.material).diffuseColor = new Color3(0.9, 0.9, 0.9);
    }

    //to be called once every render frame
    mainLoop() {

        // if(this.manipulator.isConnected()){
        //     this.manipulator.processInputs();
        // }

        //send data and process incoming data every FRAMES_PER_UPDATE frame
        if(this.connected && this.renderCounter % FRAMES_PER_UPDATE === 0) {
            this.sendData();
            this.processData();
            this.timeLocal += 1;
        }

        // if(this.connected){

        //     //update local paddle
        //     if(this.world.xr.input.controllers.length != 0){
        //         this.localPaddle.position = this.world.xr.input.controllers[0].grip.position;
        //     } else {
        //         //movement of non-oculus paddle
        //         const speed = 0.5;
        //         this.localPaddle.position = new Vector3(
        //             0.7*Math.sin(speed*this.renderCounter/this.randomX),
        //             0, 
        //             0.7*Math.sin(speed*this.renderCounter/this.randomY)
        //         );
        //     }
        // }
        
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
        
        const speed = mesh.physicsImpostor.getLinearVelocity().length() + mesh.physicsImpostor.getAngularVelocity().length();
        //const speed = mesh.physicsImpostor.getAngularVelocity().length();
        return speed <= 0.05;
    }

    //send local data to remote peer
    sendData(){
        this.p.send(JSON.stringify({ 
            time      : this.timeLocal,
            paddle    : this.meshToPackage(this.localPaddle),
            spheres   : this.world.spheres.map(sphere => this.meshToPackage(sphere)),
            authority : this.localAuthority
        }));
    }

    simpleRemoteTimeUpdate(){
        this.timeRemote = this.timeRemoteMax;
    }
    complicatedRemoteTimeUpdate(){
        this.timeRemote+=1;
        const SMOOTH_GAP = 0.05
        //console.log("--");
        //console.log("gap:", this.jitterMax-this.jitterCurrent);
        this.averageGap = (1-SMOOTH_GAP) * this.averageGap + SMOOTH_GAP * (this.timeRemoteMax - this.timeRemote);
        //console.log(this.averageGap);
        if(this.averageGap > 1.5*BUFFER_DELAY || this.averageGap < -5*BUFFER_DELAY){
            const newtarget = this.timeRemoteMax - BUFFER_DELAY;
            console.log("the buffer was ahead for some time. jump this many extra steps:", (newtarget - this.timeRemote));
            beep2();
            this.timeRemote = newtarget; //Math.max(this.timeRemote, newtarget);
            this.averageGap = BUFFER_DELAY;
        } 
    
        var bufferHealth = []
        for(let i = 0; i < BUFFER_LENGTH; i++){
            const data = this.buffer[(this.timeRemote + i) % BUFFER_LENGTH];
            if(data !== undefined && data.time >= this.timeRemote){
                bufferHealth.push(1);
            } else {
                bufferHealth.push(0);
            }
        }
    
        const data = this.buffer[this.timeRemote % BUFFER_LENGTH];
    
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
    }
    processData(){
        
        // this.complicatedRemoteTimeUpdate();
        this.simpleRemoteTimeUpdate();

        const data = this.buffer[this.timeRemote % BUFFER_LENGTH];
    
        if(data === undefined || data.time < this.timeRemote) return;
    
   
        this.packageToMesh(data.paddle, this.remotePaddle);

        //only apply the ball position if the remote authority is higher
        //visualize it by making ball red if its under our control
        for(let i = 0; i < this.world.spheres.length; i++){
            this.remoteAuthority[i] = this.buffer[this.timeRemoteMax % BUFFER_LENGTH].authority[i];
        }
        //console.log("remote", this.remoteAuthority, "local", this.localAuthority);
        for(let i = 0; i < this.world.spheres.length; i++) {
            if(this.localAuthority[i] < this.remoteAuthority[i]){
                this.packageToMesh(data.spheres[i], this.world.spheres[i]);
                (<StandardMaterial>this.world.spheres[i].material).diffuseColor = new Color3(0.9,0.9,0.9);
            } else {
                (<StandardMaterial>this.world.spheres[i].material).diffuseColor = new Color3(1,0,0);
            }
            if(this.isAtRest(this.world.spheres[i])){
                (<StandardMaterial>this.world.spheres[i].material).diffuseColor = new Color3(0,0,0);
            }
        }
    }
}