import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math";
import { MyLogger } from "./world";

export class Serializer {
    objects: Serializable[] = [];
    logger: MyLogger;
    
    serialize(byteLimit: number = 100){
        
        //sort objects by priority, keeping only those with positive priority
        var prioritized = this.objects.
            filter(a => a.getPriority() >= 0).
            sort((a,b) => b.getPriority() - a.getPriority());

        
        //mark as many as possible for sending while keeping the byte limit
        this.objects.forEach(o => o._send = false);
        var i = byteLimit-1;
        for(let o of prioritized){
            i -= o._byteLength+1;
            if(i < 0){ 
                break;
            }
            o._send = true;
        }

        //we skip sending some packages. before each package
        //we write down how many were skipped.
        const buffer = new ArrayBuffer(byteLimit);
        const view = new DataView(buffer);
        var skip = 0;
        var offset = 0;
        for(let o of this.objects){
            if(!o._send){
                skip += 1;
                if(skip >= 250) {
                    throw Error("you have registered too many elements in the serializer");
                }
            } else {
                view.setUint8(offset++, skip);
                skip = 0;
                o._writeOffset = offset;
                o._writeView  = view;
                o.serialize();
                offset += o._byteLength;
            }
        }
        view.setUint8(offset++, 250);
        this.logger.log("package length", offset);
        return new Uint8Array(buffer,0,offset);
    }

    deserialize(buffer: ArrayBuffer){
        const view = new DataView(buffer);
        var offset = 0;
        var skip = view.getUint8(offset++);
        
        for(let o of this.objects){
            if(skip == 250) {
                break;
            } else if(skip > 0) {
                skip -= 1;
            } else {
                o._readOffset = offset;
                o._readView  = view;
                o.deserialize();
                offset += o._byteLength;
                skip = view.getUint8(offset++);
            }
        }

    }
}

export abstract class Serializable {
    
    _byteLength: number;
    
    _writeOffset: number;
    _writeView: DataView;
    _readOffset: number;
    _readView: DataView;
    
    _send: boolean;
    
    finalize(serializer: Serializer){
        serializer.objects.push(this);
        this._writeOffset = 0;
        this.serialize();
        this._byteLength = this._writeOffset;
    }
    
    getPriority(){
        return -1;
    } 

    //has to be overwritten by subclasses
    //serialization has to happen using the read*** and write*** methods defined below
    serialize(){}
    deserialize(){}
    update(){}
    
    //the read and write methods read from the current offset and then shift
    //the offset by the number of bytes they have read or written
    //this way, we can chain calls to these objects in the subclass
    //without worrying about offsets at all

    writeUint8(x: number){
        if(this._writeView !== undefined){
            this._writeView.setUint8(this._writeOffset, x);
        }
        this._writeOffset += 1;
    }
    readUint8(){
        this._readOffset += 1;
        return this._readView.getUint8(this._readOffset-1);
    }

    //press a float uniformly distributed into 16 bits, covering a range of maxVal units
    writeFloat16(x: number, maxVal){
        if(this._writeView !== undefined){
            this._writeView.setInt16(this._writeOffset, x*32768/maxVal);
        }
        this._writeOffset += 2;
    }
    readFloat16(maxVal){
        this._readOffset += 2;
        return this._readView.getInt16(this._readOffset-2)/32768*maxVal;
    }

    writeFloat32(x: number){
        if(this._writeView !== undefined){
            this._writeView.setFloat32(this._writeOffset, x);
        }
        this._writeOffset += 4;
    }
    readFloat32(){
        this._readOffset += 4;
        return this._readView.getFloat32(this._readOffset-4);
    }

    writeVector3(vec: Vector3, maxVal){
        this.writeFloat16(vec.x, maxVal);
        this.writeFloat16(vec.y, maxVal);
        this.writeFloat16(vec.z, maxVal);
    }
    readVector3(maxVal){
        return new Vector3(
            this.readFloat16(maxVal),
            this.readFloat16(maxVal),
            this.readFloat16(maxVal),
        );
    }

    writeVector3Vel(vec: Vector3){
        this.writeVector3(vec, 100);
    }
    readVector3Vel(){
        return this.readVector3(100);
    }
    writeVector3Pos(vec: Vector3){
        this.writeVector3(vec, 5);
    }
    readVector3Pos(){
        return this.readVector3(5);
    }

    writeQuaternion(q: Quaternion){
        this.writeFloat16(q.x, 1);
        this.writeFloat16(q.y, 1);
        this.writeFloat16(q.z, 1);
        this.writeFloat16(q.w, 1);
    }
    readQuaternion(){
        return new Quaternion(
            this.readFloat16(1),
            this.readFloat16(1),
            this.readFloat16(1),
            this.readFloat16(1)
        );
    }

}


/////////////////////////////////////////////////////////////////

//class Ball extends Serializable{
    //value1 = 12;
    //value2 = 13;
    //priority;
    
    //constructor(serializer: Serializer){
        //super();
        //this.finalize(serializer);
        //this.priority = serializer.objects.length;
        //this.value1 = this.priority;
        //this.value2 = this.priority;
    //}
    
    //getPriority(){
        //return this.priority;
    //}

    //serialize() {
        //this.writeUint8(this.value1);
        //this.writeUint8(this.value2);
    //}
    //deserialize() {
        //this.value1 = this.readUint8();
        //this.value2 = this.readUint8();
    //}
//}

//const serializer = new Serializer();


//var balls = []
//for(let i = 0; i < 10; i++){
    //balls.push(new Ball(serializer));
//}
//const pkg = serializer.serialize(7);

//for(let b of balls){
    //b.value1 = 0;
//}

//console.log(pkg);
//serializer.deserialize(pkg.buffer);

//for(let b of balls){
    //console.log(b.value1);
//}