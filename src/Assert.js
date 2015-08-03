var Assert,
    AssertionError = require('AssertionError'),
    assertions,
    currentTestAssertions = 0,
    internalAssertionCount = 0,
    unexecutedAssertions = 0,
    originalUnexecutedAssertions,
    bodies,
    oldGlobals,
    temporaryAssertions = {},
    temporaryAssertionsNegated = {},
    assertionsNegated = {},
    slice = Array.prototype.slice,
    util = require('util'),
    root = require('root');

module.exports = Assert = {
  // this is the actual function passed to the tests
  assert: assert,

  /**
   * Reset counters so that we can test for the expected number of assertions, leaking globals and unexecuted assertions
   */
  startTest: function () {
    currentTestAssertions = 0;
    originalUnexecutedAssertions = unexecutedAssertions;
    oldGlobals = util.getKeys(root);
  },

  /**
   * Run post-test assertions: expected # of assertions, unexecuted assertions and leaking globals.
   * @param  {Test} test
   */
  endTest: function (test) {
    if (test.expectedAssertions !== -1) {
      assert
        .that(currentTestAssertions)
        .is(test.expectedAssertions)
        .since('This test should have executed the expected number of assertions');
    }
    test.assertionCount = currentTestAssertions;

    if (unexecutedAssertions !== originalUnexecutedAssertions) {
      throw new AssertionError('This test defines assertions which are never executed');
    }

    util.each(util.getKeys(root), function (newGlobal) {
      if (oldGlobals.indexOf(newGlobal) < 0) {
        throw new AssertionError('Test introduced new global variable "{0}"', [newGlobal]);
      }
    });
  },

  /**
   *  Global assertions, added to all modules of all instances of Tyrtle
   *  @param {Object} newAssertions A map of AssertionName => AssertionFunction
   */
  addAssertions : function (newAssertions) {
    util.each(newAssertions, function (fn, name) {
      assertions[name] = function () {
        return build.apply(null, [fn, "", this.subject].concat(slice.apply(arguments)));
      };
      assertionsNegated[name] = function () {
        return invert(assertions[name].apply(this, arguments));
      };
    });
  },
  /**
   * Check whether an assertion exists.
   * @param  {String} assertionName The name of an assertion to check
   * @return {Boolean}
   */
  hasAssertion : function (assertionName) {
    return assertions.hasOwnProperty(assertionName);
  },
  /**
   * Remove an assertion.
   * @param  {String} assertionName The name of an assertions to remove
   */
  removeAssertion : function (assertionName) {
    delete assertions[assertionName];
    delete assertionsNegated[assertionName];
  },

  setTemporaryAssertions: function (newAssertions) {
    Assert.clearTemporaryAssertions();

    util.each(newAssertions, function (fn, key) {
      temporaryAssertions[key] = function () {
        return build.apply(null, [fn, "", this.subject].concat(slice.apply(arguments)));
      };
      temporaryAssertionsNegated[key] = function () {
        return invert(build.apply(null, [fn, "", this.subject].concat(slice.apply(arguments))));
      };
    });
  },

  clearTemporaryAssertions: function () {
    var key;
    for (key in temporaryAssertions) {
      if (temporaryAssertions.hasOwnProperty(key)) {
        delete temporaryAssertions[key];
      }
    }
  }
};


