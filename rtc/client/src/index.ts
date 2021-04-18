import { Engine } from "@babylonjs/core/Engines/engine";
import { getSceneModuleWithName } from "./createScene";
import * as SimplePeer from './simplepeer.min.js';


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


    setInterval(function(){
        scene.getMeshByName("sphere").position.y = 5;
    }, 5000);

    // Watch for browser/canvas resize events
    window.addEventListener("resize", function () {
        engine.resize();
    });

    return scene;
}

babylonInit().then( scene => {
    // scene started rendering, everything is initialized

    var ws = new WebSocket("ws://localhost:9090");

    function makeWebRTC(isInitiator){
        var p = new SimplePeer({
            initiator: isInitiator,
            channelConfig: { //an unordered, unreliable channel (i.e., udp)
                ordered : false,
                maxRetransmits: 0
            },
            trickle: false
        });

        p.on('error', err => console.log('error', err));

        p.on('signal', data => {
            console.log(JSON.stringify(data));
            ws.send(JSON.stringify(data));
        });

        if(isInitiator){
            p.on('connect', () => {

                setInterval(function(){
                    const pos = scene.getMeshByName("sphere").position;
                    console.log(pos);
                    p.send(JSON.stringify(pos));
                }, 100);

            });
        }
        p.on('data', data => {
            /*console.log('data: ' + data);*/
            data = JSON.parse(data);
            console.log(data);
            /*scene.getMeshByName("sphere").position.y = data.y;*/
            scene.getMeshByName("sphere").position = data;
        });
        return p;
    }
    var p = makeWebRTC(false);

    ws.onmessage = function (evt) {
        console.log(evt.data);
        if (evt.data === "go ahead and start a session") {
            p = makeWebRTC(true);
        }
        else {
            p.signal(JSON.parse(evt.data));
        }
    };

});
