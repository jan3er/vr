import * as THREE from './three/build/three.module.js';

import { BoxLineGeometry } from './three/examples/jsm/geometries/BoxLineGeometry.js';
import { VRButton } from './three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from './three/examples/jsm/webxr/XRControllerModelFactory.js';
import { FlyControls } from './three/examples/jsm/controls/FlyControls.js';
import { PointerLockControls } from './three/examples/jsm/controls/PointerLockControls.js';
import { FirstPersonControls } from './three/examples/jsm/controls/FirstPersonControls.js';

let camera, controls, scene, renderer;
let controller1, controller2;
let controllerGrip1, controllerGrip2;

let room;

let count = 0;
const radius = 0.08;
let normal = new THREE.Vector3();
const relativeVelocity = new THREE.Vector3();

const clock = new THREE.Clock();

init();
animate();

function init() {

    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0);

    camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.1, 10 );
    camera.position.set( 0, 1.6, 3 );

    room = new THREE.LineSegments(
        new BoxLineGeometry( 6, 6, 6, 10, 10, 10 ),
        new THREE.LineBasicMaterial( { color: 0x808080 } )
    );
    room.geometry.translate( 0, 3, 0 );
    scene.add( room );

    //scene.add( new THREE.HemisphereLight( 0x606060, 0x404040 ) );

    //const light = new THREE.DirectionalLight( 0xffffff );
    //light.position.set( 1, 1, 1 ).normalize();
    //scene.add( light );
    //
    const cube     = new THREE.BoxGeometry( 5*radius, 0.2*radius, 0.2*radius );
    const geometry = new THREE.IcosahedronGeometry( radius, 3 );

    const light1 = new THREE.PointLight( 0xffffff, 0.1, 100 );
    light1.name = "mylight1";
    light1.position.set( 0, 1.6, 3 );
    scene.add( light1 );
    const light2 = new THREE.PointLight( 0xffffff, 0.1, 100 );
    light2.name = "mylight2";
    light2.position.set( 0, 1.6, 3 );
    scene.add( light2 );

    //const sunMaterial = new THREE.MeshPhongMaterial({emissive: 0x00FF00});
    //const sunMesh = new THREE.Mesh(cube, sunMaterial);
    //light2.add(sunMesh);


    var geo = new THREE.PlaneBufferGeometry(2000, 2000, 8, 8);
    var mat = new THREE.MeshPhongMaterial({ color: 0xaaaaaa, side: THREE.DoubleSide });
    var plane = new THREE.Mesh(geo, mat);
    plane.rotateX( - Math.PI / 2);
    scene.add( plane );




    for ( let i = 0; i < 20; i ++ ) {

        const object = new THREE.Mesh( geometry, new THREE.MeshLambertMaterial( { color: Math.random() * 0xffffff } ) );

        object.position.x = Math.random() * 4 - 2;
        object.position.y = Math.random() * 4;
        object.position.z = Math.random() * 4 - 2;

        object.userData.velocity = new THREE.Vector3();
        object.userData.velocity.x = Math.random() * 0.01 - 0.005;
        object.userData.velocity.y = Math.random() * 0.01 - 0.005;
        object.userData.velocity.z = Math.random() * 0.01 - 0.005;

        //const sunMaterial = new THREE.MeshPhongMaterial({emissive: 0x00FF00});
        //const sunMesh = new THREE.Mesh(cube, sunMaterial);
        //object.add(sunMesh);

        //const light3 = new THREE.PointLight( 0xffffff, 0.05, 100 );
        //object.add( light3 );


        room.add( object );

    }

    //

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.xr.enabled = true;
    document.body.appendChild( renderer.domElement );

    //

    document.body.appendChild( VRButton.createButton( renderer ) );

    // controllers
    
    controls = new FirstPersonControls( camera, renderer.domElement );
    //controls.movementSpeed = 100;
    //controls.autoForward = true;
    //controls.lookAt(2,3,4);

    function onSelectStart() {

        this.userData.isSelecting = true;

    }

    function onSelectEnd() {

        this.userData.isSelecting = false;

    }

    controller1 = renderer.xr.getController( 0 );
    controller1.addEventListener( 'selectstart', onSelectStart );
    controller1.addEventListener( 'selectend', onSelectEnd );
    controller1.addEventListener( 'connected', function ( event ) {

        this.add( buildController( event.data ) );

    } );
    controller1.addEventListener( 'disconnected', function () {

        this.remove( this.children[ 0 ] );

    } );
    scene.add( controller1 );

    controller2 = renderer.xr.getController( 1 );
    controller2.addEventListener( 'selectstart', onSelectStart );
    controller2.addEventListener( 'selectend', onSelectEnd );
    controller2.addEventListener( 'connected', function ( event ) {

        this.add( buildController( event.data ) );

    } );
    controller2.addEventListener( 'disconnected', function () {

        this.remove( this.children[ 0 ] );

    } );
    scene.add( controller2 );

    // The XRControllerModelFactory will automatically fetch controller models
    // that match what the user is holding as closely as possible. The models
    // should be attached to the object returned from getControllerGrip in
    // order to match the orientation of the held device.

    const controllerModelFactory = new XRControllerModelFactory();

    controllerGrip1 = renderer.xr.getControllerGrip( 0 );
    controllerGrip1.add( controllerModelFactory.createControllerModel( controllerGrip1 ) );
    scene.add( controllerGrip1 );

    controllerGrip2 = renderer.xr.getControllerGrip( 1 );
    controllerGrip2.add( controllerModelFactory.createControllerModel( controllerGrip2 ) );
    scene.add( controllerGrip2 );

    //

    window.addEventListener( 'resize', onWindowResize );

}

