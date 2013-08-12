/*globals asyncTest, Tyrtle, equal, expect, start, ok, module */
module('Asynchronous tests');

asyncTest("Asynchronous tests", function () {
  var t;
  expect(2);
  t = new Tyrtle({
    callback : function () {
      start();
    }
  });
  t.module("foo", function () {
    this.test("a", function (callback) {
      setTimeout(function () {
        callback({
          x : 1,
          y : 2
        });
      }, 1);
    }, function (assert) {
      equal(this.x, 1);
      equal(this.y, 2);
      assert.that(this.x).is(1)("the values should have been attached to the current scope");
      assert.that(this.y).is(2)("more than one value should be able to be passed.");
    });
  });
  t.run();
});
asyncTest("Errors in asynchronous tests", function () {
  var t;
  expect(2);
  t = new Tyrtle({
    callback : function () {
      equal(t.fails, 1, "Test should be failed");
      equal(t.errors, 1, "Test should be errored");
      start();
    }
  });
  t.module("foo", function () {
    this.test("a", function (callback) {
      if (true) {
        throw 'foo';
      }
      callback();
    }, function (/*assert*/) {});
  });
  t.run();
});
asyncTest("Errors in the asynchronous callback", function () {
  var t;
  expect(2);
  t = new Tyrtle({
    callback : function () {
      equal(t.fails, 1);
      equal(t.errors, 1);
      start();
    }
  });
  t.module('foo', function () {
    this.test('a', function (callback) {
      callback();
    }, function (/*assert*/) {
      throw 'abc';
    });
  });
  t.run();
});
asyncTest("Callback function called more than once", function () {
  var t, callCount = 0;
  t = new Tyrtle({
    callback: function () {
      start();
    }
  });
  t.module('foo', function () {
    this.test('a', function (callback) {
      callback();
      callback();
    }, function (/*assert*/) {
      ok(callCount++ === 0, 'This should only be called once');
    });
  });
  t.run();
});

asyncTest('Tyrtle can add timeouts to asynchronous tests', function () {
  var t, callCount = 0;

  t = new Tyrtle({
    callback: function () {
      equal(callCount, 0);
      equal(t.fails, 1);
      equal(t.errors, 1); // timeout is an error
      start();
    }
  });

  t.setTimeout(50);

  t.module('foo', function () {
    this.test('a', function (callback) {
      setTimeout(callback, 100);
    }, function (assert) {
      callCount = 1;
      // this test should still fail because it took too long
      assert.that(2 + 2).is(4)();
    });
  });
  t.run();
});

Tyrtle.util.each(['beforeAll', 'before', 'after', 'afterAll'], function (helperType) {
  asyncTest('Tyrtle timeouts apply to ' + helperType + ' helpers', function () {
    var t, callCount = 0;

    t = new Tyrtle({
      callback: function () {
        equal(callCount, helperType.indexOf('after') > -1 ? 1 : 0);
        equal(t.fails, 1);
        equal(t.errors, 1); // timeout is an error
        start();
      }
    });

    t.setTimeout(50);

    t.module('foo', function () {
      this[helperType](function (callback) {
        setTimeout(callback, 100);
      });
      this.test('a', function (assert) {
        callCount = 1;
        // this test should still fail because the before took too long
        assert.that(2 + 2).is(4)();
      });
    });
    t.run();
  });
});

// todo: setTimeout in helpers

asyncTest('Timeouts can be varied by modules', function () {
  var t;

  t = new Tyrtle({
    callback: function () {
      equal(t.fails, 1);
      equal(t.errors, 1); // timeout is an error
      equal(t.passes, 1);
      start();
    }
  });

  t.setTimeout(100);

  t.module('shorter', function () {
    this.setTimeout(50);
    this.test('failing', function (cb) {
      setTimeout(cb, 75); // should fail
    }, function () {});
  });

  t.module('longer', function () {
    this.setTimeout(100);
    this.test('passing', function (cb) {
      setTimeout(cb, 75); // should pass
    }, function () {});
  });
  t.run();
});

asyncTest('Timeouts can be varied by tests', function () {
  var t;

  t = new Tyrtle({
    callback: function () {
      equal(t.fails, 1);
      equal(t.errors, 1); // timeout is an error
      equal(t.passes, 1);
      start();
    }
  });

  t.module('shorter', function () {
    this.test('failing', function (cb) {
      this.setTimeout(50);
      setTimeout(cb, 75); // should fail
    }, function () {});
  });

  t.module('longer', function () {
    this.test('passing', function (cb) {
      this.setTimeout(100);
      setTimeout(cb, 75); // should pass
    }, function () {});
  });
  t.run();
});
