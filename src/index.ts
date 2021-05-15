import "./main/game";
//import "./main/serialize2";


// const babylonInit = async () => {
    
//     // Get the canvas element
//     const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

//     // Generate the BABYLON 3D engine
//     const engine = new Engine(canvas, true);


//     // Create the scene
//     const world = new World(engine, canvas);
//     await world.init();

//     const manipulator = new Manipulator(world.xr.input, world);

//     const network = new Network(world);
//     network.start();

//     world.scene.registerBeforeRender(() => {
//         manipulator.mainLoop();
//         network.mainLoop();

//         //reset spheres that are too far away
//         for(let i = 0; i < world.spheres.length; i++){
//             const sphere = world.spheres[i];
//             if (sphere.position.y > 10 || sphere.position.y < -1) {
//                 sphere.position = new Vector3(0,2,0);
//                 sphere.physicsImpostor.setLinearVelocity(new Vector3(0,0,0));
//             }
//         }
// 	});

//     // Register a render loop to repeatedly render the scene
//     engine.runRenderLoop(function () {
//         //network.render();
//         world.scene.render();
//     });

//     // Watch for browser/canvas resize events
//     window.addEventListener("resize", function () {
//         engine.resize();
//     });

//     return world;
// }


// babylonInit().then( world => {

// });