import {  Mesh, WebXRInput, WebXRInputSource, Vector3, KeyboardEventTypes, Matrix, Quaternion } from "@babylonjs/core";
import '@babylonjs/loaders/';
import { World } from "./world";


export class Controller
{
    position = new Vector3();
    rotationQuaternion = new Quaternion();
    squeeze: boolean;
}

export class Manipulator
{
    inputVR: Array<WebXRInputSource> = [];
    keys;
    controllers: Array<Controller> = [new Controller(), new Controller()];
    world: World;

    isGrabbed: Array<number>;
    isGrabbedBefore: Array<number>;
    grabPos: Array<Vector3>;
    grabRot: Array<Quaternion>;

    //tells us whether we want to move using the keyboard or the paddle should move by itself
    autoMovement = true;

    //needed for keyboard input
    tmpRotation: Vector3;

    //for auto movement
    renderCounter = 0;
    randomX = 10 + Math.random() * 10;
    randomY = 10 + Math.random() * 10;

    constructor(input: WebXRInput, world: World)
    {
        this.world = world;
        this.isGrabbed = new Array(this.world.spheres.length);
        this.isGrabbedBefore = new Array(this.world.spheres.length);
        this.grabPos = new Array(this.world.spheres.length);
        this.grabRot = new Array(this.world.spheres.length);
        this.tmpRotation = new Vector3();
        this.keys = {};
        world.scene.onKeyboardObservable.add((e) => {
            switch (e.type) {
                case KeyboardEventTypes.KEYDOWN:
                    this.keys[e.event.key] = 1;
                    break;
                case KeyboardEventTypes.KEYUP:
                    this.keys[e.event.key] = 0;
                    break;
            }
            //enter turns on automatic mode
            if(e.type == KeyboardEventTypes.KEYDOWN && e.event.key == "Enter" && !this.autoMovement){
                this.autoMovement = true;
            }
            //wasd turns on keyboard mode
            if(e.type == KeyboardEventTypes.KEYDOWN && ["w","a","s","d"].includes(e.event.key) && this.autoMovement){
                this.autoMovement = false;
            }
        });    

        
        input.onControllerAddedObservable.add(inputSource => {
            if(inputSource.uniqueId.includes("right")) this.inputVR[0] = inputSource;
            if(inputSource.uniqueId.includes("left")) this.inputVR[1] = inputSource;

        });   
    }

    mainLoop(){

        //if in vr, get input
        if(this.isInVR()){
            this.controllers[0].position.copyFrom(this.inputVR[0].grip.position);
            this.controllers[0].rotationQuaternion.copyFrom(this.inputVR[0].grip.rotationQuaternion);
            this.controllers[0].squeeze = this.inputVR[0].motionController.getComponentOfType("trigger").pressed;
        }
        else if(!this.autoMovement)
        {
            //if we are not in vr, we simulate it using a keyboard
            const speed = 0.02;
            if(this.keys["w"] === 1) this.controllers[0].position.x -= speed;
            if(this.keys["s"] === 1) this.controllers[0].position.x += speed;
            if(this.keys["a"] === 1) this.controllers[0].position.z -= speed;
            if(this.keys["d"] === 1) this.controllers[0].position.z += speed;
            if(this.keys[" "] === 1) this.controllers[0].squeeze = true; else this.controllers[0].squeeze = false;
            if(this.keys["q"] === 1) {
                this.tmpRotation.y -= speed;
                Quaternion.FromEulerVectorToRef(this.tmpRotation, this.controllers[0].rotationQuaternion);
            }
            if(this.keys["e"] === 1) {
                this.tmpRotation.y += speed;
                Quaternion.FromEulerVectorToRef(this.tmpRotation, this.controllers[0].rotationQuaternion);
            }
        } else {
            //if we are lazy, move the paddle automatically
            const speed = 0.5;
            this.controllers[0].position = new Vector3(
                0.7*Math.sin(speed*this.renderCounter/this.randomX),
                0, 
                0.7*Math.sin(speed*this.renderCounter/this.randomY)
            );
            Quaternion.FromEulerVectorToRef(new Vector3(Math.sin(this.renderCounter/20),0,0), this.controllers[0].rotationQuaternion);
            this.renderCounter += 1;

            if(this.keys[" "] === 1) this.controllers[0].squeeze = true; else this.controllers[0].squeeze = false;
        }


        //////////////////////////


        if(this.controllers[0].squeeze){
            this.world.texts[1].text = "squeeze";
        } else {
            this.world.texts[1].text = "";
        }

        var paddle = this.world.paddle1;
        this.world.paddle1.position = this.controllers[0].position;
        this.world.paddle1.rotationQuaternion = this.controllers[0].rotationQuaternion;

        for(let i = 0; i < this.world.spheres.length; i++){
            if(this.world.paddle1.intersectsMesh(this.world.spheres[i], false) && this.controllers[0].squeeze && !this.isGrabbed[i]){

                this.world.spheres[i].setParent(this.world.paddle1);
                this.grabPos[i] = this.world.spheres[i].position.clone();
                this.grabRot[i] = this.world.spheres[i].rotationQuaternion.clone();
                this.isGrabbed[i] = 1;

            }
            if(!this.controllers[0].squeeze){
                this.isGrabbed[i] = 0;
            }

            if(this.isGrabbed[i]){
                this.world.spheres[i].position.copyFrom(this.grabPos[i]);
                this.world.spheres[i].rotationQuaternion.copyFrom(this.grabRot[i]);
            } 

            if(!this.isGrabbed[i] && this.isGrabbedBefore[i]) {
                this.world.spheres[i].setParent(null)
                
                this.world.spheres[i].physicsImpostor.setLinearVelocity(new Vector3());
                this.world.spheres[i].physicsImpostor.setAngularVelocity(new Vector3());
                console.log("ungrab");
            }

            this.isGrabbedBefore[i] = this.isGrabbed[i];
        }
    }

    //a bit hacky, I know
    isInVR(){
        return this.inputVR[0] !== undefined && this.inputVR[1] !== undefined && this.inputVR[0].motionController !== undefined;
    }

}


