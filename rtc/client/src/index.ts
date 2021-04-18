import { Engine } from "@babylonjs/core/Engines/engine";
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { getSceneModuleWithName } from "./createScene";
import { Peer } from "./peer";

const getModuleToLoad = (): string | undefined => location.search.split('scene=')[1];

var jitterBuffer = new Array(10);
var jitterMax = 0;
var jitterCurrent = 0;
var frameId = 0;

export const babylonInit = async () => {
    // get the module to load
    const moduleName = getModuleToLoad();
    const createSceneModule = await getSceneModuleWithName(moduleName);

    // Execute the pretasks, if defined
    await Promise.all(createSceneModule.preTasks || []);
    // Get the canvas element
    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement; 
    // Generate the BABYLON 3D engine
    const engine = new Engine(canvas, true); 

    // Create the scene
    const scene = await createSceneModule.createScene(engine, canvas);

    // Register a render loop to repeatedly render the scene
    engine.runRenderLoop(function () {
        scene.render();
    });

    // Watch for browser/canvas resize events
    window.addEventListener("resize", function () {
        engine.resize();
    });

    return scene;
}

babylonInit().then( scene => {
    // scene started rendering, everything is initialized

    const BUFFERDELAY = 0;
    const UPDATEINTERVAL = 10;

    function connectServer(p){
        setInterval(function(){
            var pack = { "id" : frameId, "meshes" : [] };
            frameId += 1;
            scene.meshes.forEach(function(m) {
                var pos = m.position;
                var pos2 = [pos._x, pos._y, pos._z];
                var vel = m.physicsImpostor.getLinearVelocity();
                var vel2 = [vel._x, vel._y, vel._z];
                pack.meshes.push({"pos" : pos2, "vel" : vel2, "name" : m.name});
            });
            p.send(JSON.stringify(pack));
        }, UPDATEINTERVAL);

        setInterval(function(){
            scene.getMeshByName("sphere").physicsImpostor.setLinearVelocity(new Vector3(0,10,0));
        }, 5118);
    }

    function connectClient(p){
        setInterval(function(){
            if(jitterMax > jitterCurrent + BUFFERDELAY){
                jitterCurrent += 1;
            } else {
                jitterCurrent += 0;
            }
            /*console.log(jitterCurrent);*/
            const data = jitterBuffer[jitterCurrent % 10]


            /*const data = jitterBuffer[jitterMax % 10]*/
            /*console.log(jitterMax-jitterCurrent);*/
            /*jitterCurrent = jitterMax;*/
            if(data === undefined) return;
            data["meshes"].forEach(function(m) {
                /*console.log(m);*/
                var mesh = scene.getMeshByName(m["name"]);
                const pos = new Vector3(m["pos"][0],m["pos"][1],m["pos"][2]);
                mesh.position = pos;
                const vel = new Vector3(m["vel"][0],m["vel"][1],m["vel"][2]);
                mesh.physicsImpostor.setLinearVelocity(vel);
                /*console.log(mesh.position);*/
            });
        }, UPDATEINTERVAL);
    }

    function dataClient(data){
        data = JSON.parse(data);
        /*console.log("in: ", data);*/
        jitterBuffer[data["id"] % 10] = data;
        jitterMax = Math.max(jitterMax, data["id"]);
        /*scene.getMeshByName("sphere").position = data["p"];*/
    }

    function dataServer(data){
        //server receives no data
    }

    const peer = new Peer();
    peer.connectClient = connectClient;
    peer.dataClient    = dataClient;
    peer.connectServer = connectServer;
    peer.dataServer    = dataServer;
    peer.connect();

});
