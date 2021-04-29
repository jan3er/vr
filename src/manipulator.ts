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

    constructor(input: WebXRInput, world: World)
    {
        this.world = world;
        this.isGrabbed = new Array(this.world.spheres.length);
        this.isGrabbedBefore = new Array(this.world.spheres.length);
        this.grabPos = new Array(this.world.spheres.length);
        this.grabRot = new Array(this.world.spheres.length);
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
        });    

        
        input.onControllerAddedObservable.add(inputSource => {
            if(inputSource.uniqueId.includes("right")) this.inputVR[0] = inputSource;
            if(inputSource.uniqueId.includes("left")) this.inputVR[1] = inputSource;

        });   
    }

    mainLoop(){

        const speed = 0.02;
        if(this.keys["w"] === 1) this.controllers[0].position.x -= speed;
        if(this.keys["s"] === 1) this.controllers[0].position.x += speed;
        if(this.keys["a"] === 1) this.controllers[0].position.z -= speed;
        if(this.keys["d"] === 1) this.controllers[0].position.z += speed;
        if(this.keys["q"] === 1) this.controllers[0].rotationQuaternion.x += speed;
        if(this.keys["e"] === 1) this.controllers[0].rotationQuaternion.x -= speed;
        if(this.keys[" "] === 1) this.controllers[0].squeeze = true; else this.controllers[0].squeeze = false;


        if(this.controllers[0].squeeze){
            this.world.texts[1].text = "squeeze";
        } else {
            this.world.texts[1].text = "";
        }

        this.world.paddle1.position = this.controllers[0].position;
        this.world.paddle1.rotationQuaternion = this.controllers[0].rotationQuaternion;

        for(let i = 0; i < this.world.spheres.length; i++){
            if(this.world.paddle1.intersectsMesh(this.world.spheres[i], false) && this.controllers[0].squeeze && !this.isGrabbed[i]){
                
                var m = new Matrix(); 
                this.world.paddle1.getWorldMatrix().invertToRef(m); 
                var v = Vector3.TransformCoordinates(this.world.spheres[i].position, m);
                this.isGrabbed[i] = 1;
                this.grabPos[i] = v;
                this.grabRot[i] = this.world.spheres[i].rotationQuaternion.clone();
                console.log(this.world.spheres[i].rotationQuaternion);
                console.log("grab!");
            }
            if(!this.controllers[0].squeeze){
                this.isGrabbed[i] = 0;
            }
        }

        for(let i = 0; i < this.world.spheres.length; i++){
            if(this.isGrabbed[i]){
                this.world.spheres[i].parent = this.world.paddle1;
                this.world.spheres[i].position = this.grabPos[i];
                //todo, figure out how to do this correctly
                this.world.spheres[i].rotationQuaternion.set(this.grabRot[i].x, this.grabRot[i].y, this.grabRot[i].z, this.grabRot[i].w );
                this.world.texts[2].text = ""+this.grabRot[i];
            } 
            if(!this.isGrabbed[i] && this.isGrabbedBefore[i]) {
                this.world.spheres[i].setParent(null)
                
                this.world.spheres[i].physicsImpostor.setLinearVelocity(new Vector3());
                this.world.spheres[i].physicsImpostor.setAngularVelocity(new Vector3());
            }

            this.isGrabbedBefore[i] = this.isGrabbed[i];
        }
    }

    isInVR(){
        return this.inputVR[0] !== undefined && this.inputVR[1] !== undefined;
    }

}

