import { Mesh, Scene, SphereBuilder, Vector3, PhysicsImpostor, StandardMaterial, Color3, KeyboardEventTypes } from "@babylonjs/core";
import { Serializable } from "./serialize";

export class NetworkPlayer extends Serializable{
    mesh: Mesh;
    scene: Scene;
    isLocal = true;

    static readonly SIZE = 0.2;
    static readonly RESTITUTION = 0.9;

            
    shouldBeOverwritten() { return !this.isLocal };
    shouldSend() { return this.isLocal };

    serialize() {
        this.writeVector3(this.mesh.position);
        this.writeQuaternion(this.mesh.rotationQuaternion);
    }
    deserialize() {
        this.mesh.position = this.readVector3();
        this.mesh.rotationQuaternion.copyFrom(this.readQuaternion());   
    }

    constructor(scene: Scene){
        super();
        this.scene = scene;
    
        //the paddle
        this.mesh = SphereBuilder.CreateSphere("",
            { 
                diameterX: NetworkPlayer.SIZE, 
                diameterY: 0.7*NetworkPlayer.SIZE, 
                diameterZ: NetworkPlayer.SIZE, 
                segments: 32 
            },
            this.scene
        );
        this.mesh.position = new Vector3(-0.3,0,-0.3);
        this.mesh.physicsImpostor = new PhysicsImpostor(
            this.mesh, 
            PhysicsImpostor.SphereImpostor, 
            {
                mass: 0, 
                restitution: NetworkPlayer.RESTITUTION
            }, 
            this.scene
        );
        const material1 = new StandardMaterial("", this.scene);
        material1.diffuseColor = new Color3(1, 0, 1);
        this.mesh.material = material1;
        

        this.scene.onKeyboardObservable.add((e) => {
            if(this.isLocal){
                if(e.type == KeyboardEventTypes.KEYDOWN && e.event.key == "w") this.mesh.position.x -= 0.1;
                if(e.type == KeyboardEventTypes.KEYDOWN && e.event.key == "s") this.mesh.position.x += 0.1;
                if(e.type == KeyboardEventTypes.KEYDOWN && e.event.key == "a") this.mesh.position.z -= 0.1;
                if(e.type == KeyboardEventTypes.KEYDOWN && e.event.key == "d") this.mesh.position.z += 0.1;

            }
        });

    }
}