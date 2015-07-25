var bufSize = 1024;
var spec = new Float32Array(bufSize/2 + 1);

export default class SoundManager {
  constructor({ audioContext, timeline }) {
    this.audioContext = audioContext;
    this.timeline = timeline;
    this.inlet = audioContext.createGain();
    this.state = "suspended";
    
    // 追加
    this.processor = audioContext.createScriptProcessor(bufSize, 1, 1);
    
    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = bufSize;
    
    this.processor.onaudioprocess = (ev) => {
      var inbuf0 = ev.inputBuffer.getChannelData(0);
      
      this.analyser.getFloatFrequencyData(spec); //Spectrum Data
      
      // console.log(spec);
      this.router.emit("soundtest", inbuf0);
      this.router.emit("soundtest2", spec);
      
      ev.outputBuffer.getChannelData(0).set(inbuf0);

    };
  }

  start() {
    if (this.state === "suspended") {
      this.inlet.gain.setValueAtTime(0, this.audioContext.currentTime);
      this.inlet.gain.linearRampToValueAtTime(0.5, this.audioContext.currentTime + 0.01);

      this.inlet.connect(this.processor);
      this.inlet.connect(this.analyser);
      this.processor.connect(this.audioContext.destination);

      this.state = "running";
    }

    return this;
  }

  stop() {
    if (this.state === "running") {
      this.inlet.gain.setValueAtTime(0.5, this.audioContext.currentTime);
      this.inlet.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.01);
      this.timeline.nextTick(() => {
        this.inlet.disconnect();
      });
      this.state = "suspended";
    }

    return this;
  }
}
