import "@babylonjs/core";

import "@babylonjs/core/Materials/standardMaterial";
import {  Mesh, WebXRInput, WebXRInputSource } from "@babylonjs/core";
import '@babylonjs/loaders/';


import * as BABYLON from "@babylonjs/core";

export class Manipulator
{
    //input: WebXRInput;
    left: WebXRInputSource;
    right: WebXRInputSource;
    spheres: Array<Mesh>;
    constructor(input: WebXRInput, spheres: Array<Mesh>)
    {
        this.spheres = spheres;
        input.onControllerAddedObservable.add(inputSource => {
            if(inputSource.uniqueId.includes("right")) this.right = inputSource;
            if(inputSource.uniqueId.includes("left")) this.left = inputSource;

        });    
    }

    isConnected(){
        return this.left !== undefined && this.right !== undefined;
    }

    processInputs(){
        this.spheres.forEach(sphere => {
            //console.log(sphere.position, this.left.grip.position);
            //throw Error("bla");
            if(this.left.grip.intersectsMesh(sphere, false)){
                console.log("bang?");
            }
        });
    }

    
}