bodies = {
  ok: function (a) {
    return !!a;
  },
  ofType: function (a, e) {
    var type = typeof a;
//#JSCOVERAGE_IF typeof /a/ === 'function'
    // webkit (incorrectly?) reports regexes as functions. Normalize this to 'object'.
    if (type === 'function' && a.constructor === RegExp) {
      type = 'object';
    }
//#JSCOVERAGE_ENDIF
    switch (e.toLowerCase()) {
    case 'array' :
      return util.isArray(a);
    case 'date' :
      return util.isDate(a);
    case 'regexp' :
      return util.isRegExp(a);
    default :
      return type === e;
    }
  },
  matches: function (a, m) {
    return m.test(a);
  },
  startsWith: function (a, n) {
    if (typeof a !== 'string') {
      return [
        "Actual value {0} is of type {2}, therefore it can not start with {1} as expected",
        typeof a
      ];
    }
    return a.length >= n.length && n === a.substr(0, n.length);
  },
  endsWith: function (a, n) {
    if (typeof a !== 'string') {
      return [
        "Actual value {0} is of type {2}, therefore it can not end with {1} as expected",
        typeof a
      ];
    }
    return a.length >= n.length && n === a.substr(-n.length);
  },
  contains: function (a, n) {
    return a.indexOf(n) !== -1 || (typeof a === 'string' ? "%1 substring {1}" : "%1 element {1}");
  },
  willThrow: function (f, expectedError) {
    try {
      f();
      return "The function unexpectedly threw no errors";
    } catch (e) {
      if (expectedError) {
        var noMatch = [
          "An error {2} was thrown, but it did not match the expected error {1}",
          e.message || e
        ];
        if (typeof expectedError === 'string') {
          if (expectedError !== (e.message || e)) {
            return noMatch;
          }
        } else if (util.isRegExp(expectedError)) {
          if (!expectedError.test(e.message || e)) {
            return [
              "An error {2} was thrown, but it did not match the expected error {1}",
              e.message || e
            ];
          }
        } else if (typeof expectedError === 'function' && !(e instanceof expectedError)) {
          return [
            "An error {2} was thrown, but it was not an instance of {1} as expected",
            e
          ];
        }
        return true;
      } else {
        return true;
      }
    }
  },
  wontThrow: function (f) {
    try {
      f();
      return true;
    } catch (e) {
      return ["%1 {1}", e];
    }
  },
  called: function (subject, numTimes) {
    var cc;
    if (subject && typeof subject.callCount === 'function') {
      cc = subject.callCount();
      if (numTimes != null) {
        return cc === numTimes || ["%1", cc];
      } else {
        return cc > 0 || "Function was not called";
      }
    } else {
      return "Object is not a Myrtle handle";
    }
  },
  is: function (a, e) {
    if (a !== a) { // NaN
      return e !== e;
    } else {
      return a === e;
    }
  },
  not: function (a, un) {
    if (a !== a && un !== un) {
      return false;
    } else {
      return a !== un;
    }
  },
  nullish: function (a) {
    return a == null;
  }
};
assertions = {
  /**
   * Assert that a value is truthy, (`subject == true`)
   */
  ok: function () {
    return build(
      bodies.ok,
      "Actual value {0} was not truthy as expected",
      this.subject
    );
  },

  nullish: function () {
    return build(
      bodies.nullish,
      "Actual value {0} was not null or undefined as expected",
      this.subject
    );
  },
  /**
   * Assert the type of a variable.
   *
   * Allows some types additional to the built-in native types to simplify tests:
   *
   * - 'array'
   * - 'date'
   * - 'regexp'
   *
   *      assert.that(/foo/).is.ofType('regexp')();
   *
   * It is important to note however that asserting type 'object' will pass for all of these types
   *
   *     assert.that([]).is.ofType('object')();  // } these both
   *     assert.that([]).is.ofType('array')();   // } work
   *
   * @param  {String} expectedType
   */
  ofType : function (expectedType) {
    return build(
      bodies.ofType,
      "Type of value {0} was not {1} as expected",
      this.subject,
      expectedType
    );
  },
  /**
   * Assert that a String matches a given regex
   *
   * @param  {RegExp} match The regular expression to match against
   */
  matches : function (match) {
    return build(
      bodies.matches,
      "{0} does not match the expected {1}",
      this.subject,
      match
    );
  },
  /**
   * Assert that the subject string starts with the given substring.
   *
   * @param  {String} needle The value which should be at the start of subject.
   */
  startsWith : function (needle) {
    return build(
      bodies.startsWith,
      "Actual value {0} does not begin with {1} as expected",
      this.subject,
      needle
    );
  },
  /**
   * Assert that the subject string ends with the given substring.
   *
   * @param  {String} needle
   */
  endsWith : function (needle) {
    return build(
      bodies.endsWith,
      "Actual value {0} does not end with {1} as expected",
      this.subject,
      needle
    );
  },
  /**
   * Assert that a String or Array contains a substring or element. The test is performed using the `.indexOf`
   * method of the subject, so it can actually apply to any object which implements this method.
   *
   * @param  {*} needle
   */
  contains : function (needle) {
    return build(
      bodies.contains,
      "Actual value {0} does not contain the expected",
      this.subject,
      needle
    );
  },
  /**
   * Assert that a function will throw an error when executed. Additionally, a specific type of error or error
   * message can be expected. If this is specified and an error is thrown which does not match the
   * expectation, the assertion will fail.
   *
   * Though the expected error type/message is optional, it is highly recommended to use it, otherwise if your
   * function is failing in a way which you did not expect, that error will be swallowed and your tests will
   * still pass.
   *
   * The `expectedError` argument can be a string or a regex (in which case these are compared against the
   * error's `.message` property), or a constructor (in which case, the thrown error should be an instance of
   * this function).
   *
   *      assert.that(function () {
   *          (0)();
   *      }).willThrow(TypeError);
   *
   * @param  {String|RegExp|Function} expectedError
   */
  willThrow : function (expectedError) {
    return build(
      bodies.willThrow,
      "",
      this.subject, // a function
      expectedError
    );
  },
  /**
   * Assert that a function will not throw any errors when executed.
   *
   * The given function will be executed with no arguments or context. If you require arguments, then a
   * closure should be used. This assertion only be applied to subjects of type `function`.
   */
  wontThrow : function () {
    return build(
      bodies.wontThrow,
      "Function unexpectedly raised an error",
      this.subject
    );
  },
  /**
   * Assert that two objects have the same values (deep equality).
   *
   * This assertion should be used when you want to compare two objects to see that they contain the same
   * values. If you are asserting with primitives such as strings or numbers, then it is faster to use `.is`
   *
   *     assert({a : 'bar', b : 'baz'}).equals({b : 'baz', a : 'bar'})(); // PASS, same keys and values.
   *
   * @param  {Object} object
   */
  equals : function (object) {
    return build(
      util.isEqual,
      "Actual value {0} did not match expected value {1} with object comparison.",
      this.subject,
      object
    );
  },
  /**
   * Assert that a function which has been spied upon by Myrtle has been called a exactly this many times.
   * If no value is passed to this assertion, then it will assert that the function has been called *at least
   * once*.
   *
   * @example
   *  Myrtle.spy(obj, 'myFunc').and(function () {
   *      // `this` is the Myrtle handle
   *      doSomething();
   *      assert.that(this).is.called(3).since("obj.myFunc should have been called 3 times");
   *  });
   *
   * @example
   *  assert.that(handle).is.called()("The function should have been called at least once");
   *
   * @param {Number=} numTimes The number of times which the function should have been called.
   */
  called : function (numTimes) {
    return build(
      bodies.called,
      "Function call count is {2} when a value of {1} was expected",
      this.subject,
      numTimes
    );
  }
};
/**
 * The assertion starting point. This is the actual function passed in to each test. The value passed as an
 * argument to this function is used as the *subject* of the assertion.
 *
 * @param  {*} actual A value which is the subject of this assertion
 * @return {Function} A function which initiates an `is` assertion. Other types of assertion are stored as
 *                    properties of this function.
 */
