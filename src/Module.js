
var Module,
    Assert = require('Assert'),
    renderer = require('renderer'),
    Test = require('Test'),
    testStatuses = require('testStatuses'),
    util = require('util'),
    PASS = testStatuses.PASS,
    FAIL = testStatuses.FAIL,
    SKIP = testStatuses.SKIP;

/**
 * A testing module. Represents a logical grouping of tests. A Module can have custom **helpers** to assist in
 * setting up and cleaning up the tests, as well as custom assertions which streamline writing the tests.
 *
 * @class
 * @param {String} name The name of this module
 * @param {Function} body The body of this function.
 */
module.exports = Module = function (name, body) {
  if (!body && util.isFunction(name)) {
    throw new Error("Module instantiated without a name.");
  }
  this.name = name;
  this.tests = [];
  this.helpers = {};
  this.amdName = null;
  body.call(this);
};

function addHelper(name, fn) {
  if (!this.helpers[name]) {
    this.helpers[name] = [];
  }
  this.helpers[name].push(fn);
}
function runHelper(helpers, callback, catchBlock) {
  if (helpers && helpers.length) {
    var helper = helpers[0];
    try {
      if (helper.length) {
        helper(function () {
          runHelper(helpers.slice(1), callback, catchBlock);
        });
      } else {
        helper();
        runHelper(helpers.slice(1), callback, catchBlock);
      }
    } catch (e) {
      catchBlock(e);
    }
  } else {
    callback();
  }
}

