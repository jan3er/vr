import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { SphereBuilder } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { GroundBuilder } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import "@babylonjs/core/Physics/physicsEngineComponent";

import "@babylonjs/core/Materials/standardMaterial";
import { PhysicsImpostor } from "@babylonjs/core/Physics/physicsImpostor";
import { CannonJSPlugin, Color3, MeshBuilder, StandardMaterial } from "@babylonjs/core";


export class World
{
    constructor(engine, canvas)
    {
        this.engine = engine;
        this.canvas = canvas;
        this.spheres = [];
        //this.friction = 0.3;
        this.friction = 0.01;
        this.restitutionGround = 0.5;
        this.restitutionSphere = 1;
        this.iterations = 100; //precision of the physics solver

        this.NUM_SPHERES = 2;
    }

    initGround(){
        const length = 10; //diameter of the area
        const width = 20; //diameter of the area
        const height = 4;  //height of the walls
    
        //var walls = [];
    
        //coordinates of our 5 walls. First entry is width,height,depth. second is x,y,z
        [
            [new Vector3(length,1,width),  new Vector3(0,-0.5,0)],
            [new Vector3(length,height,1), new Vector3(0,height/2,width/2 -0.5)],
            [new Vector3(length,height,1), new Vector3(0,height/2,-width/2 +0.5)],
            [new Vector3(1,height,width),  new Vector3(length/2 -0.5,height/2,0)],
            [new Vector3(1,height,width),  new Vector3(-length/2 +0.5,height/2,0)],
        ].forEach(coord => {
            const wall = MeshBuilder.CreateBox("", {
                width : coord[0].x, height : coord[0].y, depth : coord[0].z
            }, this.scene);
            wall.position = coord[1];
            wall.physicsImpostor = new PhysicsImpostor(wall, PhysicsImpostor.BoxImpostor, { mass: 0, restitution: this.restitutionGround, friction: this.friction});
            //walls.push(wall);
        });
        //return walls;
    }

    init(){
        // This creates a basic Babylon Scene object (non-mesh)
        this.scene = new Scene(this.engine);

        this.scene.enablePhysics(new Vector3(0,-20, 0), new CannonJSPlugin(null, this.iterations, require("cannon")));

        // This creates and positions a free camera (non-mesh)
        const camera = new ArcRotateCamera("my first camera", 0, Math.PI / 7, 20, new Vector3(0, 0, 0), this.scene);

        // This targets the camera to scene origin
        camera.setTarget(Vector3.Zero());

        // This attaches the camera to the canvas
        camera.attachControl(this.canvas, true);

        // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
        const light = new HemisphericLight("light", new Vector3(0, 1, 0), this.scene);

        // Default intensity is 1. Let's dim the light a small amount
        light.intensity = 0.7;

        // add the meshes for the ground and borders
        this.initGround();

        for(let i = 0; i < this.NUM_SPHERES; i++){
            const sphere = MeshBuilder.CreateBox("sphere", {
                width : 3, height : 3, depth : 3, 
            }, this.scene);
            sphere.physicsImpostor = new PhysicsImpostor(sphere, PhysicsImpostor.BoxImpostor, { mass: 2, restitution: this.restitutionSphere, friction: this.friction}, this.scene);
            sphere.position.y = 2;
            // sphere.position.x = 1;
            // sphere.position.z = 2;
            
            sphere.physicsImpostor.setLinearVelocity(new Vector3(0,5,0));

            sphere.material = new StandardMaterial("", this.scene);
            sphere.material.diffuseColor = new Color3(1, 0, 1);

            this.spheres.push(sphere);
        }



        //the paddle
        this.paddle1 = SphereBuilder.CreateSphere(
            "paddle1",
            { diameter: 2, segments: 32 },
            this.scene
        );
        this.paddle1.physicsImpostor = new PhysicsImpostor(this.paddle1, PhysicsImpostor.SphereImpostor, { mass: 0, restitution: this.restitutionSphere}, this.scene);
        this.paddle1.material = new StandardMaterial("pad1", this.scene);
        this.paddle1.material.diffuseColor = new Color3(1, 0, 1);


        this.paddle2 = SphereBuilder.CreateSphere(
            "paddle2",
            { diameter: 2, segments: 32 },
            this.scene
        );
        this.paddle2.physicsImpostor = new PhysicsImpostor(this.paddle2, PhysicsImpostor.SphereImpostor, { mass: 0, restitution: this.restitutionSphere}, this.scene);
        this.paddle2.material = new StandardMaterial("pad2", this.scene);
        this.paddle2.material.diffuseColor = new Color3(1, 0, 1);
    }
}

