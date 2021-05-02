import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { SphereBuilder } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { PhysicsImpostor } from "@babylonjs/core/Physics/physicsImpostor";
import { CannonJSPlugin, Color3, Mesh, MeshBuilder, StandardMaterial, WebXRDefaultExperience, WebXRState } from "@babylonjs/core";
//import '@babylonjs/loaders/';

import { AdvancedDynamicTexture, TextBlock, Control, StackPanel } from "@babylonjs/gui";
import { Serializable } from "./serialize";

export class World
{
    engine: Engine;
    canvas: HTMLCanvasElement;
    scene: Scene;
    spheres: Array<Mesh>;
    paddle1: Mesh;
    paddle2: Mesh;
    xr: WebXRDefaultExperience;

    //put some debug text here
    texts: Array<TextBlock> = [];

    friction = 0.015;
    restitutionGround = 0.9;
    restitutionSphere = 0.9;
    iterations = 100; //precision of the physics solver

    numSpheres = 1;
    sphereSize = 0.4;
    paddleSize = 0.2;

    arenaLength = 2; //diameter of the area
    arenaWidth = 2; //diameter of the area
    arenaHeight = 0.5;  //height of the walls
    borderWidth = 0.1;  //height of the walls

    constructor(engine: Engine, canvas: HTMLCanvasElement)
    {
        this.engine = engine;
        this.canvas = canvas;
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

    async init(){
        // This creates a basic Babylon Scene object (non-mesh)
        this.scene = new Scene(this.engine);

        this.scene.enablePhysics(new Vector3(0,-10, 0), new CannonJSPlugin(null, this.iterations, require("cannon")));

        // This creates and positions a free camera (non-mesh)
        const camera = new ArcRotateCamera("my first camera", 0, Math.PI / 7, 5, new Vector3(0, 0, 0), this.scene);

        // This targets the camera to scene origin
        camera.setTarget(Vector3.Zero());

        // This attaches the camera to the canvas
        camera.attachControl(this.canvas, true);

        // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
        const light = new HemisphericLight("light", new Vector3(0, 1, 0), this.scene);

        // Default intensity is 1. Let's dim the light a small amount
        light.intensity = 0.7;

        // add the meshes for the ground and borders
        const walls = this.initGround();

        this.xr = await this.scene.createDefaultXRExperienceAsync({
            floorMeshes : walls,
            uiOptions: {
                //sessionMode: 'local'
            }
        });
        //this.xr.baseExperience.camera.position = new Vector3(0,1,0);

        //const xrHelper = await BABYLON.WebXRExperienceHelper.CreateAsync(this.scene);
        //const sessionManager = await xrHelper.enterXRAsync("immersive-vr", "unbounded" );

        console.log(this.xr);
        this.xr.baseExperience.onStateChangedObservable.add((state) => {
            switch (state) {
                case WebXRState.IN_XR:
                    // XR is initialized and already submitted one frame

                    //console.log(this.xr.baseExperience.sessionManager.referenceSpace);

                    this.xr.baseExperience.camera.position = new Vector3(0,1,0);

                case WebXRState.ENTERING_XR:
                    // xr is being initialized, enter XR request was made


                case WebXRState.EXITING_XR:
                    // xr exit request was made. not yet done.
                case WebXRState.NOT_IN_XR:
                    // self explanatory - either out or not yet in XR
            }
        });
    

 
        this.spheres = [];
        for(let i = 0; i < this.numSpheres; i++){
            const sphere = MeshBuilder.CreateBox("sphere", {
                size: this.sphereSize, 
            }, this.scene);
            sphere.physicsImpostor = new PhysicsImpostor(sphere, PhysicsImpostor.BoxImpostor, { mass: 2, restitution: this.restitutionSphere, friction: this.friction}, this.scene);
            sphere.position = new Vector3(0,2,0);
            
            sphere.physicsImpostor.setLinearVelocity(new Vector3(0,3,0));

            const material = new StandardMaterial("", this.scene);
            material.diffuseColor = new Color3(1, 0, 1);
            sphere.material = material;

            this.spheres.push(sphere);
        }



        //the paddle
        this.paddle1 = SphereBuilder.CreateSphere(
            "paddle1",
            { diameterX: this.paddleSize, diameterY: 0.7*this.paddleSize, diameterZ: this.paddleSize, segments: 32 },
            this.scene
        );
        this.paddle1.position = new Vector3(-1,0,-1);
        this.paddle1.physicsImpostor = new PhysicsImpostor(this.paddle1, PhysicsImpostor.SphereImpostor, { mass: 0, restitution: this.restitutionSphere}, this.scene);
        const material1 = new StandardMaterial("pad1", this.scene);
        material1.diffuseColor = new Color3(1, 0, 1);
        this.paddle1.material = material1;


        this.paddle2 = SphereBuilder.CreateSphere(
            "paddle2",
            { diameterX: this.paddleSize, diameterY: 0.7*this.paddleSize, diameterZ: this.paddleSize, segments: 32 },
            this.scene
        );
        this.paddle2.position = new Vector3(-1,0,-1);
        this.paddle2.physicsImpostor = new PhysicsImpostor(this.paddle2, PhysicsImpostor.SphereImpostor, { mass: 0, restitution: this.restitutionSphere}, this.scene);
        const material2 = new StandardMaterial("pad2", this.scene);
        material2.diffuseColor = new Color3(1, 0, 1);
        this.paddle2.material = material2;

        //https://www.babylonjs.com.cn/how_to/gui.html
        var advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI", true, this.scene);
        var panel = new StackPanel();   
        
        panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP; 
        panel.height = 0.3;
        panel.width = 0.3;
        advancedTexture.addControl(panel);

        for(let i=0; i < 5; i++){
            var text = new TextBlock();
            text.text = "";
            text.color = "white";
            text.fontSize = 24;
            text.width = "500px";
            text.height = "30px";
            text.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
            panel.addControl(text);
            this.texts.push(text);
        }


    }
}

class Sphere extends Serializable{
    mesh: Mesh;
    scene: Scene;

    static readonly SIZE: 1;
    static readonly MASS = 2;
    static readonly RESTITUTION = 0.9;
    static readonly FRICTION: 0.01;

    constructor(scene: Scene){
        super();
        this.scene = scene;
        this.mesh = MeshBuilder.CreateBox("sphere", {
            size: Sphere.SIZE, 
        }, this.scene);
        this.mesh.physicsImpostor = new PhysicsImpostor(this.mesh, PhysicsImpostor.BoxImpostor, 
            { 
                mass:        Sphere.MASS, 
                restitution: Sphere.RESTITUTION, 
                friction:    Sphere.FRICTION
            }, this.scene);
        this.mesh.position.set(0,2,0);

        this.mesh.physicsImpostor.setLinearVelocity(new Vector3(0,3,0));

        const material = new StandardMaterial("", this.scene);
        material.diffuseColor = new Color3(1, 0, 1);
        this.mesh.material = material;
    }

    serialize() {
        this.writeVector3(this.mesh.position);
        this.writeQuaternion(this.mesh.rotationQuaternion);
        this.writeVector3(this.mesh.physicsImpostor.getLinearVelocity());
        this.writeVector3(this.mesh.physicsImpostor.getAngularVelocity());
    }
    deserialize() {
        this.mesh.position = this.readVector3();
        this.mesh.rotationQuaternion.copyFrom(this.readQuaternion());
        this.mesh.physicsImpostor.setLinearVelocity(this.readVector3());
        this.mesh.physicsImpostor.setAngularVelocity(this.readVector3());   
    }
}



