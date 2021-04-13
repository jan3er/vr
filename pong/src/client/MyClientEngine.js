import { ClientEngine, ThreeVector } from 'lance-gg';
import MyRenderer from './MyRenderer';

export default class MyClientEngine extends ClientEngine {

    // constructor
    constructor(gameEngine, options) {
        super(gameEngine, options, MyRenderer);

        //this.gameEngine.on('client__preStep', this.preStep.bind(this));
        
        console.log("player!")

        this.mouseX = null;
        this.mouseY = null;
        this.skipper = 0;

        this.time = 0;

        this.controller1 = this.renderer.renderer.xr.getController( 0 );
        this.controller2 = this.renderer.renderer.xr.getController( 1 );
        this.lastPos = this.controller1.position;

        document.addEventListener('click', function(e){
            this.sendInput("click");
        }.bind(this), false);
    }

    //updateMouseXY(e) {
        //e.preventDefault();
        //this.mouseX = e.pageX;
        //this.mouseY = e.pageY;
        //this.sendInput("mouse", { x : this.mouseX, y : this.mouseY });
    //}
    
    // execute a single game step.  This is normally called by the Renderer at each draw event.
    step(t, dt, physicsOnly) {
        if (t <= this.time) {
            console.log("back in time!----------");
        }
        this.time = t;

        //this.gameEngine.step(false, t, dt, physicsOnly);

        //console.log(t,dt,physicsOnly);
        //this.skipper += 1;
        //if(this.skipper % 20 == 0) {
            //this.sendInput("c1", { x : this.controller1.position.x,
                                   //y : this.controller1.position.y, 
                                   //z : this.controller1.position.z });

            //const velocity = this.controller1.position.sub(this.lastPos).multiplyScalar(1/dt);
            //this.sendInput("v1", { x : velocity.x,
                                   //y : velocity.y, 
                                   //z : velocity.z });
            ////this.sendInput("v1", { x : 0.1,
                                   ////y : 0.1, 
                                   ////z : 0.1 });
        //}
        //this.lastPos = this.controller1.position.clone();


        super.step(t, dt, physicsOnly);
    }

    /////////////////7


}
