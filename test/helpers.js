/*globals asyncTest, test, Tyrtle, equal, expect, start, raises, ok, module */
module('Helpers');

asyncTest("Test helpers are executed properly", function () {
  expect(5);
  var t, helpers, x, y, b = 0, a = 0, ba = 0, aa = 0;
  t = new Tyrtle({
    callback : function () {
      /*jslint newcap: false */
      equal(this.passes, 2, "All tests should have passed.");
      equal(b,  2, "The before should be run twice");
      equal(a,  2, "The after should be run twice");
      equal(ba, 1, "The beforeAll should be run once");
      equal(aa, 1, "The afterAll should be run once");
      start();
      /*jslint newcap: true */
    }
  });

  helpers = {
    before : function () {
      x = 1;
      ++b;
    },
    after : function () {
      ++a;
    },
    beforeAll : function () {
      y = 2;
      ++ba;
    },
    afterAll : function () {
      ++aa;
    }
  };
  t.module("foo", function () {
    this.test("bar", function (assert) {
      assert.that(x).is(1)("X should be one");
      assert.that(y).is(2)("Y should be two");
      x = 2;
    });

    this.before(helpers.before);
    this.after(helpers.after);
    this.beforeAll(helpers.beforeAll);
    this.afterAll(helpers.afterAll);

    this.test("baz", function (assert) {
      assert.that(x).is(1)("The before should have restored X");
    });
  });
  t.run();
});
asyncTest("Errors in the before are reported on each test", function () {
  var t;
  expect(3);
  t = new Tyrtle({
    callback : function () {
      equal(this.passes, 2, "two should have passed.");
      equal(this.fails, 2, "two should have failed.");
      equal(this.errors, 2, "those two failures should have been from errors.");
      start();
    }
  });
  t.module("foo", function () {
    var x = 0;
    this.before(function () {
      if (++x % 2) {
        throw "an error";
      }
    });
    this.test("a", function () {});
    this.test("b", function () {});
    this.test("c", function () {});
    this.test("d", function () {});
  });
  t.run();
});
asyncTest("Errors in the after are reported on each test", function () {
  var t;
  expect(3);
  t = new Tyrtle({
    callback : function () {
      equal(this.passes, 2, "two should have passed.");
      equal(this.fails, 2, "two should have failed.");
      equal(this.errors, 2, "those two failures should have been from errors.");
      start();
    }
  });
  t.module("foo", function () {
    var x = 0;
    this.after(function () {
      if (++x % 2) {
        throw "an error";
      }
    });
    this.test("a", function () {});
    this.test("b", function () {});
    this.test("c", function () {});
    this.test("d", function () {});
  });
  t.run();
});
asyncTest("Errors in the beforeAll are reported on all tests", function () {
  var t, count = 0;
  expect(4);
  t = new Tyrtle({
    callback : function () {
      equal(count, 0, "No tests should have been actually executed");
      equal(this.passes, 0, "none should have passed.");
      equal(this.fails, 4, "all  should have failed.");
      equal(this.errors, 4, "those failures should have been from errors.");
      start();
    }
  });
  t.module("foo", function () {
    /*jslint white: false */
    this.beforeAll(function () {
      throw "an error";
    });
    this.test("a", function () { ++count; });
    this.test("b", function () { ++count; });
    this.test("c", function () { ++count; });
    this.test("d", function () { ++count; });
    /*jslint white: true */
  });
  t.run();
});
// the following tests all share the same test module body
(function () {
  var mod, shouldSkip, shouldPass;

  mod = function () {
    this.afterAll(function () {
      throw "an error";
    });
    this.test("a", function () {});
    this.test("b", function () {});
    this.test("c", function () {});
    this.test("d", function (assert) {
      this.skipIf(shouldSkip);
      assert.that(shouldPass).is.ok()();
    });
  };
  asyncTest("Errors in the afterAll are reported on the last test", function () {
    shouldSkip = false;
    shouldPass = true;
    var t;
    expect(4);
    t = new Tyrtle({
      callback : function () {
        equal(this.passes, 3, "the first three should have passed.");
        equal(this.fails, 1, "the last should have failed.");
        equal(this.errors, 1, "that failure should have been from an error.");
        equal(this.skips, 0, "none should have skipped");
        start();
      }
    });
    t.module("foo", mod);
    t.run();
  });
  asyncTest("Errors in the afterAll are reported on the last test, even when it is skipped", function () {
    shouldSkip = true;
    var t;
    expect(4);
    t = new Tyrtle({
      callback : function () {
        equal(this.passes, 3, "the first three should have passed.");
        equal(this.fails, 1, "the last should have failed.");
        equal(this.errors, 1, "that failure should have been from an error.");
        equal(this.skips, 0, "none should have skipped.");
        start();
      }
    });
    t.module("foo", mod);
    t.run();
  });
  asyncTest("Errors in the afterAll are reported on the last test, even when it has already failed", function () {
    shouldSkip = false;
    shouldPass = false;
    var t;
    expect(4);
    t = new Tyrtle({
      callback : function () {
        equal(this.passes, 3, "the first three should have passed.");
        equal(this.fails, 1, "the last should have failed.");
        equal(this.errors, 1, "that failure should have been from an error.");
        equal(this.skips, 0, "none should have skipped.");
        start();
      }
    });
    t.module("foo", mod);
    t.run();
  });
}());
asyncTest("Errors in the before/afterAll are handled when rerunning tests", function () {
  var t, afterError, beforeError;
  expect(6);
  t = new Tyrtle({
    callback : function () {
      var mod = t.modules[0],
        test = mod.tests[0]
      ;
      equal(t.passes, 1);
      afterError = 'abc';
      mod.rerunTest(test, t, function () {
        equal(t.fails, 1);
        equal(t.errors, 1);
        equal(test.error, 'abc');
        beforeError = 'def';
        mod.rerunTest(test, t, function () {
          equal(t.errors, 1, "Should have errored");
          equal(test.error, 'def');
          start();
        });
      });
    }
  });
  t.module("foo", function () {
    this.test("a", function () {});
    this.afterAll(function () {
      if (afterError) {
        throw afterError;
      }
    });
    this.beforeAll(function () {
      if (beforeError) {
        throw beforeError;
      }
    });
  });
  t.run();
});
test("Helpers can only be added once", function () {
  var t = new Tyrtle();
  raises(function () {
    t.module('a', function () {
      this.before(function () {});
      this.before(function () {});
    });
  }, /already has a/);
  raises(function () {
    t.module('a', function () {
      this.after(function () {});
      this.after(function () {});
    });
  }, /already has a/);
  raises(function () {
    t.module('a', function () {
      this.beforeAll(function () {});
      this.beforeAll(function () {});
    });
  }, /already has a/);
  raises(function () {
    t.module('a', function () {
      this.afterAll(function () {});
      this.afterAll(function () {});
    });
  }, /already has a/);
});

