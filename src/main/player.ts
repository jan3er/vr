import { Mesh, Scene, SphereBuilder, Vector3, PhysicsImpostor, StandardMaterial, Color3, KeyboardEventTypes, Quaternion } from "@babylonjs/core";
import { Serializable, Serializer } from "./serialize2";
import { World } from "./world";

export class NetworkController extends Serializable{
    mesh: Mesh;
    world: World;
    isLocal = true;
    id: number;
    
    //for grabbing stuff
    squeeze: boolean;
    
    grab = false;
    
    //for keyboard input handling
    keys;

    //tells us whether we want to move using the keyboard or the paddle should move by itself
    autoMovement = true;

    //needed for keyboard input
    tmpRotation = new Vector3();

    //for auto movement
    renderCounter = 0;
    randomX = 10 + Math.random() * 10;
    randomY = 10 + Math.random() * 10;

    static readonly SIZE = 0.2;
    static readonly RESTITUTION = 0.9;

    getPriority() { 
        if(this.isLocal){
            return 999;
        } else {
            return -1;
        }
    };

    serialize() {
        this.writeVector3(this.mesh.position);
        this.writeQuaternion(this.mesh.rotationQuaternion);
    }
    deserialize() {
        if(!this.isLocal) {
            this.mesh.position = this.readVector3();
            this.mesh.rotationQuaternion.copyFrom(this.readQuaternion());   
        }
    }


    constructor(id: number, world: World, serializer: Serializer){
        super();
        this.id = id;
        this.world = world;
        
        this.keys = {};
    
        //the paddle
        this.mesh = SphereBuilder.CreateSphere("",
            { 
                diameterX: NetworkController.SIZE, 
                diameterY: 0.7*NetworkController.SIZE, 
                diameterZ: NetworkController.SIZE, 
                segments: 32 
            },
            this.world.scene
        );
        this.mesh.position = new Vector3(-0.3,0,-0.3);
        this.mesh.physicsImpostor = new PhysicsImpostor(
            this.mesh, 
            PhysicsImpostor.SphereImpostor, 
            {
                mass: 0, 
                restitution: NetworkController.RESTITUTION
            }, 
            this.world.scene
        );
        const material1 = new StandardMaterial("", this.world.scene);
        material1.diffuseColor = new Color3(1, 0, 1);
        this.mesh.material = material1;
        

        this.world.scene.onKeyboardObservable.add((e) => {
            if(this.isLocal){
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

                if(e.type == KeyboardEventTypes.KEYDOWN && e.event.key == " "){
                    if(!this.grab){
                        //grab
                        this.world.objects[0].grab(this);
                        this.grab = true;
                    } else {
                        this.world.objects[0].release(this);
                        this.grab = false;
                    }
                }
            }
        });    

        this.finalize(serializer);
    }
    
    
    isInVR(){
        return false;
    }
    
    
    update(){


        //color
        if(this.isLocal){
            (<StandardMaterial>this.mesh.material).diffuseColor = new Color3(1,0,0);
        } else {
            (<StandardMaterial>this.mesh.material).diffuseColor = new Color3(0.9,0.9,0.9);
        }
        
        //only give input to local player
        if(!this.isLocal) return;

        //if in vr, get input
        if(this.isInVR()){
            /*this.controllers[0].position.copyFrom(this.inputVR[0].grip.position);*/
            /*this.controllers[0].rotationQuaternion.copyFrom(this.inputVR[0].grip.rotationQuaternion);*/
            /*this.controllers[0].squeeze = this.inputVR[0].motionController.getComponentOfType("trigger").pressed;*/
        }
        else if(!this.autoMovement)
        {
            //if we are not in vr, we simulate it using a keyboard
            const speed = 0.02;
            if(this.keys["w"] === 1) this.mesh.position.x -= speed;
            if(this.keys["s"] === 1) this.mesh.position.x += speed;
            if(this.keys["a"] === 1) this.mesh.position.z -= speed;
            if(this.keys["d"] === 1) this.mesh.position.z += speed;
            if(this.keys[" "] === 1) this.squeeze = true; else this.squeeze = false;
            if(this.keys["q"] === 1) {
                this.tmpRotation.y -= speed;
                Quaternion.FromEulerVectorToRef(this.tmpRotation, this.mesh.rotationQuaternion);
            }
            if(this.keys["e"] === 1) {
                this.tmpRotation.y += speed;
                Quaternion.FromEulerVectorToRef(this.tmpRotation, this.mesh.rotationQuaternion);
            }
        } else {
            //if we are lazy, move the paddle automatically
            const speed = 0.5;
            this.mesh.position = new Vector3(
                0.7*Math.sin(speed*this.renderCounter/this.randomX),
                0, 
                0.7*Math.sin(speed*this.renderCounter/this.randomY)
            );
            Quaternion.FromEulerVectorToRef(new Vector3(Math.sin(this.renderCounter/20),0,0), this.mesh.rotationQuaternion);
            this.renderCounter += 1;

            if(this.keys[" "] === 1) this.squeeze = true; else this.squeeze = false;
        }
        
        
    }

    
}