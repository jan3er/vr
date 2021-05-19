import { MeshBuilder, Vector3, StandardMaterial, Color3, Quaternion } from "@babylonjs/core";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { PhysicsImpostor } from "@babylonjs/core/Physics/physicsImpostor";
import { Scene } from "@babylonjs/core/scene";
import { Game } from "./game";
import { NetworkController } from "./controller";
import { Serializable, Serializer } from "./serialize";
import { World } from "./world";

export class NetworkObject extends Serializable {

    //only accept incoming changes from outside if the remote authority is at least as large as the local one
    localAuthority = Math.floor(Math.random()*100);
    remoteAuthority = 1;
    
    priority = 0;

    //null or a pointer to a NetworkPlayer who currently grabs the object
    grabber: NetworkController | null = null;

    //when we grab an object the relative position/rotation to the hand does not change. store it here
    relativeGrabPosition: Vector3 = new Vector3();
    relativeGrabRotationQuaternion: Quaternion = new Quaternion();
    
    //the mesh with all its physics property, will probably be set by some static constructor method
    mesh: Mesh;
    
    static counter = 0;
    id: number;
    
    game: Game;

    constructor(mesh: Mesh, game: Game){
        super();
        this.mesh = mesh;
        this.game = game;
        
        console.log(game);

        this.id = NetworkObject.counter++;
        
        this.finalize(this.game.serializer);
    }

    //connect all the players and objects by setting collision callbacks between them
    static RegisterCollisionCallbacks(players: NetworkController[], objects: NetworkObject[]){
        for(let player of players){
            for(let object of objects){
                object.mesh.physicsImpostor.registerOnPhysicsCollide(player.mesh.physicsImpostor, (main, collided) => {
                    if(player.isLocal && object.grabber === null) {
                        object.takeAuthority();
                        console.log("bang!");
                    }
                });
            }
        }
        for(let o1 of objects){
            for(let o2 of objects){
                o1.mesh.physicsImpostor.registerOnPhysicsCollide(o2.mesh.physicsImpostor, (main, collided) => {
                    o1.distributeAuthorityOnCollision(o2);
                });
            }
        }
    };
    
    distributeAuthorityOnCollision(other: NetworkObject){
        const myForce = this.mesh.physicsImpostor.getLinearVelocity().length() * this.mesh.physicsImpostor.mass;
        const yourForce = other.mesh.physicsImpostor.getLinearVelocity().length() * other.mesh.physicsImpostor.mass;
        this.game.world.game.logger.log("difference", Math.abs(yourForce-myForce));
        //const myForce = this.id;
        //const yourForce = other.id;
        if(this.hasAuthority() && myForce >= yourForce && other.grabber === null){
            other.takeAuthority();
        } 
    }
    takeAuthority(){
        this.localAuthority = (this.remoteAuthority + 1) % 200;
        this.priority = Math.max(this.priority,10);
    }
    hasAuthority(){
        var local = this.localAuthority;
        var remote = this.remoteAuthority;
        if(remote < local - 100){
            remote += 200;
        } else  if(local < remote - 100) {
            local += 200;
        }
        return local >= remote;
    }

    getPriority(){
        return this.priority;
    }

    update(){
        if(this.hasAuthority()){
            this.priority++;
        } else {
            this.priority = -1;
        }
        this.game.world.game.logger.log("priority", this.priority);

        this.game.world.game.logger.log("authLocal ", this.localAuthority);
        this.game.world.game.logger.log("authRemote", this.remoteAuthority);
    
        if(this.grabber !== null){
            this.mesh.position.copyFrom(this.relativeGrabPosition);
            this.mesh.rotationQuaternion.copyFrom(this.relativeGrabRotationQuaternion);
            //this.mesh.physicsImpostor.mass = 0;
            this.mesh.physicsImpostor.setLinearVelocity(new Vector3(0,0,0));
            this.mesh.physicsImpostor.setAngularVelocity(new Vector3(0,0,0));
            //this.game.logger.log("-grabpos", this.relativeGrabPosition.y);
        } else {
            //this.mesh.physicsImpostor.mass = 1;
        }
            

        if(this.hasAuthority()){
            (<StandardMaterial>this.mesh.material).diffuseColor = new Color3(1,0,0);
        } else {
            (<StandardMaterial>this.mesh.material).diffuseColor = new Color3(0.9,0.9,0.9);
        }
        
        if(this.mesh.position.y <= -2){
            this.mesh.position.set(0,2,0);
            this.mesh.physicsImpostor.setLinearVelocity(new Vector3(0,0,0));
            this.mesh.physicsImpostor.setAngularVelocity(new Vector3(0,0,0));
        }
        
        //if(this.id = 2){
            //const a = Serializable.blub;
            //this.game.logger.log("-pos.x", this.mesh.position.x*a);
            //this.game.logger.log("-pos.y", this.mesh.position.y*a);
            //this.game.logger.log("-pos.z", this.mesh.position.z*a);
            //this.game.logger.log("-rot.x", this.mesh.rotationQuaternion.x*a);
            //this.game.logger.log("-rot.y", this.mesh.rotationQuaternion.y*a);
            //this.game.logger.log("-rot.z", this.mesh.rotationQuaternion.z*a);
            //this.game.logger.log("-rot.w", this.mesh.rotationQuaternion.z*a);
            //this.game.logger.log("-linvel.x", this.mesh.physicsImpostor.getLinearVelocity().x*a);
            //this.game.logger.log("-linvel.y", this.mesh.physicsImpostor.getLinearVelocity().y*a);
            //this.game.logger.log("-linvel.z", this.mesh.physicsImpostor.getLinearVelocity().z*a);
            //this.game.logger.log("-angvel.x", this.mesh.physicsImpostor.getAngularVelocity().x*a);
            //this.game.logger.log("-angvel.y", this.mesh.physicsImpostor.getAngularVelocity().y*a);
            //this.game.logger.log("-angvel.z", this.mesh.physicsImpostor.getAngularVelocity().z*a);
        //}

    }
    
