import { ClientEngine } from 'lance-gg';
import MyRenderer from './MyRenderer';

export default class MyClientEngine extends ClientEngine {

    // constructor
    constructor(gameEngine, options) {
        super(gameEngine, options, MyRenderer);

        //this.gameEngine.on('client__preStep', this.preStep.bind(this));
        
        console.log("player!")

        this.mouseX = null;
        this.mouseY = null;


        this.controller1 = this.renderer.renderer.xr.getController( 0 );
        this.controller2 = this.renderer.renderer.xr.getController( 1 );

        document.addEventListener('mousemove', this.updateMouseXY.bind(this), false);
    }

    updateMouseXY(e) {
        e.preventDefault();
        this.mouseX = e.pageX;
        this.mouseY = e.pageY;
        this.sendInput("mouse", { x : this.mouseX, y : this.mouseY });
    }

    step(t, dt, physicsOnly) {
        this.sendInput("c1", { x : this.controller1.position.x,
                               y : this.controller1.position.y, 
                               z : this.controller1.position.z });
        //this.sendInput("c2", { x : this.controller2.position.x,
                               //y : this.controller2.position.y, 
                               //z : this.controller2.position.z });
        super.step(t, dt, physicsOnly);
    }

    /////////////////7


}
