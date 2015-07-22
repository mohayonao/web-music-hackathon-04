export default class RandGen {
  constructor(i1, i2) {
    let z = i1 || 362436069;
    let w = i2 || 521288629;

    function intGenerator() {
      z = (36969 * (z & 65535) + (z >>> 16)) & 0xFFFFFFFF;
      w = (18000 * (w & 65535) + (w >>> 16)) & 0xFFFFFFFF;

      return (((z & 0xFFFF) << 16) | (w & 0xFFFF)) & 0xFFFFFFFF;
    }

    function doubleGenerator() {
      let i = intGenerator() / 4294967296;

      return i < 0 ? 1 + i : i;
    }

    this.intGenerator = intGenerator;
    this.doubleGenerator = doubleGenerator;
    this.random = doubleGenerator;
  }

  static createInstance(seed = Date.now()) {
    return new RandGen(seed, (seed << 16) + (seed >> 16));
  }
}
