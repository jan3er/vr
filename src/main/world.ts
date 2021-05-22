import { KeyboardEventTypes } from "@babylonjs/core/Events/keyboardEvents";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Vector3 } from "@babylonjs/core/Maths/math";
import { SphereBuilder } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { PhysicsImpostor } from "@babylonjs/core/Physics/physicsImpostor";
import { TextBlock, StackPanel, Control } from "@babylonjs/gui";
import { AdvancedDynamicTexture } from "@babylonjs/gui/2D/advancedDynamicTexture";
import { Game } from "./game";

import { NetworkObject } from "./object";
import { NetworkController } from "./controller";
import { Serializable, Serializer } from "./serialize";

//prints given key, value pairs on the sceen
//sorts them alphabetically by key before printing
export class Logger{
    static readonly MAX_KEYS = 15;
    texts: TextBlock[] = [];
    dict: any = {};
    game: Game;
    constructor(game: Game){
        this.game = game;

        //https://www.babylonjs.com.cn/how_to/gui.html
        var advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI", true, this.game.scene);
        var panel = new StackPanel();   
        
        panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER; 
        //panel.height = 0.7;
        //panel.width = 0.7;
        advancedTexture.addControl(panel);

        for(let i=0; i < Logger.MAX_KEYS; i++){
            var text = new TextBlock();
            text.text = "----------------------------------------------------------------------------------------------";
            text.color = "white";
            text.fontSize = 24;
            text.width = "500px";
            text.height = "30px";
            text.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
            panel.addControl(text);
            //advancedTexture.addControl(text);
            this.texts.push(text);
        }
    }
    
    log(key, value){
        this.dict[key] = value;
        var i = 0;
        for (let key of Object.keys(this.dict).sort()){
            this.texts[i].text = "" + key + ": " + this.dict[key];
            if(++i >= Logger.MAX_KEYS){
                break;
            }
        }
    }
}

export class World extends Serializable{
    
    //it's important that the id of the player matches the index in this array
    players:  NetworkController[];
    objects:  NetworkObject[];
    //children: Serializable[];
    game:     Game;
    

    constructor(game: Game){
        super();
        this.game = game;
        
        World.MakeGround(this.game.scene);

        //two players
        //if we want two controlllers per player just add them with the same id?
        this.players = [new NetworkController(0,this.game), new NetworkController(1,this.game)];
        this.players[0].isLocal = false;
        this.players[1].isLocal = true;

        //a bunch of network objects
        this.objects = [];
        for(let i = 0; i < 4; i++){
            const sphere = NetworkObject.MakeSphere(this, this.game);
            sphere.mesh.position.y = 1+i/4;
            this.objects.push(sphere);
        }

        //make sure the authority is updated on collision
        NetworkObject.RegisterCollisionCallbacks(this.players, this.objects);

        //in the end put everything that should be send in the children array
        //this.children = (<Serializable[]>this.players).concat(<Serializable[]>this.objects);

        
        this.finalize(this.game.serializer);
    }
    
    update(){
        for(let c of this.players){
            c.update();
        }
        for(let c of this.objects){
            c.update();
        }

        for(let o1 of this.objects){
            o1.sendTogetherWith = [];
            for(let o2 of this.objects){
                if (o1.mesh.intersectsMesh(o2.mesh)){
                    o1.sendTogetherWith.push(o2);
                }
                /*const key:string = "-" + o1.id + o2.id;*/
                /*if (o1.mesh.intersectsMesh(o2.mesh)){*/
                    /*this.logger.log(key, 1)*/
                /*} else {*/
                    /*this.logger.log(key, 0)*/
                /*}*/
            }
        }
        
    }
    
    ///////////////////////////////////////////////////
    
    static MakeGround(scene) : Mesh[] {
        const LENGTH = 2; //diameter of the area
        const WIDTH = 2; //diameter of the area
        const HEIGHT = 0.5;  //height of the walls
        const BORDER_WIDTH = 0.1;  //height of the walls
        const RESTITUTION = 0.5;
        const FRICTION = 0.1;

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
                    //restitution: RESTITUTION, 
                    //friction: FRICTION
                });
            walls.push(wall);
        });
        return walls;
    }
}