function assert (actual) {
  /**
   * Assert that the subject is identical (`===`, same value and type) to another value.
   *
   * For comparing the members of objects (including Arrays, Dates, etc), the `equals` assertion usually more
   * appropriate. For example,
   *
   *     assert.that([1, 2, 3]).is([1, 2, 3])(); // FAIL, they are not the same object
   *     assert.that([1, 2, 3]).equals([1, 2, 3])(); // PASS, each of their members have the same value.
   *
   * @param {*} expected
   */
  function is(expected) {
    return build(
      bodies.is,
      "Actual value {0} did not match expected value {1}",
      is.subject,
      expected
    );
  }

  /**
   * Assert that two values are not identical. Uses strict equality checking: `!==`.
   *
   * @param {*} unexpected The value which should be different
   */
  is.not = function (unexpected) {
    return build(
      bodies.not,
      "Actual value was the same as the unexpected value {0}",
      this.subject,
      unexpected
    );
  };
  is.__proto__ = temporaryAssertions; // is -> temporaryAssertions -> globalAssertions -> Function prototype
  is.not.__proto__ = temporaryAssertionsNegated;

  // Store the subject onto the `is` and `is.not` so `this.subject` works in both cases
  is.subject = is.not.subject = actual;
  is.is = is; // head hurts.
  return is;
}
assert.that = assert;

