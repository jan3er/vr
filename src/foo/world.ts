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
    players: NetworkPlayer[];
    objects: NetworkObject[];

    constructor(scene: Scene){
        super();

        //two players
        this.players = [new NetworkPlayer(scene), new NetworkPlayer(scene)];

        //a bunch of network objects
        this.objects = [];
        for(let i = 0; i < 2; i++){
            const sphere = NetworkObject.MakeSphere(this.players, scene);
            sphere.mesh.position.x = i/2;
            this.objects.push(sphere);
        }

        //make sure the authority is updated on collision
        NetworkObject.RegisterCollisionCallbacks(this.players, this.objects);

        //in the end put everything that should be send in the children array
        this.children = (<Serializable[]>this.players).concat(<Serializable[]>this.objects);

        World.MakeGround(scene);
    }

    static MakeGround(scene) : Array<Mesh> {
        const LENGTH = 2; //diameter of the area
        const WIDTH = 2; //diameter of the area
        const HEIGHT = 0.5;  //height of the walls
        const BORDER_WIDTH = 0.1;  //height of the walls
        const RESTITUTION = 0.9;
        const FRICTION = 0.01;

        var walls = [];
    
        //coordinates of our 5 walls. First entry is width,height,depth. second is x,y,z
        [
            [new Vector3(LENGTH,BORDER_WIDTH,WIDTH),  new Vector3(0,-BORDER_WIDTH/2,0)],
            [new Vector3(LENGTH,HEIGHT,BORDER_WIDTH), new Vector3(0,HEIGHT/2,WIDTH/2 -BORDER_WIDTH/2)],
            [new Vector3(LENGTH,HEIGHT,BORDER_WIDTH), new Vector3(0,HEIGHT/2,-WIDTH/2 +BORDER_WIDTH/2)],
            [new Vector3(BORDER_WIDTH,HEIGHT,WIDTH),  new Vector3(LENGTH/2 -BORDER_WIDTH/2,HEIGHT/2,0)],
            [new Vector3(BORDER_WIDTH,HEIGHT,WIDTH),  new Vector3(-LENGTH/2 +BORDER_WIDTH/2,HEIGHT/2,0)],
        ].forEach(coord => {
            const wall = MeshBuilder.CreateBox("", {
                width : coord[0].x, height : coord[0].y, depth : coord[0].z
            }, scene);
            wall.position = coord[1];
            wall.physicsImpostor = new PhysicsImpostor(wall, PhysicsImpostor.BoxImpostor, 
                { mass: 0, restitution: RESTITUTION, friction: FRICTION});
            walls.push(wall);
        });
        return walls;
    }
}




