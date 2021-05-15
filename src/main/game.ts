import { ArcRotateCamera, CannonJSPlugin, Engine, HemisphericLight, Scene, SceneInstrumentation, Vector3 } from "@babylonjs/core";
import { Network } from "./network";
import { Serializer } from "./serialize2";
import { World } from "./world";


async function init(){

    // Get the canvas element
    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

    // Generate the BABYLON 3D engine
    const engine = new Engine(canvas, true);

    // This creates a basic Babylon Scene object (non-mesh)
    const scene = new Scene(engine);

    scene.enablePhysics(new Vector3(0,-10, 0), new CannonJSPlugin(null, 10, require("cannon")));

    // This creates and positions a free camera (non-mesh)
    const camera = new ArcRotateCamera("my first camera", 0, Math.PI / 7, 5, new Vector3(0, 0, 0), scene);

    // This targets the camera to scene origin
    camera.setTarget(Vector3.Zero());

    // This attaches the camera to the canvas
    camera.attachControl(canvas, true);

    // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
    const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);

    // Default intensity is 1. Let's dim the light a small amount
    light.intensity = 0.7;
    
    const serializer = new Serializer();

    // Create the scene
    const world = new World(scene, serializer);
    serializer.logger = world.logger;

    const network = new Network(world, serializer);
    network.start();
    
    // Instrumentation
    var inst = new SceneInstrumentation(scene);
    inst.captureInterFrameTime = true;
    inst.captureRenderTime = true;
    inst.capturePhysicsTime = true

    // Register a render loop to repeatedly render the scene
    engine.runRenderLoop(() => {
        const start = new Date().getTime();
        world.update();
        network.mainLoop();
        const end = new Date().getTime();
        world.logger.log("fps", engine.getFps().toFixed());
        world.logger.log("manual", end-start);
        world.logger.log("inst physics time", inst.physicsTimeCounter.lastSecAverage.toFixed());
        world.logger.log("inst render time", inst.renderTimeCounter.lastSecAverage.toFixed());
        world.logger.log("inst inter time", inst.interFrameTimeCounter.lastSecAverage.toFixed());
        scene.render();
    });

    // Watch for browser/canvas resize events
    window.addEventListener("resize", function () {
        engine.resize();
    });

    //return world;
}

init();
document.getElementById("heading").remove();
