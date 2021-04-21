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
import { ammoModule, ammoReadyPromise } from "../externals/ammo";
import { CreateSceneClass } from "../createScene";
import { CannonJSPlugin, Color3, StandardMaterial } from "@babylonjs/core";

class PhysicsSceneWithAmmo implements CreateSceneClass {
    preTasks = [ammoReadyPromise];

    createScene = async (engine: Engine, canvas: HTMLCanvasElement): Promise<Scene> => {
        // This creates a basic Babylon Scene object (non-mesh)
        const scene = new Scene(engine);
    
        //scene.enablePhysics(null, new AmmoJSPlugin(true, ammoModule));
        scene.enablePhysics(null, new CannonJSPlugin(null, 10, require("cannon")));
    
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

        var myMaterial = new StandardMaterial("myMaterial", scene);
        myMaterial.diffuseColor = new Color3(1, 0, 1);
        sphere.material = myMaterial;
    
        sphere.physicsImpostor = new PhysicsImpostor(sphere, PhysicsImpostor.SphereImpostor, { mass: 2, restitution: 0.9}, scene);
    
        // Move the sphere upward 1/2 its height
        sphere.position.y = 1;

        const vel = new Vector3(0,10,0);
        sphere.physicsImpostor.setLinearVelocity(vel);
    
        // Our built-in 'ground' shape.
        const ground = GroundBuilder.CreateGround(
            "ground",
            { width: 6, height: 6 },
            scene
        );
        
        ground.physicsImpostor = new PhysicsImpostor(ground, PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.9});

        sphere.physicsImpostor.registerOnPhysicsCollide(ground.physicsImpostor, (main, collided) => {
            myMaterial.diffuseColor = new Color3(Math.random(), Math.random(), Math.random());
            //console.log("bang!");
        });
    
        return scene;
    };
}

export default new PhysicsSceneWithAmmo();
