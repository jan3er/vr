import { Mesh, SphereBuilder, Vector3, PhysicsImpostor, StandardMaterial, Color3, KeyboardEventTypes, Quaternion, WebXRInputSource } from "@babylonjs/core";
import { Game } from "./game";
import { NetworkObject } from "./object";
import { Serializable } from "./serialize";

export class NetworkController extends Serializable{
    mesh: Mesh;
    game: Game;
    isLocal = true;
    id: number;
    
    //only set if we are in vr
    vrInput: WebXRInputSource | null = null;
    
    //for grabbing stuff
    squeeze: boolean;
    
    //not null whenever an object is grabbed
    grab: NetworkObject = null;

    //for computing velocity
    previousPosition = Vector3.Zero();
    previousRotationQuaternion = Quaternion.Identity();
    
    //for keyboard input handling
    keyboardPosition = new Vector3(1,0,1);
    keyboardRotation = new Vector3();
    keys;

    //tells us whether we want to move using the keyboard or the paddle should move by itself
    autoMovement = false;


    //for auto movement
    renderCounter = 0;
    randomX = 10 + Math.random() * 10;
    randomY = 10 + Math.random() * 10;

    static readonly SIZE = 0.2;
    static readonly RESTITUTION = 0.2;
    static readonly FRICTION = 0.5;
    static readonly MASS = 1;

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
        this.mesh.position = new Vector3(-2.3,0,-2.3);
        this.mesh.physicsImpostor = new PhysicsImpostor(
            this.mesh, 
            PhysicsImpostor.SphereImpostor, 
            {
                mass: NetworkController.MASS, 
                restitution: NetworkController.RESTITUTION,
                friction: NetworkController.FRICTION,
                //ignoreParent: true
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
                if(e.type == KeyboardEventTypes.KEYDOWN && e.event.key == "Enter"){
                    this.autoMovement = !this.autoMovement;
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
        return this.vrInput !== null && this.vrInput.motionController !== undefined;
    }
    
    //stepBeforeRender(delta){
        ////TODO: put it in the controller and see when it breaks down?!

        //this.game.logger.log("pos", this.mesh.position);
        ////this.mesh.position = this.mesh.position;
        //const speed2 = 0.5;
        //this.mesh.position = new Vector3(
            //0.7*Math.sin(speed2*this.renderCounter/20),
            //0, 
            //0.7*Math.sin(speed2*this.renderCounter/30)
        //);
        //this.renderCounter += 1;
        
        //var rotationQuaternion = Quaternion.Identity();
        //var position = Vector3.Zero();

        ////if(this.previousPosition !== undefined && this.previousRotationQuaternion !== undefined){
            //this.mesh.computeWorldMatrix(true);
            //this.mesh.getWorldMatrix().decompose(Vector3.Zero(), rotationQuaternion, position);
            //const diffrot = rotationQuaternion.multiply(Quaternion.Inverse(this.previousRotationQuaternion)).toEulerAngles();
            //const vel = position.subtract(this.previousPosition).scale(1000/delta);
            //this.game.logger.log("--vel", vel);
            ////this.mesh.physicsImpostor.setLinearVelocity(new Vector3(0.4,0,0.6));
            ////this.mesh.physicsImpostor.setLinearVelocity(new Vector3(vel.x,vel.y,vel.z));
            ////this.mesh.physicsImpostor.setAngularVelocity(new Vector3(0,0,0));
            
            //if(vel.length() <= 1){
                //this.mesh.physicsImpostor.setAngularVelocity(diffrot.scale(1000/delta));
                //this.mesh.physicsImpostor.setLinearVelocity(position.subtract(this.previousPosition).scale(1000/delta));
            //}

        ////}
        //this.previousRotationQuaternion.copyFrom(rotationQuaternion);
        //this.previousPosition.copyFrom(position);
    //}
    
    stepBeforeRender(delta){
        
        //color
        if(this.isLocal){
            (<StandardMaterial>this.mesh.material).diffuseColor = new Color3(1,0,0);
        } else {
            (<StandardMaterial>this.mesh.material).diffuseColor = new Color3(0.9,0.9,0.9);
        }
        
        //only give input to local player
        if(!this.isLocal) return;

        //set position based on the three different input modes: vr, keyboard and auto
        //if in vr, get input
        if(this.isInVR()){
            this.mesh.position.copyFrom(this.vrInput.grip.position);
            this.mesh.rotationQuaternion.copyFrom(this.vrInput.grip.rotationQuaternion);
            this.squeeze = this.vrInput.motionController.getComponentOfType("trigger").pressed;
        }
        //if we are not in vr, we use a keyboard
        else if(!this.autoMovement)
        {
            const speed = 0.03;
            if(this.keys["w"] === 1) this.keyboardPosition.x -= speed;
            if(this.keys["s"] === 1) this.keyboardPosition.x += speed;
            if(this.keys["a"] === 1) this.keyboardPosition.z -= speed;
            if(this.keys["d"] === 1) this.keyboardPosition.z += speed;
            if(this.keys["q"] === 1) this.keyboardRotation.y -= 10*speed;
            if(this.keys["e"] === 1) this.keyboardRotation.y += 10*speed;
            this.squeeze = this.keys[" "] === 1;
            Quaternion.FromEulerVectorToRef(this.keyboardRotation, this.mesh.rotationQuaternion);
            this.mesh.position.copyFrom(this.keyboardPosition);
        }
        //if we are lazy, move the controller automatically
        else {
            const speed = 0.5;
            this.mesh.position = new Vector3(
                0.7*Math.sin(speed*this.renderCounter/this.randomX),
                0, 
                0.7*Math.sin(speed*this.renderCounter/this.randomY)
            );
            Quaternion.FromEulerVectorToRef(new Vector3(Math.sin(this.renderCounter/20),0,0), this.mesh.rotationQuaternion);
            this.squeeze = this.keys[" "] === 1;
        }
        this.renderCounter += 1;
    
        //compute linear and angular velocity
        var rotationQuaternion = Quaternion.Identity();
        var position = Vector3.Zero();

        this.mesh.computeWorldMatrix(true);
        this.mesh.getWorldMatrix().decompose(Vector3.Zero(), rotationQuaternion, position);
        const diffrot = rotationQuaternion.multiply(Quaternion.Inverse(this.previousRotationQuaternion)).toEulerAngles();
        
        //only update velocity if no jumps happened, TODO: refine it a bit
        if(position.subtract(this.previousPosition).length() <= 0.1){
            this.mesh.physicsImpostor.setAngularVelocity(diffrot.scale(1000/delta));
            this.mesh.physicsImpostor.setLinearVelocity(position.subtract(this.previousPosition).scale(1000/delta));
        }

        this.previousRotationQuaternion.copyFrom(rotationQuaternion);
        this.previousPosition.copyFrom(position);
        
        const l = this.mesh.physicsImpostor.getLinearVelocity()
        const a = this.mesh.physicsImpostor.getAngularVelocity()
        this.game.logger.log("-linvel", [l.x,l.y,l.z] );
        this.game.logger.log("-angvel", [a.x,a.y,a.z] );
        
        //grab and release objects
        for(let object of this.game.world.objects){
            if(
                this.squeeze && 
                this.mesh.intersectsMesh(object.mesh) && 
                this.grab === null && 
                !object.isGrabbed()
            ){
                object.grab(this);
                this.grab = object;
            }
            if(
                !this.squeeze && 
                this.grab === object
            ){
                object.release();
                this.grab = null;
            }
        }
    }
}