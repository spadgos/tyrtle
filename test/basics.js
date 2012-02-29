/*globals asyncTest, test, Tyrtle, equal, expect, start, raises, ok, module */
module('Basics');

asyncTest("Basic empty tests are reported as success", function () {
  expect(4);

  var t = new Tyrtle({
    callback : function () {
      equal(this.passes, 1, "The test should have been marked as a pass.");
      equal(this.fails, 0, "No test should have failed");
      equal(this.errors, 0, "No errors");
      equal(this.skips, 0, "None skipped");
      start();
    }
  });
  t.module("tests", function () {
    this.test("empty", function () {});
  });
  t.run();
});
asyncTest("Tests can be skipped always and conditionally", function () {
  expect(4);

  var t = new Tyrtle({
    callback : function () {
      equal(this.passes, 1, "The test should have been marked as a pass.");
      equal(this.fails, 0, "No test should have failed");
      equal(this.errors, 0, "No errors");
      equal(this.skips, 2, "None skipped");
      start();
    }
  });
  t.module("tests", function () {
    this.test("skip", function () {
      this.skip();
    });
    this.test("skip if", function () {
      this.skipIf(true);
    });
    this.test("skip if false", function () {
      this.skipIf(false);
    });
  });
  t.run();
});
asyncTest("Errors are reported as failures", function () {
  expect(4);

  var t = new Tyrtle({
    callback : function () {
      equal(this.passes, 0, "Should not have passed");
      equal(this.fails, 1, "It should have failed");
      equal(this.errors, 1, "It should be marked as an error");
      equal(this.skips, 0, "None skipped");
      start();
    }
  });
  t.module("tests", function () {
    this.test("erroring", function () {
      var x = 0;
      x();
    });
  });
  t.run();
});
asyncTest("Tests can be re-run", function () {
  var x = 0, t;
  t = new Tyrtle({
    callback : function () {
      equal(t.fails, 1, "Test should have failed first time");
      equal(t.passes, 0, "Test should not have passed first time");
      x = 1;
      t.modules[0].rerunTest(t.modules[0].tests[0], t, function () {
        equal(t.fails, 0, "Test should not have failed second time");
        equal(t.passes, 1, "Test should have passed second time");
        start();
      });
    }
  });
  t.module("foo", function () {
    this.test("a", function (assert) {
      assert.that(x).is(1)();
    });
  });
  t.run();
});
asyncTest("Tests which had errors are reset after rerunning", function () {
  var t, skip = false;
  t = new Tyrtle({
    callback : function () {
      var mod = t.modules[0],
        test = mod.tests[0]
      ;
      equal(t.fails, 1, "test should have failed");
      equal(t.errors, 1, "Test should have been marked as errored");
      ok(test.error, "Test should have an error");
      skip = true;
      mod.rerunTest(test, t, function () {
        equal(t.fails, 0, "Failure should have cleared");
        equal(t.errors, 0, "Error should have cleared");
        equal(t.skips,  1);
        ok(!test.error, "No error should be on the test");
        skip = false;
        mod.rerunTest(test, t, function () {
          equal(t.fails, 1, "Test should fail again");
          equal(t.errors, 1, "Test should hav errored again");
          ok(test.error, "Test should store an error");
          start();
        });
      });
    }
  });
  t.module("foo", function () {
    this.test('a', function () {
      this.skipIf(skip);
      throw 'abc';
    });
  });
  t.run();
});
asyncTest("Different methods of instantiating a Module", function () {
  var t, m;
  expect(1);

  t = new Tyrtle({
    callback : function () {
      equal(t.passes, 3);
      start();
    }
  });
  m = Tyrtle.module("mod 1", function () {
    this.test("abc", function () {});
  });
  t.module(m);

  t.module({
    "mod 2" : function () {
      this.test("def", function () {});
    },
    "mod 3" : function () {
      this.test("ghi", function () {});
    }
  });
  t.run();
});
asyncTest("Module filtering", function () {
  expect(1);
  var t = new Tyrtle({
    callback : function () {
      equal(t.passes, 1);
      start();
    },
    modFilter : "foo"
  });
  t.module("foo", function () {
    this.test("run this", function () {});
  });
  t.module("bar", function () {
    this.test("skipped", function () {});
  });
  t.module("foo bar", function () {
    this.test("skipped", function () {});
  });
  t.run();
});
asyncTest("Test filtering", function () {
  expect(1);
  var t = new Tyrtle({
    callback : function () {
      equal(t.passes, 1);
      start();
    },
    testFilter : "run this"
  });
  t.module("foo", function () {
    this.test("run this", function () {});
  });
  t.module("bar", function () {
    this.test("skipped", function () {});
  });
  t.module("foo bar", function () {
    this.test("skipped", function () {});
  });
  t.run();
});
