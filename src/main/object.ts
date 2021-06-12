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
    
    //for computing velocity
    previousPosition = Vector3.Zero();
    previousRotationQuaternion = Quaternion.Identity();
    
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

    stepBeforeRender(delta){
    //stepAfterPhysics(){
        if(this.hasAuthority()){
            this.priority++;
        } else {
            this.priority = -1;
        }
        this.game.world.game.logger.log("priority", this.priority);

        this.game.world.game.logger.log("authLocal ", this.localAuthority);
        this.game.world.game.logger.log("authRemote", this.remoteAuthority);
    
        //distinguish between grabbed and not grabbed
        if(this.grabber !== null){
            
            //snap position and rotation to where it should be
            this.mesh.position.copyFrom(this.relativeGrabPosition);
            this.mesh.rotationQuaternion.copyFrom(this.relativeGrabRotationQuaternion);
            
            //compute linear and angular velocity
            var rotationQuaternion = Quaternion.Identity();
            var position = Vector3.Zero();
            this.mesh.computeWorldMatrix(true);
            this.mesh.getWorldMatrix().decompose(Vector3.Zero(), rotationQuaternion, position);
            const diffrot = rotationQuaternion.multiply(Quaternion.Inverse(this.previousRotationQuaternion)).toEulerAngles();
            this.mesh.physicsImpostor.setAngularVelocity(diffrot.scale(1000/delta));
            this.mesh.physicsImpostor.setLinearVelocity(position.subtract(this.previousPosition).scale(1000/delta));
            this.previousRotationQuaternion.copyFrom(rotationQuaternion);
            this.previousPosition.copyFrom(position);
        } else {
            this.previousRotationQuaternion.copyFrom(this.mesh.rotationQuaternion);
            this.previousPosition.copyFrom(this.mesh.position);
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
        this.grabber = player;
        this.takeAuthority();
        this.mesh.setParent(player.mesh);
        this.relativeGrabPosition.copyFrom(this.mesh.position);
        this.relativeGrabRotationQuaternion.copyFrom(this.mesh.rotationQuaternion);
    }
    release(){
        this.grabber = null;
        this.mesh.setParent(null);
    }
    isGrabbed(){
        return this.grabber !== null;
    }
}