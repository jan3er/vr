import { KeyboardEventTypes } from "@babylonjs/core/Events/keyboardEvents";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Vector3 } from "@babylonjs/core/Maths/math";
import { SphereBuilder } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { PhysicsImpostor } from "@babylonjs/core/Physics/physicsImpostor";
import { Scene } from "@babylonjs/core/scene";
import { NetworkObject } from "./object";
import { NetworkPlayer } from "./player";

import { Serializable } from "./serialize";

export class World extends Serializable{
    scene:   Scene;
    player1: NetworkPlayer;
    player2: NetworkPlayer;
    sphere:  NetworkObject;

    arenaLength = 2; //diameter of the area
    arenaWidth = 2; //diameter of the area
    arenaHeight = 0.5;  //height of the walls
    borderWidth = 0.1;  //height of the walls
    restitutionGround = 0.9;
    friction = 0.01;

    constructor(scene: Scene){
        super();
        this.player1 = new NetworkPlayer(scene);
        this.player2 = new NetworkPlayer(scene);
        this.sphere = NetworkObject.MakeSphere([this.player1, this.player2], scene);
        this.children = [this.player1, this.player2, this.sphere];
        this.initGround();
    }

    initGround() : Array<Mesh> {
        var walls = [];
    
        //coordinates of our 5 walls. First entry is width,height,depth. second is x,y,z
        [
            [new Vector3(this.arenaLength,this.borderWidth,this.arenaWidth),  new Vector3(0,-this.borderWidth/2,0)],
            [new Vector3(this.arenaLength,this.arenaHeight,this.borderWidth), new Vector3(0,this.arenaHeight/2,this.arenaWidth/2 -this.borderWidth/2)],
            [new Vector3(this.arenaLength,this.arenaHeight,this.borderWidth), new Vector3(0,this.arenaHeight/2,-this.arenaWidth/2 +this.borderWidth/2)],
            [new Vector3(this.borderWidth,this.arenaHeight,this.arenaWidth),  new Vector3(this.arenaLength/2 -this.borderWidth/2,this.arenaHeight/2,0)],
            [new Vector3(this.borderWidth,this.arenaHeight,this.arenaWidth),  new Vector3(-this.arenaLength/2 +this.borderWidth/2,this.arenaHeight/2,0)],
        ].forEach(coord => {
            const wall = MeshBuilder.CreateBox("", {
                width : coord[0].x, height : coord[0].y, depth : coord[0].z
            }, this.scene);
            wall.position = coord[1];
            wall.physicsImpostor = new PhysicsImpostor(wall, PhysicsImpostor.BoxImpostor, { mass: 0, restitution: this.restitutionGround, friction: this.friction});
            walls.push(wall);
        });
        return walls;
    }
}




