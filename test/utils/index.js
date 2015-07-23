import assert from "power-assert";
import sinon from "sinon";
import utils from "../../src/utils";

let UNDEFINED;

function closeTo(expected, actual, delta) {
  return Math.abs(expected - actual) <= delta;
}

describe("utils", () => {
  describe("appendIfNotExists(list: any[], value: any): void", () => {
    it("works", () => {
      let list = [];

      utils.appendIfNotExists(list, 1);
      assert.deepEqual(list, [ 1 ]);

      utils.appendIfNotExists(list, 2);
      assert.deepEqual(list, [ 1, 2 ]);

      utils.appendIfNotExists(list, 1);
      assert.deepEqual(list, [ 1, 2 ]);
    });
  });
  describe("constrain(value: number, minValue: number, maxValue: number): number", () => {
    it("works", () => {
      assert(utils.constrain(5, 10, 20) === 10);
      assert(utils.constrain(15, 10, 20) === 15);
      assert(utils.constrain(25, 10, 20) === 20);
    });
  });
  describe("dbamp(db: number): number", () => {
    it("works", () => {
      assert(utils.dbamp(0) === 1);
      assert(closeTo(utils.dbamp(-1), 0.89125093813375, 1e-6));
      assert(closeTo(utils.dbamp(-2), 0.79432823472428, 1e-6));
      assert(closeTo(utils.dbamp(-3), 0.70794578438414, 1e-6));
    });
  });
  describe("debounce(func: function, wait: number): function", (done) => {
    it("works", () => {
      let spy = sinon.spy();
      let func = utils.debounce(spy, 10);

      setTimeout(() => {
        func(0);
        func(1);
        func(2);
      }, 0);

      setTimeout(() => {
        func(3);
        func(4);
        func(5);
      }, 50);

      setTimeout(() => {
        assert(spy.callCount === 2);
        assert(spy.args[0][0] === 2);
        assert(spy.args[1][0] === 5);
        done();
      }, 100);
    });
  });
  describe("defaults(value: any, defaultValue: any): any", () => {
    it("works", () => {
      assert(utils.defaults(0, 1) === 0);
      assert(utils.defaults(UNDEFINED, 0) === 0);
    });
  });
  describe("finedetune(fine: number): number", () => {
    it("works", () => {
      assert(utils.finedetune(0) === 0);
      assert(closeTo(utils.finedetune(60), 100, 1));
      assert(closeTo(utils.finedetune(123), 200, 1));
      assert(closeTo(utils.finedetune(189), 300, 1));
      assert(closeTo(utils.finedetune(260), 400, 1));
      assert(closeTo(utils.finedetune(335), 500, 1));
      assert(closeTo(utils.finedetune(414), 600, 1));
      assert(closeTo(utils.finedetune(498), 700, 1));
      assert(closeTo(utils.finedetune(587), 800, 1));
      assert(closeTo(utils.finedetune(682), 900, 1));
      assert(closeTo(utils.finedetune(782), 1000, 1));
      assert(closeTo(utils.finedetune(888), 1100, 1));
      assert(closeTo(utils.finedetune(1000), 1200, 1e-6));
      assert(closeTo(utils.finedetune(-1000), -1200, 1e-6));
    });
  });
  describe("getItem(object: object, keys: string[]): any", () => {
    it("works", () => {
      let object = { a: { b: { c: 0 } } };

      assert(utils.getItem(object, []) === object);
      assert(utils.getItem(object, [ "a" ]) === object.a);
      assert(utils.getItem(object, [ "a", "b" ]) === object.a.b);
      assert(utils.getItem(object, [ "a", "b", "c" ]) === object.a.b.c);
      assert(utils.getItem(object, [ "a", "b", "c", "d" ]) === null);
      assert(utils.getItem(object, [ "a", "c", "d", "c" ]) === null);
    });
  });
  describe("linexp(value: number, inMin, inMax, outMin, outMax): number", () => {
    it("works", () => {
      assert(closeTo(utils.linexp(0.1, 0.01, 1, 100, 8000), 148.93891324884, 1e-6));
      assert(closeTo(utils.linexp(0.3, 0.01, 1, 100, 8000), 360.96974634425, 1e-6));
      assert(closeTo(utils.linexp(0.5, 0.01, 1, 100, 8000), 874.84966106965, 1e-6));
      assert(closeTo(utils.linexp(0.7, 0.01, 1, 100, 8000), 2120.2938396499, 1e-6));
      assert(closeTo(utils.linexp(0.9, 0.01, 1, 100, 8000), 5138.7640259933, 1e-6));
    });
  });
  describe("linlin(value: number, inMin, inMax, outMin, outMax): number", () => {
    it("works", () => {
      assert(closeTo(utils.linlin(0.1, 0.01, 1, 100, 8000), 818.1818181818, 1e-6));
      assert(closeTo(utils.linlin(0.3, 0.01, 1, 100, 8000), 2414.141414141, 1e-6));
      assert(closeTo(utils.linlin(0.5, 0.01, 1, 100, 8000), 4010.101010101, 1e-6));
      assert(closeTo(utils.linlin(0.7, 0.01, 1, 100, 8000), 5606.060606060, 1e-6));
      assert(closeTo(utils.linlin(0.9, 0.01, 1, 100, 8000), 7202.020202020, 1e-6));
    });
  });
  describe("midicps(midi: number): number", () => {
    it("works", () => {
      assert(closeTo(utils.midicps(60), 261.625565300, 1e-6));
      assert(closeTo(utils.midicps(62), 293.664767917, 1e-6));
      assert(closeTo(utils.midicps(64), 329.627556912, 1e-6));
      assert(closeTo(utils.midicps(65), 349.228231433, 1e-6));
      assert(closeTo(utils.midicps(67), 391.995435981, 1e-6));
      assert(closeTo(utils.midicps(69), 440.000000000, 1e-6));
      assert(closeTo(utils.midicps(71), 493.883301256, 1e-6));
    });
  });
  describe("once(func: function): any", () => {
    it("works", () => {
      let spy = sinon.spy((a, b) => a + b);
      let func = utils.once(spy);

      assert(func(10, 20) === 30);
      assert(func(20, 30) === 30);
      assert(func(30, 40) === 30);
      assert(spy.callCount === 1);
    });
  });
  describe("removeItem(object: object, keys: string[]): any", () => {
    it("works", () => {
      let object = { a: { b: { c: 0 } } };

      assert(utils.removeItem(object, []) === object);
      assert(utils.removeItem(object, [ "a", "b", "c" ]) === 0);
      assert.deepEqual(object, { a: { b: {} } });
      assert(utils.removeItem(object, [ "a" ]));
      assert.deepEqual(object, {});
      assert(utils.getItem(object, [ "a", "b", "c", "d" ]) === null);
      assert(utils.getItem(object, [ "a", "c", "d", "c" ]) === null);
    });
  });
  describe("removeIfExists(list: any[], value: any): void", () => {
    it("works", () => {
      let list = [ 1, 2 ];

      utils.removeIfExists(list, 1);
      assert.deepEqual(list, [ 2 ]);

      utils.removeIfExists(list, 0);
      assert.deepEqual(list, [ 2 ]);

      utils.removeIfExists(list, 2);
      assert.deepEqual(list, []);
    });
  });
  describe("setItem(object: object, value: any, keys: string[]): any", () => {
    it("works", () => {
      let object = { a: { b: { c: 0 } } };

      utils.setItem(object, 100, [ "a", "b", "c" ]);
      assert.deepEqual(object, { a: { b: { c: 100 } } });

      utils.setItem(object, 200, [ "a", "b" ]);
      assert.deepEqual(object, { a: { b: 200 } });

      utils.setItem(object, 300, [ "a", "b", "c" ]);
      assert.deepEqual(object, { a: { b: 200 } });

      utils.setItem(object, 400, []);
      assert.deepEqual(object, { a: { b: 200 } });
    });
  });
});
