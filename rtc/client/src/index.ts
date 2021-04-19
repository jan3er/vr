import { Engine } from "@babylonjs/core/Engines/engine";
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { getSceneModuleWithName } from "./createScene";
import { Peer } from "./peer";

const getModuleToLoad = (): string | undefined => location.search.split('scene=')[1];


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

    const BUFFERDELAY = 1; 
    const UPDATEINTERVAL = 100;
    const BUFFERLENGTH = 10;

    var averageGap = 0;
    var averageMissing = 0;

    var jitterBuffer = new Array(BUFFERLENGTH);
    var jitterMax = 0;
    var jitterCurrent = 0;
    var frameId = 0;

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

            /*var bufferHealth = []*/
            /*var bufferIds = []*/
            /*for(var i = 0; i < BUFFERLENGTH; i++){*/
                /*const content = jitterBuffer[(jitterCurrent + i) % BUFFERLENGTH];*/
                /*if(content !== undefined && content["id"] >= jitterCurrent){*/
                    /*bufferHealth.push(1);*/
                /*} else {*/
                    /*bufferHealth.push(0);*/
                /*}*/
            /*}*/
            /*console.log(bufferHealth);*/


            const SMOOTH_GAP = 0.01
            averageGap = (1-SMOOTH_GAP) * averageGap + SMOOTH_GAP * (jitterMax - jitterCurrent);
            if(averageGap > 2*BUFFERDELAY){
                console.log("the buffer was very full for some time. jump ahead.");
                jitterCurrent = jitterMax - BUFFERDELAY;
                averageGap = BUFFERDELAY;
            } else {
                jitterCurrent+=1;
            }

            const data = jitterBuffer[jitterCurrent % BUFFERLENGTH]

            const SMOOTH_MISSING = 0.01
            if(data === undefined || data["id"] < jitterCurrent) {
                console.log("old package was in buffer");
                averageMissing = SMOOTH_MISSING * 1 + (1-SMOOTH_MISSING) * averageMissing;
            } else {
                averageMissing = SMOOTH_MISSING * 0 + (1-SMOOTH_MISSING) * averageMissing;
            }

            if(averageMissing > 0.5) {
                console.log("we have been missing more than half of our data for some time. repeat frame.");
                averageMissing = 0;
                jitterCurrent-=1;
            }

            if(data === undefined || data["id"] < jitterCurrent) return;

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
        jitterBuffer[data["id"] % BUFFERLENGTH] = data;
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
