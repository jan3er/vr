import { AmmoJSPlugin, ArcRotateCamera, CannonJSPlugin, Engine, FreeCamera, HemisphericLight, Mesh, PhysicsImpostor, Scene, SceneInstrumentation, Vector3, WebXRDefaultExperience, WebXRExperienceHelper, WebXRState } from "@babylonjs/core";
import { Logger } from "./logger";
import { Network } from "./network";
import { Serializer } from "./serialize";
import { World } from "./world";
//import {} from "../../cannon.js";
import ammo from "ammo.js";
import { WebXRControllerPhysics } from '@babylonjs/core/XR/features/WebXRControllerPhysics';

// The physics controller support will now be available and can be enabled:



export class Game{
    engine: Engine;
    scene: Scene;
    serializer :Serializer;
    world: World;
    network: Network;
    logger: Logger;
    xr: WebXRDefaultExperience;
    
    static readonly PHYSICS_FPS = 100;
    static readonly PHYSICS_ITERATIONS = 100;
    
    //https://playground.babylonjs.com/#B922X8#185
    

    async start(){
        // Get the canvas element
        const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

        // Generate the BABYLON 3D engine
        //https://doc.babylonjs.com/divingDeeper/animation/advanced_animations#deterministic-lockstep
        this.engine = new Engine(canvas, true, {
          //deterministicLockstep: true,
          //lockstepMaxSteps: 4,
          timeStep: 1/Game.PHYSICS_FPS,
        });

        // This creates a basic Babylon Scene object (non-mesh)
        this.scene = new Scene(this.engine);
        
        // enable physics
        //const physics = new CannonJSPlugin(false, Game.PHYSICS_ITERATIONS, require("../../cannon.js"));
        
        const physics = new AmmoJSPlugin(true, await ammo());
        

        this.scene.enablePhysics(new Vector3(0,-9.81, 0), physics);
        physics.setTimeStep(1/Game.PHYSICS_FPS);
        
        
        
        //how do i wake them up again?
        //this.scene.getPhysicsEngine().getPhysicsPlugin().world.allowSleep = true;
        //this.scene.getPhysicsEngine().setTimeStep(1/72);
    

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
        
        
        //-------------------

        // Create the world
        this.world = new World(this);
        
        /////////////////////////////////////////////////////
        
        this.xr = await this.scene.createDefaultXRExperienceAsync({});
        this.xr.baseExperience.featuresManager.enableFeature(WebXRControllerPhysics.Name, "latest");

        console.log(this.xr);
        this.xr.baseExperience.onStateChangedObservable.add((state) => {
            switch (state) {
                case WebXRState.IN_XR:
                    // XR is initialized and already submitted one frame
                    //this.xr.baseExperience.camera.position = new Vector3(0,0,0);
                    //this.xr.baseExperience.sessionManager.referenceSpace.
                case WebXRState.ENTERING_XR:
                    camera.position = new Vector3(0,0,0);
                    // xr is being initialized, enter XR request was made
                case WebXRState.EXITING_XR:
                    // xr exit request was made. not yet done.
                case WebXRState.NOT_IN_XR:
                    // self explanatory - either out or not yet in XR
            }
        });
        //if we enter vr mode, set the controller
        this.xr.input.onControllerAddedObservable.add(inputSource => {
            const localControllers = this.world.players.filter(p => p.isLocal);
            if(inputSource.uniqueId.includes("right")){
                localControllers[0].vrInput = inputSource;
            }
            if(inputSource.uniqueId.includes("left")){
                localControllers[1].vrInput = inputSource;
            }
        });   
        
        this.network = new Network(this);
        this.network.start();
        
        // record some debug parameters
        var inst = new SceneInstrumentation(this.scene);
        inst.captureInterFrameTime = true;
        inst.captureRenderTime = true;
        inst.capturePhysicsTime = true;
        

        this.scene.onAfterStepObservable.add((scene) => {
            //TODO: currently never called
            this.network.step();
            this.world.stepAfterPhysics();
        });
        this.scene.onBeforeRenderObservable.add(() => {
            this.world.stepBeforeRender(this.engine.getDeltaTime());
        });

        // Register a render loop to repeatedly render the scene
        this.engine.runRenderLoop(() => {
            //const start = new Date().getTime();
            //const end = new Date().getTime();
            //this.logger.log("manual", end-start);
            //this.logger.log("inst render time", inst.renderTimeCounter.lastSecAverage.toFixed());
            //this.logger.log("inst inter time", inst.interFrameTimeCounter.lastSecAverage.toFixed());
            this.logger.log("fps", this.engine.getFps().toFixed());
            this.logger.log("physics", inst.physicsTimeCounter.lastSecAverage.toFixed());
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

var createScene = async function () {

    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

    const engine = new Engine(canvas, true, {
      deterministicLockstep: true,
      lockstepMaxSteps: 4,
      timeStep: 1/Game.PHYSICS_FPS,
    });

        


    // This creates a basic Babylon Scene object (non-mesh)
    var scene = new Scene(engine);

    // This creates and positions a free camera (non-mesh)
    var camera = new FreeCamera("camera1", new Vector3(0, 5, -10), scene);

    // This targets the camera to scene origin
    camera.setTarget(Vector3.Zero());


    // This targets the camera to scene origin
    camera.setTarget(Vector3.Zero());

    // This attaches the camera to the canvas
    camera.attachControl(canvas, true);

    // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
    var light = new HemisphericLight("light1", new Vector3(0, 1, 0), scene);

    // Default intensity is 1. Let's dim the light a small amount
    light.intensity = 0.7;

    // Our built-in 'sphere' shape. Params: name, subdivs, size, scene
    var sphere = Mesh.CreateSphere("sphere1", 16, 2, scene);
    var sphere2 = Mesh.CreateSphere("sphere1", 16, 2, scene);
    sphere2.position= new Vector3(-2.5,5,0);

    // Move the sphere upward 1/2 its height
    sphere.position.y = 7;

    // Our built-in 'ground' shape. Params: name, width, depth, subdivs, scene
    var ground = Mesh.CreateGround("ground1", 6, 6, 2, scene);
    ground.position.y = 5;
	
    const physics = new AmmoJSPlugin(true, await ammo());
    scene.enablePhysics(new Vector3(0,-9.81, 0), physics);
    physics.setTimeStep(1/Game.PHYSICS_FPS);

	//scene.enablePhysics();
	
	sphere.physicsImpostor = new PhysicsImpostor(sphere, PhysicsImpostor.SphereImpostor, { mass: 1, restitution: 0.9 }, scene);
	sphere2.physicsImpostor = new PhysicsImpostor(sphere2, PhysicsImpostor.SphereImpostor, { mass: 1, restitution: 0.9 }, scene);
	ground.physicsImpostor = new PhysicsImpostor(ground, PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.9 }, scene);

    engine.runRenderLoop(() => {
        scene.render();
    });

    //scene.onBeforeRenderObservable.add(() => {
    scene.onAfterStepObservable.add(() => {
        sphere2.position.x += 0.01;
        sphere2.physicsImpostor.setLinearVelocity(new Vector3(0,0,0));
        sphere2.physicsImpostor.setAngularVelocity(new Vector3(0,0,0));
    });
};
//createScene();