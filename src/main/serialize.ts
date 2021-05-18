import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math";
import { Game } from "./game";

export class Serializer {

    game: Game;
    
    constructor(game: Game){
        this.game = game;
    }
    
    //when serializable objects are created, they are added to this array
    objects: Serializable[] = [];
    
    counter = 0;
    
    //when ever the package has size smaller then MIN_MESSAGE_LENGTH_BYTES
    //serialize another object and all objects that should be sent along (sendTogetherWith value)
    static readonly MIN_MESSAGE_LENGTH_BYTES = 50;
    //is this much is sent, throw an error
    //happens if a serialization is too large or there are too many values in the sendTogetherWith array
    static readonly MAX_MESSAGE_LENGTH_BYTES = 2000;

    //has to be called before serialization
    //determines which objects to be sent
    //while maintaining the package size constraints
    prioritize(){
        this.objects.forEach(o => o._sendMe = false);

        //TODO: play with this
        //this.counter++;
        //if(this.counter % 20 != 0) {
            //return
        //}
        
        //count the length of the suff we serialize so far
        var byteLength = 0;

        //sort objects by priority, keeping only those with positive priority
        var prioritized = this.objects.
            filter(a => a.getPriority() >= 0).
            sort((a,b) => b.getPriority() - a.getPriority());

        
        for(let o of prioritized){
            if (byteLength >= Serializer.MIN_MESSAGE_LENGTH_BYTES){
                break;
            }
            byteLength += o._markForSending();
        }
        
        
        var num = 0;
        this.objects.forEach(o => num += o._sendMe ? 1 : 0);

        this.game.logger.log("-num objects to serialize", num);
        
    }
    
    serialize(){
        //determine packages to be sent
        this.prioritize();
        
        //compute length of package and allocate memory
        var byteLength = 1;
        this.objects.filter(o => o._sendMe).forEach(o => byteLength += 1 + o._byteLength);
        const buffer = new ArrayBuffer(byteLength);
        
        if(byteLength > Serializer.MAX_MESSAGE_LENGTH_BYTES){
            throw Error("trying to send a too large package")
        }

        //the packages are encoded as follows:
        //  - first comes how many objects are skipped in the range [0,...,249]
        //  - then comes a serialized object
        //  - this is repeated until all prioritized objects are serialized
        //  - in the end, comes the value 250
        var skip = 0;
        var offset = 0;
        const view = new DataView(buffer);
        for(let o of this.objects){
            if(!o._sendMe){
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
    
    //length of the serialized object. determined by a dry run of the overwritten serialize() function at construction time
    _byteLength: number;
    
    //buffer and offset for writing and reading
    _writeOffset: number;
    _writeView: DataView;
    _readOffset: number;
    _readView: DataView;

    //register object with serializer and determine length by doing one dry run
    finalize(serializer: Serializer){
        serializer.objects.push(this);
        this._writeOffset = 0;
        this.serialize();
        this._byteLength = this._writeOffset;
    }
    
    ////////////////////////////////////////////////////////////
   
    //guarantee that when an object is send then all objects in this array are sent along as well.
    //this is needed because we get weired glitches if we send touching objects in separate packages
    sendTogetherWith: Serializable[] = [];

    //used by the serializer
    _sendMe: boolean;

    //mark the object and everything that should be sent together with it for sending
    //returns the number of bytes of the objects that have been marked and were previously unmarked
    _markForSending(seen: Set<Serializable> = new Set()) {
        //run a depth first search to determine connected component
        if(seen.has(this)){
            return 0;
        }
        seen.add(this);
        
        var length = this._sendMe ? 0 : this._byteLength;
        this._sendMe = true;
        
        for(let o of this.sendTogetherWith){
            length += o._markForSending(seen);
        }
        return length;
    }

    
    ////////////////////////////////////////////////////////////
    
    //only send objects if they have non-negative priority
    //determines the urgency to send information about this object to the peer
    getPriority(){
        return -1;
    } 

    //has to be overwritten by subclasses
    //serialization should happen using the read*** and write*** methods defined below
    serialize(){}
    deserialize(){}
    update(){}

    ////////////////////////////////////////////////////////////
    
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
    writeFloat64(x: number){
        if(this._writeView !== undefined){
            this._writeView.setFloat64(this._writeOffset, x);
        }
        this._writeOffset += 8;
    }
    readFloat64(){
        this._readOffset += 8;
        return this._readView.getFloat64(this._readOffset-8);
    }

    //this method does not cause any problems, so rounding seems to be okay.
    //writeVector3special(vec: Vector3){
        //vec.x = Math.ceil(vec.x * 10000) / 10000;
        //vec.x = Math.fround(vec.x);
        //vec.y = Math.fround(vec.y);
        //vec.z = Math.fround(vec.z);
        //this.writeFloat32(vec.x);
        //this.writeFloat32(vec.y);
        //this.writeFloat32(vec.z);
        //return vec;
    //}
    static readonly blub = 10000;
    writeVector3(vec: Vector3){
        //vec.x = Math.floor(vec.x * Serializable.blub) / Serializable.blub;
        //vec.y = Math.floor(vec.y * Serializable.blub) / Serializable.blub;
        //vec.z = Math.floor(vec.z * Serializable.blub) / Serializable.blub;
        vec.x = Math.fround(vec.x);
        vec.y = Math.fround(vec.y);
        vec.z = Math.fround(vec.z);
        this.writeFloat32(vec.x);
        this.writeFloat32(vec.y);
        this.writeFloat32(vec.z);
        return vec;
    }
    readVector3(){
        return new Vector3(
            this.readFloat32(),
            this.readFloat32(),
            this.readFloat32(),
        );
    }

    writeQuaternion(q: Quaternion){
        //q.x = Math.floor(q.x * Serializable.blub) / Serializable.blub;
        //q.y = Math.floor(q.y * Serializable.blub) / Serializable.blub;
        //q.z = Math.floor(q.z * Serializable.blub) / Serializable.blub;
        //q.w = Math.floor(q.w * Serializable.blub) / Serializable.blub;
        q.x = Math.fround(q.x);
        q.y = Math.fround(q.y);
        q.z = Math.fround(q.z);
        q.w = Math.fround(q.w);
        this.writeFloat32(q.x);
        this.writeFloat32(q.y);
        this.writeFloat32(q.z);
        this.writeFloat32(q.w);
        return q;
    }
    readQuaternion(){
        return new Quaternion(
            this.readFloat32(),
            this.readFloat32(),
            this.readFloat32(),
            this.readFloat32()
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