function buildController( data ) {

    let geometry, material;

    switch ( data.targetRayMode ) {

        case 'tracked-pointer':

            geometry = new THREE.BufferGeometry();
            geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( [ 0, 0, 0, 0, 0, - 1 ], 3 ) );
            geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( [ 0.5, 0.5, 0.5, 0, 0, 0 ], 3 ) );

            material = new THREE.LineBasicMaterial( { vertexColors: true, blending: THREE.AdditiveBlending } );

            return new THREE.Line( geometry, material );

        case 'gaze':

            geometry = new THREE.RingGeometry( 0.02, 0.04, 32 ).translate( 0, 0, - 1 );
            material = new THREE.MeshBasicMaterial( { opacity: 0.5, transparent: true } );
            return new THREE.Mesh( geometry, material );

    }

}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}

function handleController( controller ) {

    if ( controller.userData.isSelecting ) {

        const object = room.children[ count ++ ];

        object.position.copy( controller.position );
        object.userData.velocity.x = ( Math.random() - 0.5 ) * 3;
        object.userData.velocity.y = ( Math.random() - 0.5 ) * 3;
        object.userData.velocity.z = ( Math.random() - 9 );
        object.userData.velocity.applyQuaternion( controller.quaternion );

        if ( count === room.children.length ) count = 0;

    }

}

//

function animate() {

    renderer.setAnimationLoop( render );

}

function render() {

    handleController( controller1 );
    handleController( controller2 );


    //

    const delta = clock.getDelta();

    const range = 3 - radius;

    //

    //controls.update( 5*delta );
    //var light1 = scene.getObjectByName( "mylight1" );
    //light1.position.x = camera.position.x;
    //light1.position.y = camera.position.y;
    //light1.position.z = camera.position.z-1;

    controls.update( 5*delta );
    var light1 = scene.getObjectByName( "mylight1" );
    light1.position.x = controller1.position.x;
    light1.position.y = controller1.position.y;
    light1.position.z = controller1.position.z;
    var light2 = scene.getObjectByName( "mylight2" );
    light2.position.x = controller2.position.x;
    light2.position.y = controller2.position.y;
    light2.position.z = controller2.position.z;


    for ( let i = 0; i < room.children.length; i ++ ) {

        const object = room.children[ i ];

        object.position.x += object.userData.velocity.x * delta;
        object.position.y += object.userData.velocity.y * delta;
        object.position.z += object.userData.velocity.z * delta;

        // keep objects inside room

        if ( object.position.x < - range || object.position.x > range ) {

            object.position.x = THREE.MathUtils.clamp( object.position.x, - range, range );
            object.userData.velocity.x = - object.userData.velocity.x;

        }

        if ( object.position.y < radius || object.position.y > 6 ) {

            object.position.y = Math.max( object.position.y, radius );

            //object.userData.velocity.x *= 0.98;
            //object.userData.velocity.y = - object.userData.velocity.y * 0.8;
            //object.userData.velocity.z *= 0.98;
            
            object.userData.velocity.x *= 0.9;
            object.userData.velocity.y *= 0.9;
            object.userData.velocity.z *= 0.9;

        }

        if ( object.position.z < - range || object.position.z > range ) {

            object.position.z = THREE.MathUtils.clamp( object.position.z, - range, range );
            object.userData.velocity.z = - object.userData.velocity.z;

        }

        for ( let j = i + 1; j < room.children.length; j ++ ) {

            const object2 = room.children[ j ];

            normal.copy( object.position ).sub( object2.position );

            const distance = normal.length();

            if ( distance < 2 * radius ) {

                normal.multiplyScalar( 0.5 * distance - radius );

                object.position.sub( normal );
                object2.position.add( normal );

                normal.normalize();

                relativeVelocity.copy( object.userData.velocity ).sub( object2.userData.velocity );

                normal = normal.multiplyScalar( relativeVelocity.dot( normal ) );

                object.userData.velocity.sub( normal );
                object2.userData.velocity.add( normal );

            }

        }

        normal.copy( object.position ).sub( controller1.position );
        var distance = normal.length();
        normal.normalize();
        normal.multiplyScalar(1/distance*distance);

        object.position.x -= normal.x * delta;
        object.position.y -= normal.y * delta;
        object.position.z -= normal.z * delta;

        normal.copy( object.position ).sub( controller2.position );
        var distance = normal.length();
        normal.normalize();
        normal.multiplyScalar(1/distance*distance);

        object.position.x -= normal.x * delta;
        object.position.y -= normal.y * delta;
        object.position.z -= normal.z * delta;


        //object.userData.velocity.x -= normal.x * delta;
        //object.userData.velocity.y -= normal.y * delta;
        //object.userData.velocity.z -= normal.z * delta;
        
        //object.userData.velocity.y -= 9.8 * delta;

    }


    renderer.render( scene, camera );

}
