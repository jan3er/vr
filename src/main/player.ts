import { Mesh, Scene, SphereBuilder, Vector3, PhysicsImpostor, StandardMaterial, Color3, KeyboardEventTypes, Quaternion, WebXRInputSource } from "@babylonjs/core";
import { Game } from "./game";
import { Serializable, Serializer } from "./serialize";

export class NetworkController extends Serializable{
    mesh: Mesh;
    game: Game;
    isLocal = true;
    id: number;
    
    //only set if we are in vr
    vrInput: WebXRInputSource | null = null;
    
    //for grabbing stuff
    squeeze: boolean;
    squeezeBefore: boolean;
    
    grab = false;
    
    //for keyboard input handling
    keys;

    //tells us whether we want to move using the keyboard or the paddle should move by itself
    autoMovement = false;

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


    constructor(id: number, game: Game){
        super();
        this.id = id;
        this.game = game;
        this.keys = {};
    
        //the paddle
        this.mesh = SphereBuilder.CreateSphere("",
            { 
                diameterX: NetworkController.SIZE, 
                diameterY: 0.7*NetworkController.SIZE, 
                diameterZ: NetworkController.SIZE, 
                segments: 32 
            },
            this.game.scene
        );
        this.mesh.position = new Vector3(-0.3,0,-0.3);
        this.mesh.physicsImpostor = new PhysicsImpostor(
            this.mesh, 
            PhysicsImpostor.SphereImpostor, 
            {
                mass: 0, 
                restitution: NetworkController.RESTITUTION
            }, 
            this.game.scene
        );
        const material1 = new StandardMaterial("", this.game.scene);
        material1.diffuseColor = new Color3(1, 0, 1);
        this.mesh.material = material1;
        

        this.game.scene.onKeyboardObservable.add((e) => {
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

            }
        });    

        this.finalize(this.game.serializer);
    }
    
    
    isInVR(){
        return this.vrInput !== null&& this.vrInput.motionController !== undefined;
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
        this.game.logger.log("-isvr", this.isInVR());
        if(this.isInVR()){
            this.mesh.position.copyFrom(this.vrInput.grip.position);
            this.mesh.rotationQuaternion.copyFrom(this.vrInput.grip.rotationQuaternion);
            this.squeezeBefore = this.squeeze;
            this.squeeze = this.vrInput.motionController.getComponentOfType("trigger").pressed;
        }
        else if(!this.autoMovement)
        {
            //if we are not in vr, we simulate it using a keyboard
            const speed = 0.02;
            if(this.keys["w"] === 1) this.mesh.position.x -= speed;
            if(this.keys["s"] === 1) this.mesh.position.x += speed;
            if(this.keys["a"] === 1) this.mesh.position.z -= speed;
            if(this.keys["d"] === 1) this.mesh.position.z += speed;
            this.squeezeBefore = this.squeeze;
            this.squeeze       = this.keys[" "] === 1;
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

            this.squeezeBefore = this.squeeze;
            this.squeeze       = this.keys[" "] === 1;
        }
        
        this.game.logger.log("-squeeze", this.squeeze);
        
        if(this.squeeze && this.squeezeBefore != this.squeeze){
            if(!this.grab){
                //grab
                this.game.world.objects[0].grab(this);
                this.grab = true;
            } else {
                this.game.world.objects[0].release(this);
                this.grab = false;
            }
        }
    }

    
}