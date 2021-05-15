import { KeyboardEventTypes } from "@babylonjs/core/Events/keyboardEvents";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Vector3 } from "@babylonjs/core/Maths/math";
import { SphereBuilder } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { PhysicsImpostor } from "@babylonjs/core/Physics/physicsImpostor";
import { Scene } from "@babylonjs/core/scene";
import { TextBlock, StackPanel, Control } from "@babylonjs/gui";
import { AdvancedDynamicTexture } from "@babylonjs/gui/2D/advancedDynamicTexture";

import { NetworkObject } from "./object";
import { NetworkController } from "./player";
import { Serializable, Serializer } from "./serialize2";

//prints given key, value pairs on the sceen
//sorts them alphabetically by key before printing
export class MyLogger{
    static readonly MAX_KEYS = 20;
    texts: TextBlock[] = [];
    dict: any = {};
    constructor(scene: Scene){

        //https://www.babylonjs.com.cn/how_to/gui.html
        var advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);
        var panel = new StackPanel();   
        
        panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP; 
        panel.height = 0.3;
        panel.width = 0.7;
        advancedTexture.addControl(panel);

        for(let i=0; i < MyLogger.MAX_KEYS; i++){
            var text = new TextBlock();
            text.text = "";
            text.color = "white";
            text.fontSize = 24;
            text.width = "500px";
            text.height = "30px";
            text.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
            panel.addControl(text);
            advancedTexture.addControl(text);
            this.texts.push(text);
        }
    }
    
    log(key, value){
        this.dict[key] = value;
        var i = 0;
        for (let key of Object.keys(this.dict).sort()){
            this.texts[i].text = "" + key + ": " + this.dict[key];
            i++;
        }
    }
}

export class World extends Serializable{
    scene:    Scene;
    players:  NetworkController[];
    objects:  NetworkObject[];
    children: Serializable[];
    logger:   MyLogger;
    

    constructor(scene: Scene, serializer: Serializer){
        super();
        this.scene = scene;
        this.logger = new MyLogger(scene);
        
        World.MakeGround(scene);

        //two players
        //if we want two controlllers per player just add them with the same id?
        this.players = [new NetworkController(0,this,serializer), new NetworkController(1,this,serializer)];

        //a bunch of network objects
        this.objects = [];
        for(let i = 0; i < 10; i++){
            const sphere = NetworkObject.MakeSphere(this, scene, serializer);
            sphere.mesh.position.x = i/2;
            this.objects.push(sphere);
        }

        //make sure the authority is updated on collision
        NetworkObject.RegisterCollisionCallbacks(this.players, this.objects);

        //in the end put everything that should be send in the children array
        this.children = (<Serializable[]>this.players).concat(<Serializable[]>this.objects);

        
        this.finalize(serializer);
    }
    
    update(){
        for(let c of this.children){
            c.update();
        }
    }
    
    ///////////////////////////////////////////////////
    
    static MakeGround(scene) : Mesh[] {
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




