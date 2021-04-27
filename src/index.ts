import { Engine } from "@babylonjs/core/Engines/engine";
import { Manipulator } from "./manipulator";
import {Network} from "./network";
import { World } from "./world";

export const babylonInit = async () => {
    
    // Get the canvas element
    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

    // Generate the BABYLON 3D engine
    const engine = new Engine(canvas, true);


    // Create the scene
    const world = new World(engine, canvas);
    await world.init();

    const manipulator = new Manipulator(world.xr.input, world.spheres);

    const network = new Network(world, manipulator);
    network.start();

    world.scene.registerBeforeRender(function () {
        network.render()
	})

    // Register a render loop to repeatedly render the scene
    engine.runRenderLoop(function () {
        //network.render();
        world.scene.render();
    });

    // Watch for browser/canvas resize events
    window.addEventListener("resize", function () {
        engine.resize();
    });

    return world;
}


babylonInit().then( world => {
    const heading = document.getElementById("heading");
    heading.innerHTML = "Javascript loaded";

    // console.log(world.xr);
    // world.xr.baseExperience.sessionManager.runXRRenderLoop();
    // console.log(world.xr);

});
