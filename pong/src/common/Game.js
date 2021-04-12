import { GameEngine, BaseTypes, ThreeVector, DynamicObject, PhysicalObject3D, KeyboardControls, CannonPhysicsEngine, SimplePhysicsEngine } from 'lance-gg';

//A LOT OF CODE COPIED FROM HERE
//https://github.com/lance-gg/sprocketleague/blob/master/src/common/Ball.js
export class Paddle extends PhysicalObject3D {

    constructor(gameEngine, options, props ) {
        super(gameEngine, null, props);
        this.class = Paddle;
    }

    //gradual synchronization of posiiton and velocity. todo: play around to get good values
    get bending() {
        return { velocity: { percent: 0.9 },
                 position: { percent: 0.9 }};
    }

    onAddToWorld(gameEngine) {
        console.log("add paddle to world!");
        this.gameEngine = gameEngine;
        this.physicsObj = gameEngine.physicsEngine.addSphere(1,1);
        this.physicsObj.position.set(this.position.x, this.position.y, this.position.z);
    }
    syncTo(other) {
        super.syncTo(other);
    }
}


var step = 0;

export default class Game extends GameEngine {

    constructor(options) {
        super(options);
        this.physicsEngine = new CannonPhysicsEngine({ gameEngine: this });
        this.physicsEngine.world.gravity.set(0, 0, 0);

        // common code
        this.on('postStep', this.gameLogic.bind(this));

        // server-only code
        this.on('server__init', this.serverSideInit.bind(this));
        this.on('server__playerJoined', this.serverSidePlayerJoined.bind(this));
        this.on('server__playerDisconnected', this.serverSidePlayerDisconnected.bind(this));

        // client-only code
        this.on('client__rendererReady', this.clientSideInit.bind(this));
        this.on('client__draw', this.clientSideDraw.bind(this));
    }

    registerClasses(serializer) {
        serializer.registerClass(Paddle);
        //serializer.registerClass(Controller);
        //serializer.registerClass(Ball);
    }

    gameLogic() {

        step += 1;
        if(step % 100 == 0){
            let paddles = this.world.queryObjects({ instanceType: Paddle });
            if (paddles.length == 2){
                console.log("position in gameLogic():");
                console.log(paddles[0].physicsObj.position);
                console.log(paddles[1].physicsObj.position);
            }
        }
    }

    processInput(inputData, playerId) {
        super.processInput(inputData, playerId);

        // get the player paddle tied to the player socket
        let playerPaddle = this.world.queryObject({ playerId });
        if (playerPaddle) {
            if (inputData.input === 'c1') {
                playerPaddle.physicsObj.position.x = inputData.options.x;
                playerPaddle.physicsObj.position.y = inputData.options.y;
                playerPaddle.physicsObj.position.z = inputData.options.z;
            }
        }
        else {
            console.log("no paddle with id", playerId);
        }
    }

    //
    // SERVER ONLY CODE
    //
    serverSideInit() {
        // create the paddles and the ball
        this.addObjectToWorld(new Paddle(this, null, { playerId: 0, position: new ThreeVector(1,2,3) }));
        this.addObjectToWorld(new Paddle(this, null, { playerId: 0, position: new ThreeVector(4,5,6) }));
        //this.addObjectToWorld(new Paddle3D(this, null));
        //let paddles = this.world.queryObjects({ instanceType: Paddle });
        //console.log(paddles);

        //this.addObjectToWorld(new Ball(this, null, {
            //position: new TwoVector(WIDTH /2, HEIGHT / 2),
            //velocity: new TwoVector(2, 2)
        //}));
    }

    // attach newly connected player to next available paddle
    serverSidePlayerJoined(ev) {
        let paddles = this.world.queryObjects({ instanceType: Paddle });
        if (paddles[0].playerId === 0) {
            paddles[0].playerId = ev.playerId;
        } else if (paddles[1].playerId === 0) {
            paddles[1].playerId = ev.playerId;
        }
    }

    serverSidePlayerDisconnected(ev) {
        let paddles = this.world.queryObjects({ instanceType: Paddle });
        if (paddles[0].playerId === ev.playerId) {
            paddles[0].playerId = 0;
        } else if (paddles[1].playerId === ev.playerId) {
            paddles[1].playerId = 0;
        }
    }

    //
    // CLIENT ONLY CODE
    //
    clientSideInit() {
        //this.controls = new KeyboardControls(this.renderer.clientEngine);
        //this.controls.bindKey('up', 'up', { repeat: true } );
        //this.controls.bindKey('down', 'down', { repeat: true } );
    }

    clientSideDraw() {

        //function updateEl(el, obj) {
            //let health = obj.health>0?obj.health:15;
            //el.style.top = obj.position.y + 10 + 'px';
            //el.style.left = obj.position.x + 'px';
            //el.style.background = `#ff${health.toString(16)}f${health.toString(16)}f`;
        //}

        //let paddles = this.world.queryObjects({ instanceType: Paddle });
        //let ball = this.world.queryObject({ instanceType: Ball });
        //if (!ball || paddles.length !== 2) return;
        //updateEl(document.querySelector('.ball'), ball);
        //updateEl(document.querySelector('.paddle1'), paddles[0]);
        //updateEl(document.querySelector('.paddle2'), paddles[1]);
    }
}
