/*globals asyncTest, test, Tyrtle, equal, expect, start, raises, ok, module */
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
      throw 'foo';
    }, function (assert) {});
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
    }, function (assert) {
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
    }, function (assert) {
      if (callCount++) {
        ok(false);
      }
    });
  });
  t.run();
});
