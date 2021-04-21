import { Engine } from "@babylonjs/core/Engines/engine";
import {Network} from "./network";
import { createScene } from "./scene";

export const babylonInit = async () => {
    
    // Get the canvas element
    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

    // Generate the BABYLON 3D engine
    const engine = new Engine(canvas, true);

    // Create the scene
    const scene = createScene(engine, canvas);

    const network = new Network(scene);
    network.start();

    // Register a render loop to repeatedly render the scene
    engine.runRenderLoop(function () {
        network.render();
        scene.render();
    });

    // Watch for browser/canvas resize events
    window.addEventListener("resize", function () {
        engine.resize();
    });

    return scene;
}


babylonInit().then( scene => {

});