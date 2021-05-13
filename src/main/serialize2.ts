import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math";

export class Serializer {
    objects: Serializable[] = [];
    
    serialize(byteLimit: number){
        
        this.objects.forEach(o => o.send = false);
        var prioritized = this.objects.slice().sort((a,b) => b.getPriority() - a.getPriority());
        
        var i = byteLimit-1;
        do {
            const next = prioritized.pop()
            next.send = true;
            i -= next.byteLength+1;
        } while(i > 0);
        
        const buffer = new ArrayBuffer(byteLimit);
        const view = new DataView(buffer);
        var skip = 0;
        var offset = 0;
        this.objects.forEach(o => {
            if(!o.send){
                skip += 1;
                if(skip >= 250) {
                    throw Error("you have registered too many elements in the serializer");
                }
            } else {
                view.setUint8(offset++, skip);
                o.writeOffset = offset;
                o.writeView  = view;
                o.serialize();
                offset += o.byteLength;
            }
        });
        return new Uint8Array(buffer,0,offset);
    }

    deserialize(view: DataView){
        var offset = 0;
        var skip = view.getUint8(offset++);
        
        for(let o of this.objects){
            if(skip == 250) {
                break;
            } else if(skip > 0) {
                skip -= 1;
            } else {
                o.readOffset = offset;
                o.readView  = view;
                o.deserialize();
                offset += o.byteLength;
                skip = view.getUint8(offset++);
            }
        }

    }
}

export abstract class Serializable {
    
    byteLength: number;
    
    writeOffset: number;
    writeView: DataView;
    readOffset: number;
    readView: DataView;
    
    send: boolean;
    
    constructor(serializer: Serializer){
        serializer.objects.push(this);
        this.writeOffset = 0;
        this.serialize();
        this.byteLength = this.writeOffset;
    }
    
    getPriority(){
        return 42 + Math.random();
    } 

    //has to be overwritten by subclasses
    //serialization has to happen using the read*** and write*** methods defined below
    serialize(){}
    deserialize(){}
    
    
    //the read and write methods read from the current offset and then shift
    //the offset by the number of bytes they have read or written
    //this way, we can chain calls to these objects in the subclass
    //without worrying about offsets at all

    writeUint8(x: number){
        if(this.writeView !== undefined){
            this.writeView.setUint8(this.writeOffset, x);
        }
        this.writeOffset += 1;
    }
    readUint8(){
        this.readOffset += 1;
        return this.readView.getInt8(this.readOffset-1);
    }

    writeFloat32(x: number){
        if(this.writeView !== undefined){
            this.writeView.setFloat32(this.writeOffset, x);
        }
        this.writeOffset += 4;
    }
    readFloat32(){
        this.readOffset += 4;
        return this.readView.getFloat32(this.readOffset-4);
    }

    writeVector3(vec: Vector3){
        if(this.writeView !== undefined){
            this.writeView.setFloat32(this.writeOffset+0, vec.x);
            this.writeView.setFloat32(this.writeOffset+4, vec.y);
            this.writeView.setFloat32(this.writeOffset+8, vec.z);
        }
        this.writeOffset += 3*4;
    }
    readVector3(){
        const vec = new Vector3(
            this.readView.getFloat32(this.readOffset+0),
            this.readView.getFloat32(this.readOffset+4),
            this.readView.getFloat32(this.readOffset+8)
        );
        this.readOffset += 4*3;
        return vec;
    
    }

    writeQuaternion(q: Quaternion){
        if(this.writeView !== undefined){
            this.writeView.setFloat32(this.writeOffset+0,  q.x);
            this.writeView.setFloat32(this.writeOffset+4,  q.y);
            this.writeView.setFloat32(this.writeOffset+8,  q.z);
            this.writeView.setFloat32(this.writeOffset+12, q.w);
        }
        this.writeOffset += 4*4;
    }
    readQuaternion(){
        const q = new Quaternion(
            this.readView.getFloat32(this.readOffset+0 ),
            this.readView.getFloat32(this.readOffset+4 ),
            this.readView.getFloat32(this.readOffset+8 ),
            this.readView.getFloat32(this.readOffset+12)
        );
        this.readOffset += 4*4;
        return q;
    }

}