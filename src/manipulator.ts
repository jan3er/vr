import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { SphereBuilder } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import "@babylonjs/core";

import "@babylonjs/core/Materials/standardMaterial";
import { PhysicsImpostor } from "@babylonjs/core/Physics/physicsImpostor";
import { AssetsProgressEvent, CannonJSPlugin, Color3, MeshBuilder, StandardMaterial, WebXRInput, WebXRInputSource } from "@babylonjs/core";
import '@babylonjs/loaders/';


import * as BABYLON from "@babylonjs/core";
import { walkUpBindingElementsAndPatterns } from "typescript";

export class Manipulator
{
    //input: WebXRInput;
    left: WebXRInputSource;
    right: WebXRInputSource;
    constructor(input: WebXRInput)
    {
        input.controllers.forEach(controller => {
            if(controller.uniqueId.includes("right")) this.right = controller;
            if(controller.uniqueId.includes("left")) this.left = controller;
        }); 
        if(this.left === undefined || this.right === undefined) throw new Error("no vr input");
        
    }

    
}