asyncTest("Asynchronous befores and afters", function () {
  var t, testsRun = 0, befores = 0, afters = 0;
  t = new Tyrtle({
    callback : function () {
      equal(befores, 2);
      equal(afters, 2);
      equal(testsRun, 2);
      start();
    }
  });
  t.module("foo", function () {
    this.before(function (callback) {
      befores++;
      callback();
    });
    this.after(function (callback) {
      afters++;
      callback();
    });
    this.test("a", function () {
      testsRun++;
    });
    this.test('b', function () {
      testsRun++;
    });
  });
  t.run();
});

asyncTest("Befores and afters are given callbacks only if asked for", function () {
  var t, sync, async;
  expect(12);
  t = new Tyrtle({
    callback : function () {
      start();
    }
  });
  sync = function () {
    equal(arguments.length, 0, "No arguments should have been passed.");
  };
  async = function (cb) {
    equal(arguments.length, 1, "One argument should have been passed.");
    equal(typeof cb, "function", "The argument should be a function");
    cb();
  };

  t.module("Synchronous helpers", function () {
    this.beforeAll(sync);
    this.before(sync);
    this.after(sync);
    this.afterAll(sync);
    this.test("a", function () {});
  });
  t.module("Asynchronous helpers", function () {
    this.beforeAll(async);
    this.before(async);
    this.after(async);
    this.afterAll(async);
    this.test("a", function () {});
  });
  t.run();
});
