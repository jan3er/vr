import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math";

export abstract class Serializable {
    
    //all children will also be serialized
    //it is important that this cannot be changed after the constructor!
    children: Serializable[] = [];

    //the maximal length the serialization can reach if everyting is serialized
    _recursiveLength: number;

    //the buffers we write and read from during (de)serialization
    //the _readOffset and _writeOffset is shifted during reading and writing
    //use _writeBuffer.byteCount to get the length of the serialization (without children);
    _writeOffset: number;
    _writeArrayBuffer: ArrayBuffer = null;
    _readOffset: number;
    _readDataView: DataView = null;

    //has to be overwritten by subclasses
    //serialization has to happen using the read*** and write*** methods defined below
    serialize(){}
    deserialize(){}

    //only include me in the serialization if this function returns true
    //overwrite this method in your subclass
    shouldSend(){
        return true;
    }

    //the read and write methods read from the current offset and then shift
    //the offset by the number of bytes they have read or written
    //this way, we can chain calls to these objects in the subclass
    //without worrying about offsets at all

    writeUint8(x: number){
        if(this._writeArrayBuffer !== null){
            new DataView(this._writeArrayBuffer).setUint8(this._writeOffset, x);
        }
        this._writeOffset += 1;
    }
    readUint8(){
        this._readOffset += 1;
        return this._readDataView.getInt8(this._readOffset-1);
    }

    writeFloat32(x: number){
        if(this._writeArrayBuffer !== null){
            new DataView(this._writeArrayBuffer).setFloat32(this._writeOffset, x);
        }
        this._writeOffset += 4;
    }
    readFloat32(){
        this._readOffset += 4;
        return this._readDataView.getFloat32(this._readOffset-4);
    }

    writeVector3(vec: Vector3){
        if(this._writeArrayBuffer !== null){
            const view = new DataView(this._writeArrayBuffer);
            view.setFloat32(this._writeOffset+0, vec.x);
            view.setFloat32(this._writeOffset+4, vec.y);
            view.setFloat32(this._writeOffset+8, vec.z);
        }
        this._writeOffset += 3*4;
    }
    readVector3(){
        const vec = new Vector3(
            this._readDataView.getFloat32(this._readOffset+0),
            this._readDataView.getFloat32(this._readOffset+4),
            this._readDataView.getFloat32(this._readOffset+8)
        );
        this._readOffset += 4*3;
        return vec;
    
    }

    writeQuaternion(q: Quaternion){
        if(this._writeArrayBuffer !== null){
            const view = new DataView(this._writeArrayBuffer);
            view.setFloat32(this._writeOffset+0,  q.x);
            view.setFloat32(this._writeOffset+4,  q.y);
            view.setFloat32(this._writeOffset+8,  q.z);
            view.setFloat32(this._writeOffset+12, q.w);
        }
        this._writeOffset += 4*4;
    }
    readQuaternion(){
        const q = new Quaternion(
            this._readDataView.getFloat32(this._readOffset+0 ),
            this._readDataView.getFloat32(this._readOffset+4 ),
            this._readDataView.getFloat32(this._readOffset+8 ),
            this._readDataView.getFloat32(this._readOffset+12)
        );
        this._readOffset += 4*4;
        return q;
    }

    //needs to be run before it can be used in the network
    //infers the buffer lengths and offsets by serializing it once
    _init(){
        //initialize children
        this.children.forEach(c => c._init());

        //do one dry run without a buffer to determine the length of the serialized object
        this._writeOffset = 0;
        this.serialize();

        //now create a buffer of appropriate size and serialize for real
        this._writeArrayBuffer = new ArrayBuffer(this._writeOffset);
        this._writeOffset = 0;
        this.serialize();

        //in order to do some sanity check, we also do one deserialization
        //we just write back the data we read before
        this._readOffset = 0;
        this._readDataView = new DataView(this._writeArrayBuffer)
        this.deserialize();

        //check if the lengths match, otherwise source of nasty subtle bugs
        // if(this._writeOffset !== this._readOffset) {
        //     throw new Error("we are serializing and deserializing something of different length");
        // }

        //reserve 1 byte space for "startByte"
        this._recursiveLength = 1 + this._writeArrayBuffer.byteLength;
        this.children.forEach(c => this._recursiveLength += c._recursiveLength);
    }

    //serializes the object and all its children
    serializeRecursive(){

        //initialize it if it has not been initialized
        if(this._writeArrayBuffer === null){
            this._init();
        }

        const buffer = new ArrayBuffer(this._recursiveLength);
        const length = this._serializeRecursive(new Uint8Array(buffer), 0);
        return new Uint8Array(buffer,0,length);
    }
    _serializeRecursive(view: Uint8Array, offset: number){
    
        //0 means send nothing, 1 means only send me, 2 means me and my children
        var startBit = 0;
        if(this.shouldSend()){
            startBit = 1;
        }
        this.children.forEach(c => {
            if(c.shouldSend()) {
                startBit = 2;
            }
        });
        
        view[offset++] = startBit;
        if(startBit >= 1){
            this._writeOffset = 0;
            this.serialize()
            view.set(new Uint8Array(this._writeArrayBuffer), offset);
            offset += this._writeArrayBuffer.byteLength;
        }
        if(startBit >= 2){
            this.children.forEach(c => {
                offset = c._serializeRecursive(view, offset);
            });
        }
        return offset;
    }

    //deserializes the object and all its children
    deserializeRecursive(buffer: ArrayBuffer, offset: number = 0): number {

        //initialize it if it has not been initialized
        if(this._writeArrayBuffer === null){
            this._init();
        }

        //zero means send nothing, 1 means only send me, 2 means me and my children        
        const startBit = new DataView(buffer).getUint8(offset++);
        if(startBit >= 1){
            this._readOffset = offset;
            this._readDataView = new DataView(buffer);
            this.deserialize();
            offset += this._writeArrayBuffer.byteLength;
        }
        if(startBit >= 2){
            this.children.forEach(c => {
                offset = c.deserializeRecursive(buffer, offset);
            });
        }
        return offset;
    }

}

///////////////////////////////////////////////////////


// export class Foo extends Serializable{
//     vec1 = new Vector3(0,0,0);
//     vec2 = new Vector3(0,0,0);
//     vec3 = new Vector3(0,0,0);
//     q = new Quaternion(0,0,0);
//     serialize() {
//         this.writeVector3(this.vec1);
//         this.writeVector3(this.vec2);
//         this.writeVector3(this.vec3);
//         this.writeQuaternion(this.q);
//     }
//     deserialize() {
//         this.vec1 = this.readVector3();
//         this.vec2 = this.readVector3();
//         this.vec3= this.readVector3();
//         this.q = this.readQuaternion();
//     }
// }
// export class Ball extends Serializable{
//     children = [new Foo()];
//     value1 = 12;
//     value2 = 13;

//     serialize() {
//         this.writeUint8(this.value1);
//         this.writeUint8(this.value2);
//     }
//     deserialize() {
//         this.value1 = this.readUint8();
//         this.value2 = this.readUint8();
//     }
// }

//instead of only three possible states for the start byte, we could distinguish bit by bit
// zeroth bit: me and all children are sending or not sending
// first bit: overwrites whether I am sending or not
// fist+i bit: overwrites whether child i sends or not

