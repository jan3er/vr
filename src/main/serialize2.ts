import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math";

export class Serializer {
    objects: Serializable[] = [];
    
    serialize(byteLimit: number = 1000){
        this.objects.forEach(o => o._send = false);
        //var prioritized = this.objects.
            //filter(a => a.getPriority() > 0).
            //sort((a,b) => a.getPriority() - b.getPriority());

        //var i = byteLimit-1;
        //TODO: somehow broken unless we send everything
        for(let o of this.objects){
            //i -= o._byteLength+1;
            o._send = true;

        }
        //while (prioritized.length != 0){
            //const next = prioritized.pop()
            ////if(i < 0){ 
                ////break;
            ////}
            //next._send = true;
        //} 

        //this.objects.forEach(o => o._send = true);
        
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
                o._writeOffset = offset;
                o._writeView  = view;
                o.serialize();
                offset += o._byteLength;
            }
        }
        view.setUint8(offset++, 250);
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
        return this._readView.getInt8(this._readOffset-1);
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

    writeVector3(vec: Vector3){
        if(this._writeView !== undefined){
            this._writeView.setFloat32(this._writeOffset+0, vec.x);
            this._writeView.setFloat32(this._writeOffset+4, vec.y);
            this._writeView.setFloat32(this._writeOffset+8, vec.z);
        }
        this._writeOffset += 3*4;
    }
    readVector3(){
        const vec = new Vector3(
            this._readView.getFloat32(this._readOffset+0),
            this._readView.getFloat32(this._readOffset+4),
            this._readView.getFloat32(this._readOffset+8)
        );
        this._readOffset += 4*3;
        return vec;
    
    }

    writeQuaternion(q: Quaternion){
        if(this._writeView !== undefined){
            this._writeView.setFloat32(this._writeOffset+0,  q.x);
            this._writeView.setFloat32(this._writeOffset+4,  q.y);
            this._writeView.setFloat32(this._writeOffset+8,  q.z);
            this._writeView.setFloat32(this._writeOffset+12, q.w);
        }
        this._writeOffset += 4*4;
    }
    readQuaternion(){
        const q = new Quaternion(
            this._readView.getFloat32(this._readOffset+0 ),
            this._readView.getFloat32(this._readOffset+4 ),
            this._readView.getFloat32(this._readOffset+8 ),
            this._readView.getFloat32(this._readOffset+12)
        );
        this._readOffset += 4*4;
        return q;
    }

}


/////////////////////////////////////////////////////////////////

//export class Foo extends Serializable{
    //vec1 = new Vector3(0,0,0);
    //vec2 = new Vector3(0,0,0);
    //vec3 = new Vector3(0,0,0);
    //q = new Quaternion(0,0,0);
    //serialize() {
        //this.writeVector3(this.vec1);
        //this.writeVector3(this.vec2);
        //this.writeVector3(this.vec3);
        //this.writeQuaternion(this.q);
    //}
    //deserialize() {
        //this.vec1 = this.readVector3();
        //this.vec2 = this.readVector3();
        //this.vec3= this.readVector3();
        //this.q = this.readQuaternion();
    //}
//}
//export class Ball extends Serializable{
    //value1 = 12;
    //value2 = 13;

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
//const pkg = serializer.serialize(5);

//for(let b of balls){
    //b.value1 = 0;
//}

//console.log(pkg);
//const view = new DataView(pkg.buffer);
//serializer.deserialize(view);

//for(let b of balls){
    //console.log(b.value1);
//}