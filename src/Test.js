
var Test,
    Assert         = require('Assert'),
    AssertionError = require('AssertionError'),
    root           = require('root'),
    SkipMe         = require('SkipMe'),
    testStatuses   = require('testStatuses'),
    util           = require('util'),
    PASS = testStatuses.PASS,
    SKIP = testStatuses.SKIP,
    FAIL = testStatuses.FAIL;

module.exports = Test = function Test (name, expectedAssertions, body, asyncFn) {
  if (typeof expectedAssertions !== 'number') {
    asyncFn = body;
    body = expectedAssertions;
  } else {
    this.expect(expectedAssertions);
  }
  if (typeof name !== 'string') {
    throw new Error('Test instantiated without a name.');
  }
  this.name = name;
  this.body = body;
  this.asyncFn = asyncFn;
};

util.extend(Test.prototype, {
  /** @type {Status} one of PASS, FAIL, SKIP or null */
  status : null,
  statusMessage: '',
  runTime : -1,
  error : null,       // If an error (not an AssertionError is thrown it is stored here)
  exception : null,   // Any thrown error is stored here (including AssertionErrors)
  asyncFn : null,
  expectedAssertions : -1,
  assertionCount: 0,
  ///////////////
  /**
   *  Skip this test.
   *  @param {String=} reason A reason why this test is being skipped.
   */
  skip : function (reason) {
    throw new SkipMe(reason);
  },
  /**
   *  Conditionally skip this test.
   *  @example
   *  this.skipIf(typeof window === 'undefined', "Test only applies to browsers")
   *  @param {Boolean} condition
   *  @param {String=} reason A reason why this test is being skipped.
   */
  skipIf : function (condition, reason) {
    if (condition) {
      this.skip(reason);
    }
  },
  /**
   *  Expect an exact number of assertions that should be run by this test.
   *  @param {Number} numAssertions
   */
  expect : function (numAssertions) {
    this.expectedAssertions = numAssertions;
  },
  /**
   *  @protected
   */
  run : function (callback) {
    var start, success, handleError,
        callbackExecuted = false, test = this;

    success = function () {
      test.runTime = new Date() - start;
      test.status = PASS;
      test.statusMessage = 'Passed';
      callback(test);
    };
    handleError = function (e) {
      var message = (e && e.message) || String(e);
      if (e instanceof SkipMe) {
        test.status = SKIP;
        test.statusMessage = "Skipped" + (e.message ? " because " + e.message : "");
      } else {
        test.status = FAIL;
        test.statusMessage = "Failed" + (message ? ": " + message : "");
        test.exception = e;
        if (!(e instanceof AssertionError)) {
          test.error = e;
        }
      }
      callback(test);
    };
    try {
      Assert.startTest();
      start = new Date();
      if (this.asyncFn) {
        // actually executes the asyncTest here.
        this.body(function (variables) {
          if (!callbackExecuted) {
            callbackExecuted = true;
            runAssertions(test, {
              assertions: function () {
                test.asyncFn.call(variables || {}, Assert.assert);
              },
              success: success,
              failure: handleError
            });
          }
        });
      } else {
        runAssertions(test, {
          assertions: function () {
            test.body(Assert.assert);
          },
          success: success,
          failure: handleError
        });
      }
    } catch (e) {
      handleError(e);
    }
  }
});

function runAssertions (test, options) {
  var assertionsFn = options.assertions,
      successFn    = options.success,
      onError      = options.failure;

  try {
    assertionsFn();
    Assert.endTest(test);
    successFn();
  } catch (e) {
    onError(e);
  }
}

