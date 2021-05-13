import { MeshBuilder, Vector3, StandardMaterial, Color3, Quaternion } from "@babylonjs/core";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { PhysicsImpostor } from "@babylonjs/core/Physics/physicsImpostor";
import { Scene } from "@babylonjs/core/scene";
import { NetworkController } from "./player";
import { Serializable } from "./serialize";
import { World } from "./world";

export class NetworkObject extends Serializable {

    //only accept incoming changes from outside if the remote authority is at least as large as the local one
    localAuthority = Math.floor(Math.random()*100);
    remoteAuthority = 0;

    world: World;
    players: NetworkController[] = [];

    //null or a pointer to a NetworkPlayer who currently grabs the object
    grabber: NetworkController | null = null;

    //when we grab an object the relative position/rotation to the hand does not change. store it here
    relativeGrabPosition: Vector3 = new Vector3();
    relativeGrabRotationQuaternion: Quaternion = new Quaternion();
    
    //the mesh with all its physics property, will probably be set by some static constructor method
    mesh: Mesh;

    constructor(mesh: Mesh, world: World){
        super();
        this.world = world;
        this.mesh = mesh;

        this.world.players.forEach(player => {
            this.players[player.id] = player;
        });
    }

    //connect all the players and objects by setting collision callbacks between them
    static RegisterCollisionCallbacks(players: NetworkController[], objects: NetworkObject[]){
        players.forEach(player => {
            objects.forEach(object => {
                object.mesh.physicsImpostor.registerOnPhysicsCollide(player.mesh.physicsImpostor, (main, collided) => {
                    if(player.isLocal && object.grabber === null) {
                        object.localAuthority = object.remoteAuthority + 1;
                        console.log("bang!");
                    }
                });
            });
        });
    };

    //todo: write a function that gets called once per frame and make sure it gets called
    //here we can set the color based on who controls this
    update(){
        this.world.texts[0].text = "" + this.remoteAuthority;
        this.world.texts[1].text = "" + this.localAuthority;
        
        //this.world.texts[10].text = "" + this.mesh.position;
        //this.world.texts[11].text = "" + this.mesh.rotationQuaternion;
        //this.world.texts[12].text = "" + this.relativeGrabPosition;
        //this.world.texts[13].text = "" + this.relativeGrabRotationQuaternion;
    
        if(this.grabber !== null){
            const v = this.relativeGrabPosition;
            this.mesh.position.set(v.x, v.y, v.z)
            const q = this.relativeGrabRotationQuaternion
            this.mesh.rotationQuaternion.set(q.x,q.y,q.z,q.w);
            this.mesh.physicsImpostor.mass = 0;
        } else {
            this.mesh.physicsImpostor.mass = 1;
        }
            

        if(this.localAuthority >= this.remoteAuthority){
            (<StandardMaterial>this.mesh.material).diffuseColor = new Color3(1,0,0);
        } else {
            (<StandardMaterial>this.mesh.material).diffuseColor = new Color3(0.9,0.9,0.9);
        }
        
        if(this.mesh.position.y <= -2){
            this.mesh.position.set(0,2,0);
            this.mesh.physicsImpostor.setLinearVelocity(new Vector3(0,0,0));
            this.mesh.physicsImpostor.setAngularVelocity(new Vector3(0,0,0));
        }

    }

    //grab an object. this method can only be called by the local player
    //for the remote player, the grabbing state is changed via deserialization
    grab(player: NetworkController){
        if(this.grabber === null && player.isLocal){
            this.grabber = player;
            this.localAuthority = this.remoteAuthority + 1;
            this.mesh.setParent(player.mesh);
            this.relativeGrabPosition = this.mesh.position;
            this.relativeGrabRotationQuaternion.copyFrom(this.mesh.rotationQuaternion);
            //todos:
            //maybe set physics mass to zero?
            
        }
        console.log("grab!");
    }
    release(player: NetworkController){
        if(this.grabber === player){
            this.grabber = null;
            this.mesh.setParent(null);
            //todos:
            //compute velocity
            this.mesh.physicsImpostor.setLinearVelocity(new Vector3(0,0,0));
            this.mesh.physicsImpostor.setAngularVelocity(new Vector3(0,0,0));
        }
        console.log("relsease!");
    }

    shouldSend(){
        return this.localAuthority >= this.remoteAuthority;
    }
    serialize(){
        this.writeUint8(this.localAuthority);
        var sendId = this.grabber === null ? 123 : this.grabber.id;
        this.writeUint8(sendId);
        this.world.texts[2].text = "send: " + sendId;
        if(this.grabber === null){
            this.writeVector3(this.mesh.position);
            this.writeQuaternion(this.mesh.rotationQuaternion);
            this.writeVector3(this.mesh.physicsImpostor.getLinearVelocity());
            this.writeVector3(this.mesh.physicsImpostor.getAngularVelocity());
        } else {
            this.writeVector3(this.relativeGrabPosition);
            this.writeQuaternion(this.relativeGrabRotationQuaternion);
            this.writeVector3(this.mesh.physicsImpostor.getLinearVelocity());
            this.writeVector3(this.mesh.physicsImpostor.getAngularVelocity());
        }
    }
    deserialize(){
        this.remoteAuthority = this.readUint8();
        if(this.remoteAuthority >= this.localAuthority){
            const id = this.readUint8();
            var getGrabber = id === 123 ? null : this.players[id];
            
            if(this.grabber !== getGrabber){
                if(getGrabber === null) this.mesh.setParent(null);
                if(getGrabber !== null) this.mesh.setParent(getGrabber.mesh);
                this.grabber = getGrabber;
            }

            if(this.grabber === null){
                this.mesh.position = this.readVector3();
                this.mesh.rotationQuaternion.copyFrom(this.readQuaternion());
                this.mesh.physicsImpostor.setLinearVelocity(this.readVector3());
                this.mesh.physicsImpostor.setAngularVelocity(this.readVector3());
            } else {
                this.relativeGrabPosition = this.readVector3();
                this.relativeGrabRotationQuaternion.copyFrom(this.readQuaternion());
                this.mesh.physicsImpostor.setLinearVelocity(this.readVector3());
                this.mesh.physicsImpostor.setAngularVelocity(this.readVector3());
            }
        }  
    }

    static MakeSphere(world: World, scene: Scene){
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
        return new NetworkObject(mesh, world);
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

