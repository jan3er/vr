import { Vector3 } from "@babylonjs/core/Maths/math";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { PhysicsImpostor } from "@babylonjs/core/Physics/physicsImpostor";
import { Game } from "./game";

import { NetworkObject } from "./object";
import { NetworkController } from "./controller";
import { Serializable } from "./serialize";
import { Factory } from "./factory";


export class World extends Serializable{
    
    //it's important that the id of the player matches the index in this array
    players:  NetworkController[];
    objects:  NetworkObject[];
    //children: Serializable[];
    game:     Game;
    
    static readonly NUM_BOXES = 5;

    constructor(game: Game){
        super();
        this.game = game;
        
        World.MakeGround(this.game.scene);

        //two players
        //if we want two controlllers per player just add them with the same id?
        this.players = [
            new NetworkController(0,this.game), 
            new NetworkController(1,this.game),
            new NetworkController(2,this.game), 
            new NetworkController(3,this.game)
        ];
        this.players[0].isLocal = true;
        this.players[1].isLocal = true;
        this.players[2].isLocal = false;
        this.players[3].isLocal = false;

        //a bunch of network objects
        this.objects = [];
        //for(let i = 0; i < World.NUM_BOXES; i++){
            //const box = Factory.Box(this, this.game);
            //box.mesh.position.y = 0.1+0.2*i;
            ////sphere.mesh.position.y = 1+2*i;
            //this.objects.push(box);
        //}

        //for(let i = 0; i < 1; i++){
            //const ball = Factory.TennisBall(this, this.game);
            //ball.mesh.physicsImpostor.setLinearVelocity(new Vector3(0,-100,0));
            //this.objects.push(ball);
        //}
        this.objects.push(Factory.Box(this, this.game));
        this.objects.push(Factory.Box(this, this.game));
        this.objects.push(Factory.TennisBall(this, this.game));
        //this.objects.push(Factory.TennisBall(this, this.game));
        //this.objects.push(Factory.TennisBall(this, this.game));
        //this.objects.push(Factory.SoccerBall(this, this.game));
        //this.objects.push(Factory.SoccerBall(this, this.game));
        this.objects.push(Factory.SoccerBall(this, this.game));
        this.objects.push(Factory.Paddle(this, this.game));
        this.objects.push(Factory.Bat(this, this.game));

        //make sure the authority is updated on collision
        NetworkObject.RegisterCollisionCallbacks(this.players, this.objects);

        //in the end put everything that should be send in the children array
        //this.children = (<Serializable[]>this.players).concat(<Serializable[]>this.objects);

        
        this.finalize(this.game.serializer);
    }
    
    stepAfterPhysics(){
        for(let c of this.players){
            c.stepAfterPhysics();
        }
        for(let c of this.objects){
            c.stepAfterPhysics();
        }

        for(let o1 of this.objects){
            o1.sendTogetherWith = [];
            for(let o2 of this.objects){
                if (o1.mesh.intersectsMesh(o2.mesh)){
                    o1.sendTogetherWith.push(o2);
                }
            }
        }
    }
    stepBeforeRender(delta){
        for(let c of this.players){
            c.stepBeforeRender(delta);
        }
        for(let c of this.objects){
            c.stepBeforeRender(delta);
        }
    }
    
    ///////////////////////////////////////////////////
    
    static MakeGround(scene) : Mesh[] {
        const LENGTH = 1.5; //diameter of the area
        const WIDTH = 1.5; //diameter of the area
        const HEIGHT = 0.5;  //height of the walls
        const BORDER_WIDTH = 0.1;  //height of the walls
        const RESTITUTION = 0.9;
        const FRICTION = 0.8;

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
                {
                    mass: 0, 
                    restitution: RESTITUTION, 
                    friction: FRICTION,
                    disableBidirectionalTransformation: true,
                });
            wall.checkCollisions = true;
            walls.push(wall);
        });
        return walls;
    }
}




