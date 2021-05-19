import { AmmoJSPlugin, ArcRotateCamera, CannonJSPlugin, Engine, HemisphericLight, Scene, SceneInstrumentation, Vector3, WebXRDefaultExperience, WebXRExperienceHelper, WebXRState } from "@babylonjs/core";
import { Network } from "./network";
import { Serializer } from "./serialize";
import { Logger, World } from "./world";

export class Game{
    engine: Engine;
    scene: Scene;
    serializer :Serializer;
    world: World;
    logger: Logger;
    xr: WebXRDefaultExperience;
    
    async start(){
        // Get the canvas element
        const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

        // Generate the BABYLON 3D engine
        this.engine = new Engine(canvas, true);

        // This creates a basic Babylon Scene object (non-mesh)
        this.scene = new Scene(this.engine);
        
        // enable physics
        this.scene.enablePhysics(new Vector3(0,-9.81, 0), new CannonJSPlugin(null, 500, require("cannon")));
        
        //how do i wake them up again?
        //this.scene.getPhysicsEngine().getPhysicsPlugin().world.allowSleep = true;

        // This creates and positions a free camera (non-mesh)
        const camera = new ArcRotateCamera("my first camera", 0, Math.PI / 7, 3, new Vector3(0, 0, 0), this.scene);

        // This targets the camera to scene origin
        camera.setTarget(Vector3.Zero());

        // This attaches the camera to the canvas
        camera.attachControl(canvas, true);

        // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
        const light = new HemisphericLight("light", new Vector3(0, 1, 0), this.scene);

        // Default intensity is 1. Let's dim the light a small amount
        light.intensity = 0.7;
        
        this.logger = new Logger(this);
        
        this.serializer = new Serializer(this);

        // Create the world
        this.world = new World(this);
        
        /////////////////////////////////////////////////////
        
        this.xr = await this.scene.createDefaultXRExperienceAsync({});
        console.log(this.xr);
        this.xr.baseExperience.onStateChangedObservable.add((state) => {
            switch (state) {
                case WebXRState.IN_XR:
                    // XR is initialized and already submitted one frame
                    this.xr.baseExperience.camera.position = new Vector3(0,1,0);
                case WebXRState.ENTERING_XR:
                    // xr is being initialized, enter XR request was made
                case WebXRState.EXITING_XR:
                    // xr exit request was made. not yet done.
                case WebXRState.NOT_IN_XR:
                    // self explanatory - either out or not yet in XR
            }
        });
        //if we enter vr mode, set the controller
        this.xr.input.onControllerAddedObservable.add(inputSource => {
            if(inputSource.uniqueId.includes("right")){
                for(let player of this.world.players){
                    if (player.isLocal){
                        player.vrInput = inputSource;
                    }
                }
            }
        });   
        
        const network = new Network(this);
        network.start();
        
        // record some debug parameters
        var inst = new SceneInstrumentation(this.scene);
        inst.captureInterFrameTime = true;
        inst.captureRenderTime = true;
        inst.capturePhysicsTime = true;

        // Register a render loop to repeatedly render the scene
        this.engine.runRenderLoop(() => {
            const start = new Date().getTime();
            network.mainLoop();
            this.world.update();
            const end = new Date().getTime();
            this.logger.log("fps", this.engine.getFps().toFixed());
            this.logger.log("manual", end-start);
            this.logger.log("inst physics time", inst.physicsTimeCounter.lastSecAverage.toFixed());
            this.logger.log("inst render time", inst.renderTimeCounter.lastSecAverage.toFixed());
            this.logger.log("inst inter time", inst.interFrameTimeCounter.lastSecAverage.toFixed());
            this.scene.render();
        });

        // Watch for browser/canvas resize events
        window.addEventListener("resize", () => {
            this.engine.resize();
        });

    }
}

//TODO: the jittery behaviour of the blocks at rest is still a problem. Possible solutions:
//it seems like the jittering is less if i sync less
//make sure we dont sent the packages when we are sleeping
//use a buffer to make sure the packages flow smoothly (probably wont help?)
    
function start(){
    const game = new Game;
    game.start();
}
start();