    /////////////////////////////////////////////////////////////////////////////////////

    serialize(){
        //this.world.logger.log("-serialize", Math.random());
        this.priority = 0;
        
        //this.world.logger.log("0linvel", this.mesh.physicsImpostor.getLinearVelocity().x);
        //this.world.logger.log("0angvel", this.mesh.physicsImpostor.getAngularVelocity().x);

        //TODO: wrap around logic!
        //otherwise 8 bits is way to little!
        this.writeUint8(this.localAuthority);
        var sendId = this.grabber === null ? 123 : this.grabber.id;
        this.writeUint8(sendId);
        //this.world.logger.log("authSend", this.localAuthority);
        if(this.grabber === null){
            this.writeVector3(this.mesh.position);
            this.writeQuaternion(this.mesh.rotationQuaternion);
        } else {
            this.writeVector3(this.relativeGrabPosition);
            this.writeQuaternion(this.relativeGrabRotationQuaternion);
        }
        this.mesh.physicsImpostor.setLinearVelocity(this.writeVector3(this.mesh.physicsImpostor.getLinearVelocity()));
        this.mesh.physicsImpostor.setAngularVelocity(this.writeVector3(this.mesh.physicsImpostor.getAngularVelocity()));
        //this.writeVector3(this.mesh.physicsImpostor.getLinearVelocity());
        //this.writeVector3(this.mesh.physicsImpostor.getAngularVelocity());
    }
    deserialize(){
        //this.world.logger.log("-deserialize", Math.random());
        this.remoteAuthority = this.readUint8();
        //this.world.logger.log("authincomming", this.remoteAuthority);
        if(!this.hasAuthority()){
            const id = this.readUint8();
            var getGrabber = id === 123 ? null : this.game.world.players[id];
            
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

    //grab an object. this method can only be called by the local player
    //for the remote player, the grabbing state is changed via deserialization
    grab(player: NetworkController){
        if(this.grabber === null && player.isLocal){
            this.grabber = player;
            this.takeAuthority();
            this.mesh.setParent(player.mesh);
            this.relativeGrabPosition.copyFrom(this.mesh.position);
            this.relativeGrabRotationQuaternion.copyFrom(this.mesh.rotationQuaternion);
            //todos:
            //maybe set physics mass to zero?
            return true;
        }
        return false;
    }
    release(player: NetworkController){
        if(this.grabber === player){
            this.mesh.setParent(null);
            //todos:
            //compute velocity
            this.mesh.physicsImpostor.setLinearVelocity(this.grabber.velocity);
            //this.mesh.physicsImpostor.setLinearVelocity(this.grabber.velocity);
            this.mesh.physicsImpostor.setAngularVelocity(new Vector3(0,0,0));
            this.grabber = null;
            return true;
        }
        return false;
    }


    static MakeSphere(world: World, game: Game){
        const SIZE = 0.2;
        const MASS = 2;
        const RESTITUTION = 0.5;
        const FRICTION = 0.1;

        const mesh = MeshBuilder.CreateBox("", {
            width  : SIZE,
            height : SIZE,
            depth  : SIZE,
        }, game.scene);
        mesh.physicsImpostor = new PhysicsImpostor(mesh, PhysicsImpostor.BoxImpostor, 
            { 
                mass:        MASS, 
                //restitution: RESTITUTION, 
                //friction:    FRICTION
            }, game.scene);
        mesh.position.set(0,2,0);
        
        mesh.physicsImpostor.setLinearVelocity(new Vector3(0,3,0));

        const material = new StandardMaterial("", game.scene);
        material.diffuseColor = new Color3(1, 0, 1);
        mesh.material = material;
        return new NetworkObject(mesh, game);
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

