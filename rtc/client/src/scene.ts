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


function createGround(scene: Scene){

    const len = 10; //diameter of the area
    const hei = 2;  //height of the walls

    var walls = [];

    //coordinates of our 5 walls. First entry is width,height,depth. second is x,y,z
    [
        [new Vector3(len,1,len), new Vector3(0,-0.5,0)],
        [new Vector3(len,hei,1), new Vector3(0,hei/2,len/2 -0.5)],
        [new Vector3(len,hei,1), new Vector3(0,hei/2,-len/2 +0.5)],
        [new Vector3(1,hei,len), new Vector3(len/2 -0.5,hei/2,0)],
        [new Vector3(1,hei,len), new Vector3(-len/2 +0.5,hei/2,0)],
    ].forEach(coord => {
        const wall = MeshBuilder.CreateBox("", {
            width : coord[0]._x, height : coord[0]._y, depth : coord[0]._z
        }, scene);
        wall.position = coord[1];
        wall.physicsImpostor = new PhysicsImpostor(wall, PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.9});
        walls.push(wall);
    });
    return walls;
}


export function createScene(engine: Engine, canvas: HTMLCanvasElement){
    // This creates a basic Babylon Scene object (non-mesh)
    const scene = new Scene(engine);

    scene.enablePhysics(new Vector3(0,-9.81, 0), new CannonJSPlugin(null, 10, require("cannon")));

    // This creates and positions a free camera (non-mesh)
    const camera = new ArcRotateCamera("my first camera", 0, Math.PI / 3, 20, new Vector3(0, 0, 0), scene);

    // This targets the camera to scene origin
    camera.setTarget(Vector3.Zero());

    // This attaches the camera to the canvas
    camera.attachControl(canvas, true);

    // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
    const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);

    // Default intensity is 1. Let's dim the light a small amount
    light.intensity = 0.7;

    // Our built-in 'sphere' shape.
    const sphere = SphereBuilder.CreateSphere(
        "sphere",
        { diameter: 2, segments: 32 },
        scene
    );
    sphere.physicsImpostor = new PhysicsImpostor(sphere, PhysicsImpostor.SphereImpostor, { mass: 2, restitution: 0.9}, scene);
    sphere.position.y = 1;
    sphere.position.x = 1;
    sphere.position.z = 2;

    const vel = new Vector3(0,5,0);
    sphere.physicsImpostor.setLinearVelocity(vel);

    const walls = createGround(scene);

    var myMaterial = new StandardMaterial("myMaterial", scene);
    myMaterial.diffuseColor = new Color3(1, 0, 1);
    sphere.material = myMaterial;

    walls.forEach( wall => {
        sphere.physicsImpostor.registerOnPhysicsCollide(wall.physicsImpostor, (main, collided) => {
            myMaterial.diffuseColor = new Color3(Math.random(), Math.random(), Math.random());
            //console.log("bang!");
        });
    });


    //the paddle
    const paddle = SphereBuilder.CreateSphere(
        "paddle",
        { diameter: 2, segments: 32 },
        scene
    );
    paddle.position.y = 1;
    paddle.physicsImpostor = new PhysicsImpostor(paddle, PhysicsImpostor.SphereImpostor, { mass: 0, restitution: 0.9}, scene);

    return scene;
};

