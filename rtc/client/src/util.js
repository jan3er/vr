// const a=new AudioContext() // browsers limit the number of concurrent audio contexts, so you better re-use'em

// function beep(vol, freq, duration){
//   const v=a.createOscillator()
//   const u=a.createGain()
//   v.connect(u)
//   v.frequency.value=freq
//   v.type="square"
//   u.connect(a.destination)
//   u.gain.value=vol*0.01
//   v.start(a.currentTime)
//   v.stop(a.currentTime+duration*0.001)
// }

export function beep1() {
    //beep(100,440,1);
}

export function beep2() {
    //beep(100,440,10);
}
export function beep3() {
    //beep(100,220,10);
}