util.extend(Module.prototype, {
  tests : null,           // array of tests
  tyrtle : null,          // reference to the owner Tyrtle instance
  helpers : null,         // object containing the (before|after)(All)? functions
  extraAssertions : null, // object holding custom assertions. Only populated if required.
  skipAll: false,         // whether all tests in this module should be skipped
  skipMessage: null,      // The skip message for all tests if they should all be skipped.
  passes : 0,             // }
  fails : 0,              // } counts of the test results
  skips : 0,              // }
  errors : 0,             // }
  //////////////////////////
  /**
   * Create a new Test and add it to this Module
   * @param  {String} name A name for this test.
   * @param  {Number=} expectedAssertions The number of assertions this test is expected to run. Optional.
   * @param  {Function} bodyFn The body function for this test.
   * @param  {Function=} assertionsFn If writing an asynchronous test, this is the function where assertions
   *                                  can be executed. For synchronous tests, *do not supply this parameter*.
   * @return {Test} The newly created test.
   */
  test : function (name, expectedAssertions, bodyFn, assertionsFn) {
    var t = new Test(name, expectedAssertions, bodyFn, assertionsFn);
    this.tests.push(t);
    return t;
  },
  /**
   * Add a `before` helper which is executed *before each test* is started.
   * @param  {Function} fn The body of the helper
   */
  before : function (fn) {
    addHelper.call(this, 'before', fn);
  },
  /**
   * Add an `after` helper which is executed *after each test* has finished.
   * @param  {Function} fn The body of the helper
   */
  after : function (fn) {
    addHelper.call(this, 'after', fn);
  },
  /**
   * Add a `beforeAll` helper which is executed *before any tests* have started.
   * @param  {Function} fn The body of the helper
   */
  beforeAll : function (fn) {
    addHelper.call(this, 'beforeAll', fn);
  },
  /**
   * Add an `afterAll` helper which is executed *after all tests* have finished.
   * @param  {Function} fn The body of the helper
   */
  afterAll : function (fn) {
    addHelper.call(this, 'afterAll', fn);
  },
  /**
   * Add per-module (local) assertions to this module. These *may override built-in assertions*. Assertions
   * defined here are not accessible or visible to any other modules.
   *
   * The assertion body should return `true` or `undefined` to indicate a pass. A string will be used as the
   * default error message, and an array allows the assertion to add additional arguments to be substituted
   * into the error message.
   *
   * @example
   * this.addAssertions({
   *    bigNumber : function (subject) {
   *        // returns true or false. No error message for failing assertions.
   *        return subject > 9000;
   *    },
   *    answer : function (subject) {
   *        // returns true or a string. `subject` will be substituted for "{0}"
   *        return subject === 42 || "The supplied value {0} is not the answer to life, & etc.";
   *    }
   *    biggerThan : function (subject, expected) {
   *        // returns true or an array. `expected - subject` is added to the substitution list.
   *        // assert(5).is.biggerThan(7)(); --> "5 is not bigger than 7. It is off by 2"
   *        return subject > expected || ["{0} is not bigger than {1}. It is off by {2}", expected - subject];
   *    }
   * });
   *
   * @param {Object} fnMap A map of {String} AssertionName => {Function} AssertionBody.
   */
  addAssertions : function (fnMap) {
    if (!this.extraAssertions) {
      this.extraAssertions = fnMap;
    } else {
      util.extend(this.extraAssertions, fnMap);
    }
  },
  setAMDName : function (amdName, index) {
    this.amdName = amdName + (typeof index === 'number' ? ':' + index : '');
  },

  skip: function (message) {
    this.skipIf(true, message);
  },

  skipIf: function (condition, message) {
    this.skipAll = !!condition;
    this.skipMessage = condition ? message : null;
  },

  run : function (callback) {
    var runNext,
      i = -1,
      l = this.tests.length,
      j, jl,
      mod = this
    ;
    runNext = function () {
      var test;
      if (++i >= l) { // we've done all the tests, break the loop.
        Assert.clearTemporaryAssertions();
        runHelper(mod.helpers.afterAll, callback, function (e) {
          test = mod.tests[mod.tests.length - 1];
          if (test) {
            switch (test.status) {
              case PASS :
                --mod.passes;
                break;
              case SKIP :
                --mod.skips;
                break;
              case FAIL :
                --mod.fails;
            }
            ++mod.fails;
            if (!test.error) {
              ++mod.errors;
              test.error = e;
            }
          }
          callback();
        });
      } else {
        test = mod.tests[i];
        if (mod.tyrtle.testFilter && test.name !== mod.tyrtle.testFilter) {
          runNext();
        } else {
          mod.runTest(test, function () {
            switch (test.status) {
            case PASS :
              ++mod.passes;
              break;
            case FAIL :
              ++mod.fails;
              if (test.error) {
                ++mod.errors;
              }
              break;
            case SKIP :
              ++mod.skips;
              break;
            }
            renderer.get().afterTest(test, mod, mod.tyrtle);
            util.defer(runNext);
          });
        }
      }
    };

    if (this.skipAll) {
      for (j = 0, jl = mod.tests.length; j < jl; ++j) {
        mod.tests[j].status = SKIP;
        mod.tests[j].statusMessage = "Skipped" + (this.skipMessage ? " because " + this.skipMessage : "");
      }
      mod.skips = jl;
      callback();
    } else {
      Assert.setTemporaryAssertions(this.extraAssertions);
      runHelper(this.helpers.beforeAll, runNext, function (e) {
        // mark all the tests as failed.
        for (j = 0, jl = mod.tests.length; j < jl; ++j) {
          renderer.get().beforeTest(mod.tests[j], mod, mod.tyrtle);
          mod.tests[j].status = FAIL;
          mod.tests[j].error = e;
          renderer.get().afterTest(mod.tests[j], mod, mod.tyrtle);
        }
        // set the group statistics
        mod.passes = mod.skips = 0;
        mod.fails = mod.errors = jl;
        i = l; // <-- so the 'runNext' function thinks it's done all the tests & will call the afterAll.
        runNext();
      });
    }
  },
  /**
   * @protected
   */
  runTest : function (test, callback) {
    var m = this, t = this.tyrtle, go, done;
    renderer.get().beforeTest(test, m, t);
    go = function () {
      test.run(done);
    };
    done = function () {
      runHelper(m.helpers.after, callback, function (e) {
        test.status = FAIL;
        if (!test.error) {
          test.statusMessage = "Error in the after helper. " + e.message;
          test.error = e;
        }
        callback();
      });
    };
    runHelper(this.helpers.before, go, function (e) {
      test.status = FAIL;
      test.statusMessage = "Error in the before helper.";
      test.error = e;
      done();
    });
  },
  /**
   * @protected
   */
  rerunTest : function (test, tyrtle, callback) {
    var mod = this, run, complete;
    switch (test.status) {
    case PASS :
      --this.passes;
      --tyrtle.passes;
      break;
    case FAIL :
      --this.fails;
      --tyrtle.fails;
      if (test.error) {
        delete test.error;
        --this.errors;
        --tyrtle.errors;
      }
      break;
    case SKIP :
      --this.skips;
      --tyrtle.skips;
    }
    run = function () {
      Assert.setTemporaryAssertions(mod.extraAssertions);
      mod.runTest(test, function () {
        var aftersDone = function () {
          switch (test.status) {
          case PASS :
            ++mod.passes;
            ++tyrtle.passes;
            break;
          case FAIL :
            ++mod.fails;
            ++tyrtle.fails;
            if (test.error) {
              ++mod.errors;
              ++tyrtle.errors;
            }
            break;
          case SKIP :
            ++mod.skips;
            ++tyrtle.skips;
          }
          complete();
        };
        runHelper(mod.helpers.afterAll, aftersDone, function (e) {
          test.status = FAIL;
          test.error = e;
          test.statusMessage = "Error in the afterAll helper";
          aftersDone();
        });
      });
    };
    complete = function () {
      var rend = renderer.get();
      rend.afterTest(test, mod, tyrtle);
      rend.afterModule(mod, tyrtle);
      rend.afterRun(tyrtle);
      // cleanUpAssertions();
      if (callback) {
        callback();
      }
    };
    runHelper(this.helpers.beforeAll, run, function (e) {
      test.status = FAIL;
      test.error = e;
      test.statusMessage = "Error in the beforeAll helper";
      ++mod.fails;
      ++tyrtle.fails;
      ++mod.errors;
      ++tyrtle.errors;
      complete();
    });
  },
  /**
   * In order to serialize module we need to remove circular references
   * the module object
   */
  toJSON: function () {
    var copy = {};
    util.extend(copy, this);
    delete copy.tyrtle;
    return copy;
  }
});
