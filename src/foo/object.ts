import { MeshBuilder, Vector3, StandardMaterial, Color3 } from "@babylonjs/core";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { PhysicsImpostor } from "@babylonjs/core/Physics/physicsImpostor";
import { Scene } from "@babylonjs/core/scene";
import { NetworkPlayer } from "./player";
import { Serializable } from "./serialize";

export class NetworkObject extends Serializable {
    localAuthority = 1;
    remoteAuthority = 0;
    acceptIncoming: boolean;
    mesh: Mesh;

    constructor(mesh: Mesh, players: NetworkPlayer[]){
        super();
        this.mesh = mesh;
        
        //TODO: also handle collisions with other network objects
        //do we need some static handler for this, where we register the objects?
        players.forEach(player => {
            this.mesh.physicsImpostor.registerOnPhysicsCollide(player.mesh.physicsImpostor, (main, collided) => {
                if(player.isLocal) {
                    this.localAuthority = this.remoteAuthority + 1;
                }
            });
        });
    }

    //todo: write a function that gets called once per frame and make sure it gets called
    //here we can set the color based on who controls this
    update(){

    }

    shouldSend(){
        return this.localAuthority > this.remoteAuthority;
    }
    serialize(){
        this.writeUint8(this.localAuthority);
        this.writeVector3(this.mesh.position);
        this.writeQuaternion(this.mesh.rotationQuaternion);
        this.writeVector3(this.mesh.physicsImpostor.getLinearVelocity());
        this.writeVector3(this.mesh.physicsImpostor.getAngularVelocity());
    }
    deserialize(){
        this.remoteAuthority = this.readUint8();
        if(this.remoteAuthority >= this.localAuthority){
            this.mesh.position = this.readVector3();
            this.mesh.rotationQuaternion.copyFrom(this.readQuaternion());
            this.mesh.physicsImpostor.setLinearVelocity(this.readVector3());
            this.mesh.physicsImpostor.setAngularVelocity(this.readVector3());
        }  
    }

    static MakeSphere(players: NetworkPlayer[], scene: Scene){
        const SIZE = 0.2;
        const MASS = 2;
        const RESTITUTION = 0.9;
        const FRICTION = 0.01;

        const mesh = MeshBuilder.CreateBox("", {
            width  : SIZE,
            height : SIZE,
            depth  : SIZE,
        }, scene);
        mesh.physicsImpostor = new PhysicsImpostor(mesh, PhysicsImpostor.BoxImpostor, 
            { 
                mass:        MASS, 
                restitution: RESTITUTION, 
                friction:    FRICTION
            }, scene);
        mesh.position.set(0,2,0);

        mesh.physicsImpostor.setLinearVelocity(new Vector3(0,3,0));

        const material = new StandardMaterial("", scene);
        material.diffuseColor = new Color3(1, 0, 1);
        mesh.material = material;
        return new NetworkObject(mesh, players);
    }

}

// export class Sphere extends NetworkObject{
//     mesh: Mesh;
//     scene: Scene;

//     static readonly SIZE = 0.2;
//     static readonly MASS = 2;
//     static readonly RESTITUTION = 0.9;
//     static readonly FRICTION = 0.01;

//     constructor(players: NetworkPlayer[], scene: Scene){
//         super(players);
//         this.scene = scene;
//         this.mesh = MeshBuilder.CreateBox("", {
//             width  : Sphere.SIZE,
//             height : Sphere.SIZE,
//             depth  : Sphere.SIZE,
//         }, this.scene);
//         this.mesh.physicsImpostor = new PhysicsImpostor(this.mesh, PhysicsImpostor.BoxImpostor, 
//             { 
//                 mass:        Sphere.MASS, 
//                 restitution: Sphere.RESTITUTION, 
//                 friction:    Sphere.FRICTION
//             }, this.scene);
//         this.mesh.position.set(0,2,0);

//         this.mesh.physicsImpostor.setLinearVelocity(new Vector3(0,3,0));

//         const material = new StandardMaterial("", this.scene);
//         material.diffuseColor = new Color3(1, 0, 1);
//         this.mesh.material = material;

//         players.forEach(player => {
//             this.mesh.physicsImpostor.registerOnPhysicsCollide(player.mesh.physicsImpostor, (main, collided) => {
//                 if(player.isLocal) {
//                     this.localAuthority = this.remoteAuthority + 1;
//                 }
//             });
//         });
//     }

//     serialize() {
//         super.serialize();
//         this.writeVector3(this.mesh.position);
//         this.writeQuaternion(this.mesh.rotationQuaternion);
//         this.writeVector3(this.mesh.physicsImpostor.getLinearVelocity());
//         this.writeVector3(this.mesh.physicsImpostor.getAngularVelocity());
//     }
//     deserialize() {
//         super.deserialize();
//         if(this.acceptIncoming){
//             this.mesh.position = this.readVector3();
//             this.mesh.rotationQuaternion.copyFrom(this.readQuaternion());
//             this.mesh.physicsImpostor.setLinearVelocity(this.readVector3());
//             this.mesh.physicsImpostor.setAngularVelocity(this.readVector3());
//         }  
//     }
// }

