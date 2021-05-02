import { Vector3, Quaternion } from "@babylonjs/core/Maths/math";

export abstract class Serializable {
    
    //all children will also be serialized
    children: Serializable[] = [];
    //the maximal length the serialization can reach if everyting is serialized
    _recursiveLength: number;

    //the buffers we write and read from during (de)serialization
    //the _readOffset and _writeOffset is shifted during reading and writing
    //use _writeBuffer.byteCount to get the length of the serialization (without children);
    _writeOffset: number;
    _writeBuffer: ArrayBuffer = null;
    _readOffset: number;
    _readView: DataView = null;

    //has to be implemented by subclasses
    //serialization has to happen using the read*** and write*** methods defined below
    abstract serialize() : void;
    abstract deserialize() : void;

    //only serialize somethig if it has changed since the last time it was transmitted
    hasChanged(time: number){
        return true;
    }

    //the read and write methods read from the current offset and then shift
    //the offset by the number of bytes they have read or written
    //this way, we can chain calls to these objects in the subclass
    //without worrying about offsets at all

    writeUint8(x: number){
        if(this._writeBuffer !== null){
            new DataView(this._writeBuffer).setUint8(this._writeOffset, x);
        }
        this._writeOffset += 1;
    }
    readUint8(){
        this._readOffset += 1;
        return this._readView.getInt8(this._readOffset-1);
    }

    writeFloat32(x: number){
        if(this._writeBuffer !== null){
            new DataView(this._writeBuffer).setFloat32(this._writeOffset, x);
        }
        this._writeOffset += 4;
    }
    readFloat32(){
        this._readOffset += 4;
        return this._readView.getFloat32(this._readOffset-4);
    }

    writeVector3(vec: Vector3){
        if(this._writeBuffer !== null){
            const view = new DataView(this._writeBuffer);
            view.setFloat32(this._writeOffset+0, vec.x);
            view.setFloat32(this._writeOffset+4, vec.y);
            view.setFloat32(this._writeOffset+8, vec.z);
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
        if(this._writeBuffer !== null){
            const view = new DataView(this._writeBuffer);
            view.setFloat32(this._writeOffset+0,  q.x);
            view.setFloat32(this._writeOffset+4,  q.y);
            view.setFloat32(this._writeOffset+8,  q.z);
            view.setFloat32(this._writeOffset+12, q.w);
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

    //needs to be run before it can be used in the network
    //infers the buffer lengths and offsets by serializing it once
    _init(){
        //initialize children
        this.children.forEach(c => c._init());

        //do one dry run without a buffer to determine the length of the serialized object
        this._writeOffset = 0;
        this.serialize();

        //now create a buffer of appropriate size and serialize for real
        this._writeBuffer = new ArrayBuffer(this._writeOffset);
        this._writeOffset = 0;
        this.serialize();

        //in order to do some sanity check, we also do one deserialization
        //we just write back the data we read before
        this._readOffset = 0;
        this._readView = new DataView(this._writeBuffer)
        this.deserialize();

        //check if the lengths match, otherwise source of nasty subtle bugs
        if(this._writeOffset !== this._readOffset) {
            throw new Error("we are serializing and deserializing something of different length");
        }

        //reserve 1 byte space for "startByte"
        this._recursiveLength = 1 + this._writeBuffer.byteLength;
        this.children.forEach(c => this._recursiveLength += c._recursiveLength);
    }

    //serializes the object and all its children
    serializeRecursive(time){

        //initialize it if it has not been initialized
        if(this._writeBuffer === null){
            this._init();
        }

        const buffer = new ArrayBuffer(this._recursiveLength);
        const length = this._serializeRecursive(time, new Uint8Array(buffer), 0);
        return new Uint8Array(buffer,0,length);
    }
    _serializeRecursive(time: number, view: Uint8Array, offset: number){
    
        //0 means send nothing, 1 means only send me, 2 means me and my children
        var startBit = 0;
        if(this.hasChanged(time)){
            startBit = 1;
        }
        this.children.forEach(c => {
            if(c.hasChanged(time)) {
                startBit = 2;
            }
        });
        
        view[offset++] = startBit;
        if(startBit >= 1){
            this._writeOffset = 0;
            this.serialize()
            view.set(new Uint8Array(this._writeBuffer), offset);
            offset += this._writeBuffer.byteLength;
        }
        if(startBit >= 2){
            this.children.forEach(c => {
                offset = c._serializeRecursive(time, view, offset);
            });
        }
        return offset;
    }

    //deserializes the object and all its children
    deserializeRecursive(buffer: ArrayBuffer, offset: number = 0): number {

        //initialize it if it has not been initialized
        if(this._writeBuffer === null){
            this._init();
        }

        //zero means send nothing, 1 means only send me, 2 means me and my children        
        const startBit = new DataView(buffer).getUint8(offset++);
        if(startBit >= 1){
            this._readOffset = offset;
            this._readView = new DataView(buffer);
            this.deserialize();
            offset += this._writeBuffer.byteLength;
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


export class Foo extends Serializable{
    vec1 = new Vector3(0,0,0);
    vec2 = new Vector3(0,0,0);
    vec3 = new Vector3(0,0,0);
    q = new Quaternion(0,0,0);
    serialize() {
        this.writeVector3(this.vec1);
        this.writeVector3(this.vec2);
        this.writeVector3(this.vec3);
        this.writeQuaternion(this.q);
    }
    deserialize() {
        this.vec1 = this.readVector3();
        this.vec2 = this.readVector3();
        this.vec3= this.readVector3();
        this.q = this.readQuaternion();
    }
    hasChanged(time: number){
        return time > 0;
    }
}
export class Ball extends Serializable{
    children = [new Foo()];
    value1 = 12;
    value2 = 13;

    serialize() {
        this.writeUint8(this.value1);
        this.writeUint8(this.value2);
    }
    deserialize() {
        this.value1 = this.readUint8();
        this.value2 = this.readUint8();
    }
    hasChanged(time: number){
        return time > 0;;
    }
}

var foo1 = new Foo();
foo1.vec1 = new Vector3(4,5,6);
foo1.q = new Quaternion(4,5,6,8);

console.log(foo1.serializeRecursive(1).byteLength);

var foo2 = new Foo();
foo2.deserializeRecursive(foo1.serializeRecursive(1).buffer);
console.log(foo2.vec1);
console.log(foo2.q);

// var ball1 = new Ball();
// var ball2 = new Ball();
// ball1.init();
// ball2.init();
// ball1.value1 = 99;
// ball1.value2 = 99;
// const view = ball1.serializeRecursive(1);
// console.log(view);

// const buffer = view.buffer;

// ball2.deserializeRecursive(buffer);

// console.log(new Uint8Array(ball2.serializeRecursive(1)));

//notes///////////////////////////////

// https://en.wikipedia.org/wiki/Comparison_of_data-serialization_formats
// https://github.com/msgpack/msgpack-javascript

//the number and type of children is assumed to be known on the other side
//or even better, it is fixed at construction time and cannot change
//the same holds for the length of the encoding of an object
//we need the length of an object. this can be infered by serealizing it once at construction time and then saving the number


//one byte for the following possible states
// zeroth bit: me and all children are sending or not sending
// first bit: overwrites whether I am sending or not
// fist+i bit: overwrites whether child i sends or not
// since the number 

//later on, if we have large number of objects, we can nest them in trees with a branching of seven
//this way we can super cheaply determine which send and which dont

///////////////////////////////////