temporaryAssertions.__proto__ = assertions;
assertions.__proto__ = Function.prototype;

temporaryAssertionsNegated.__proto__ = assertionsNegated;
assertionsNegated.__proto__ = Function.prototype;


util.each(assertions, function (fn, key) {
  assertionsNegated[key] = function () {
    return invert(assertions[key].apply(this, arguments));
  };
});

/**
 * Handle the result of running an assertion.
 * @param  {Boolean|String|Array} result The result of the assertion. True or undefined for "pass", any other
 *                                       value for failure. A string is used as the error message, and an array
 *                                       should contain an error message in the first position, followed by
 *                                       additional arguments to be substituted into the message.
 * @param  {Array} args The arguments passed to the assertion function
 * @param  {String} message The default assertion error message
 * @param  {String} userMessage The user-supplied error message
 * @throws {AssertionError} If the assertion failed.
 */
function handleAssertionResult(result, args, message, userMessage) {
  var isArr;
  // success can be signalled by returning true, or returning nothing.
  if (result !== true && typeof result !== 'undefined') {
    isArr = util.isArray(result);

    // if we have an array
    if (isArr) {
      // grab all but the first element and add that to the arguments
      args = args.concat(result.slice(1));
      // grab the first element and make that the error message
      result = result[0];
    }
    // if the result is a string, use that instead of the default
    if (typeof result === 'string') {
      // the default message can be inserted by using '%1' in the error
      message = result.replace(/%1/, message || '');
    }
    throw new AssertionError(message, args, userMessage);
  }
}

/**
 *  Builds the actual assertion function.
 *  @param {Function} condition The function which tests the assertion
 *  @param {String} message A default assertions message.
 *  @param {*...} Additional arguments which are to be passed to the condition function
 *  @return {Function} The assertion, ready to run.
 */
function build (condition, message/*, args */) {
  var args = Array.prototype.slice.call(arguments, 2),
      since;
  ++unexecutedAssertions;
  since = function (userMessage) {
    try {
      if (internalAssertionCount++ === 0) {
        ++currentTestAssertions;
      }
      // if this is the first time we've executed this assertion, then decrease the counter, and don't count this
      // one again
      if (!since.executed) {
        --unexecutedAssertions;
        since.executed = true;
      }
      handleAssertionResult(condition.apply(assert, args), args, message, userMessage);
    } catch (e) {
        // IE throws error up if not caught here
    } finally {
      --internalAssertionCount;
    }
  };
  since.executed = false;
  since.since = since;
  return since;
}

function invert (normalSince) {
  var since = function (userMessage) {
    var ok = false,
        message;
    try {
      normalSince(userMessage);
      message = 'The assertion passed when it was not supposed to';
    } catch (e) {
      if (!(e instanceof AssertionError)) {
        throw e;
      } else {
        message = e.message;
        ok = true;
      }
    }
    handleAssertionResult(ok, [], message, userMessage);
  };
  since.since = since;
  return since;
}
