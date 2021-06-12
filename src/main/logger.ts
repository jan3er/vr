//prints given key, value pairs on the sceen

import { TextBlock, AdvancedDynamicTexture, StackPanel, Control } from "@babylonjs/gui";
import { Game } from "./game";

//sorts them alphabetically by key before printing
export class Logger{
    static readonly MAX_KEYS = 15;
    texts: TextBlock[] = [];
    dict: any = {};
    game: Game;
    constructor(game: Game){
        this.game = game;

        //https://www.babylonjs.com.cn/how_to/gui.html
        var advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI", true, this.game.scene);
        var panel = new StackPanel();   
        
        panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER; 
        //panel.height = 0.7;
        //panel.width = 0.7;
        advancedTexture.addControl(panel);

        for(let i=0; i < Logger.MAX_KEYS; i++){
            var text = new TextBlock();
            text.text = "";
            text.color = "white";
            text.fontSize = 24;
            text.width = "500px";
            text.height = "30px";
            text.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
            panel.addControl(text);
            //advancedTexture.addControl(text);
            this.texts.push(text);
        }
    }
    
    log(key, value){
        //return; //TODO, disables debug output
        this.dict[key] = value;
        var i = 0;
        for (let key of Object.keys(this.dict).sort()){
            this.texts[i].text = "" + key + ": " + this.dict[key];
            if(++i >= Logger.MAX_KEYS){
                break;
            }
        }
    }
}