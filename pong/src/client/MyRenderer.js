import * as THREE from 'three';
import { Paddle } from '../common/Game';
import { Renderer } from 'lance-gg';
import { BoxLineGeometry } from 'three/examples/jsm/geometries/BoxLineGeometry.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { FlyControls } from 'three/examples/jsm/controls/FlyControls.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { FirstPersonControls } from 'three/examples/jsm/controls/FirstPersonControls.js';

export default class MyRenderer extends Renderer {

    // constructor
    constructor(gameEngine, clientEngine) {
        super(gameEngine, clientEngine);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color( 0);

        this.camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.1, 10 );
        this.camera.position.set( 0, 1.6, 3 );

        this.skipper = 0;

        const room = new THREE.LineSegments(
            new BoxLineGeometry( 6, 6, 6, 10, 10, 10 ),
            new THREE.LineBasicMaterial( { color: 0x808080 } )
        );
        room.geometry.translate( 0, 3, 0 );
        this.scene.add( room );

        this.scene.add( new THREE.HemisphereLight( 0x606060, 0x404040 ) );

        console.log("yay, my renderer!")

        //gameEngine.on('objectAdded', this.joinPlayer.bind(this));
        //this.gameEngine.on('client__slowFrameRate', this.reportSlowness.bind(this));

        const geometry = new THREE.IcosahedronGeometry( 0.1, 3 );
        const paddle1 = new THREE.Mesh( geometry, new THREE.MeshLambertMaterial( { color: Math.random() * 0xffffff } ) );
        paddle1.position.set( 0.5, 1.6, 2 );
        paddle1.name = "paddle1";
        room.add( paddle1);
        const paddle2 = new THREE.Mesh( geometry, new THREE.MeshLambertMaterial( { color: Math.random() * 0xffffff } ) );
        paddle2.position.set( -0.5, 1.6, 2 );
        paddle2.name = "paddle2";
        room.add(paddle2);

    
        this.renderer = new THREE.WebGLRenderer( { antialias: true } );
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.xr.enabled = true;
        document.body.appendChild( this.renderer.domElement );

        //

        document.body.appendChild( VRButton.createButton( this.renderer ) );

        window.addEventListener( 'resize', this.onWindowResize.bind(this) );

        //this.renderer.requestAnimationFrame( render2 );
        //this.renderer.setAnimationLoop( function () { 
            //this.renderer.render( this.scene, this.camera ); 
        //});
        this.renderer.setAnimationLoop( this.render2.bind(this) );
    }

    render2() {
        this.renderer.render( this.scene, this.camera );
    }

    onWindowResize() {

        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize( window.innerWidth, window.innerHeight );

    }

    // setup the 3D scene
    init() {
        return super.init().then(() =>{

            this.frameNum = 0;

            //this.gameEngine.emit('_SLRENDERER_ready');
            //this.isReady = true;
            //});
        });

    }

    draw(t, dt) {
        super.draw(t,dt);
        this.skipper += 1;

        const paddle1 = this.scene.getObjectByName( "paddle1" );
        const paddle2 = this.scene.getObjectByName( "paddle2" );

        let paddles = this.gameEngine.world.queryObjects({ instanceType: Paddle });
        if (paddles.length == 2){
            paddle1.position.x = paddles[0].position.x;
            paddle1.position.y = paddles[0].position.y;
            paddle1.position.z = paddles[0].position.z;
            paddle2.position.x = paddles[1].position.x;
            paddle2.position.y = paddles[1].position.y;
            paddle2.position.z = paddles[1].position.z;

            if(this.skipper % 100 == 0){
                console.log("--------");
                console.log(paddles[0].position);
                console.log(paddles[1].position);
                console.log("--------");
                console.log(paddles[0].position.x);
                console.log(paddles[0].position.y);
                console.log(paddles[0].position.z);
                console.log(paddles[1].position.x);
                console.log(paddles[1].position.y);
                console.log(paddles[1].position.z);

            }
        }


        this.renderer.render( this.scene, this.camera );
    }

}
