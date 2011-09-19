/*!
 * Tyrtle - A JavaScript Unit Testing Framework
 *
 * Copyright (c) 2011 Nick Fisher
 * Licensed under the Creative Commons BY-SA License
 * http://creativecommons.org/licenses/by-sa/3.0/
 */
/*globals module, window */
(function () {
    var Tyrtle, Module, Test, assert,
        AssertionError, SkipMe,
        PASS = 0,
        FAIL = 1,
        SKIP = 2,
        extend,
        defer,
        noop,
        each,
        isArray,
        isRegExp,
        getKeys,
        isEqual,
        isDate,
        getParam,
        root
    ;
    // Gets the global object, regardless of whether run as ES3, ES5 or ES5 Strict Mode.
    root = (function () {
        return this || (0 || eval)('this');
    }());

    getParam = (function () {
        var urlParams;
        return function (name) {
            if (!urlParams) {
                urlParams = (function () {
                    var query, vars, out = {}, i, l, pair;
                    query = window.location.search.substring(1);
                    vars = query.split("&");
                    for (i = 0, l = vars.length; i < l; ++i) {
                        pair = vars[i].split("=");
                        out[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
                    }
                    return out;
                }());
            }
            return urlParams.hasOwnProperty(name) ? urlParams[name] : null;
        };
    }());

    extend = function (Cls, obj) {
        var i;
        for (i in obj) {
            if (obj.hasOwnProperty(i)) {
                Cls.prototype[i] = obj[i];
            }
        }
    };
    // defer
    defer = !root.postMessage
        /**
         * The regular defer method using a 0ms setTimeout. In reality, this will be executed in 4-10ms.
         */
        ? function (fn) {
            setTimeout(fn, 0);
        }
        /**
         * The postMessage defer method which will get executed as soon as the call stack has cleared.
         * Credit to David Baron: http://dbaron.org/log/20100309-faster-timeouts
         */
        : (function () {
            var timeouts = [], messageName = "zero-timeout-message", setZeroTimeout, handleMessage;

            setZeroTimeout = function (fn) {
                timeouts.push(fn);
                root.postMessage(messageName, "*");
            };

            handleMessage = function (event) {
                if (event.source === root && event.data === messageName) {
                    event.stopPropagation();
                    if (timeouts.length > 0) {
                        var fn = timeouts.shift();
                        fn();
                    }
                }
            };

            root.addEventListener("message", handleMessage, true);

            return function (func) {
                setZeroTimeout(func);
            };
        }())
    ;
    noop = function () {};
    each = function (obj, iterator, context) {
        if (obj !== null && typeof obj !== 'undefined') {
            if (Array.prototype.forEach && obj.forEach === Array.prototype.forEach) {
                obj.forEach(iterator, context);
            } else {
                for (var key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        iterator.call(context, obj[key], key, obj);
                    }
                }
            }
        }
    };
//#JSCOVERAGE_IF 0
    getKeys = Object.keys || function (obj) {
        /*jslint newcap : false */
        if (obj !== Object(obj)) {
            throw new TypeError('Invalid object');
        }
        /*jslint newcap : true */

        var keys = [], key;
        for (key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                keys[keys.length] = key;
            }
        }
        return keys;
    };
//#JSCOVERAGE_ENDIF

    isRegExp = function (obj) {
        return !!(obj && obj.test && obj.exec && (obj.ignoreCase || obj.ignoreCase === false));
    };
    /**
    * This function is taken from Underscore.js 1.1.6
    * (c) 2011 Jeremy Ashkenas, DocumentCloud Inc.
    * http://documentcloud.github.com/underscore
    */
    isEqual = function (a, b) {
        /*jslint eqeqeq: false */
        var aKeys, atype, bKeys, btype, key;
        // Check object identity.
        if (a === b) {
            return true;
        }
        // Different types?
        atype = typeof(a);
        btype = typeof(b);

        if (atype !== btype) {
            return false;
        }
        // Basic equality test (watch out for coercions).
        if (a == b) {
            return true;
        }
        // One is falsy and the other truthy.
        if ((!a && b) || (a && !b)) {
            return false;
        }
        // One of them implements an isEqual()?
        if (a.isEqual) {
            return a.isEqual(b);
        }
        if (b.isEqual) {
            return b.isEqual(a);
        }
        // Check dates' integer values.
        if (isDate(a) && isDate(b)) {
            return a.getTime() === b.getTime();
        }
        // Both are NaN?
        if (a !== a && b !== b) {
            return false;
        }
        // Compare regular expressions.
        if (isRegExp(a) && isRegExp(b)) {
            return a.source     === b.source
                && a.global     === b.global
                && a.ignoreCase === b.ignoreCase
                && a.multiline  === b.multiline
            ;
        }
        // If a is not an object by this point, we can't handle it.
        if (atype !== 'object') {
            return false;
        }
        // Check for different array lengths before comparing contents.
        if (a.length && (a.length !== b.length)) {
            return false;
        }
        // Nothing else worked, deep compare the contents.
        aKeys = getKeys(a);
        bKeys = getKeys(b);
        // Different object sizes?
        if (aKeys.length !== bKeys.length) {
            return false;
        }
        // Recursive comparison of contents.
        for (key in a) {
            if (!(key in b) || !isEqual(a[key], b[key])) {
                return false;
            }
        }
        /*jslint eqeqeq: true */
        return true;
    };
    isDate = function (obj) {
        return !!(obj && obj.getTimezoneOffset && obj.setUTCFullYear);
    };

    isArray = Array.isArray || function (obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    };
    //
    // Tyrtle
    //
    (function () {
        var runModule, emptyRenderer;

        Tyrtle = function (options) {
            options = options || {};
            this.modules = [];
            this.callback = options.callback || noop;
            this.filter = options.filter === false
                ? null
                : (typeof options.filter === 'string'
                   ? options.filter
                   : (typeof window === 'undefined'
                      ? null
                      : getParam('filter')
                     )
                  )
            ;
        };
        Tyrtle.PASS = PASS;
        Tyrtle.FAIL = FAIL;
        Tyrtle.SKIP = SKIP;
        Tyrtle.getRenderer = function () {
            return this.renderer;
        };
        Tyrtle.setRenderer = function (renderer) {
            each(emptyRenderer, function (val, key) {
                if (!(key in renderer)) {
                    renderer[key] = val;
                }
            }, this);
            this.renderer = renderer;
        };
        // a default renderer which clearly does nothing, provided so that we don't have to check each function exists
        // when using it
        Tyrtle.renderer = emptyRenderer = {
            beforeRun      : noop,
            beforeModule   : noop,
            beforeTest     : noop,
            afterTest      : noop,
            afterModule    : noop,
            afterRun       : noop,
            templateString : function (message) {
                return message;
            }
        };
        /**
         * Static method used when you do not have an instance of Tyrtle yet. Modules returned by this function must
         * still be added to an instance of Tyrtle using Tyrtle.module()
         *
         * @param  {String} name The name of the module
         * @param  {Function} body   The body function of the module
         *
         * @return {Module}
         */
        Tyrtle.module = function (name, body) {
            return new Module(name, body);
        };
        extend(Tyrtle, {
            passes : 0,
            fails : 0,
            errors : 0,
            skips : 0,
            ////
            /**
             * Create a new test module and add it to this instance of Tyrtle
             *
             * @param  {String} name The name for this module
             * @param  {Function} body The body of the module which can define tests, local variables and test helpers,
             *                         like before, after, beforeAll and afterAll
             */
            module : function (name, body) {
                var m;
                if (arguments.length === 1 && name instanceof Module) {
                    m = name;
                } else if (arguments.length === 1 && typeof name === 'object') {
                    each(name, function (body, name) {
                        this.module(name, body);
                    }, this);
                    return;
                } else {
                    m = new Module(name, body);
                }
                m.tyrtle = this;
                this.modules.push(m);
            },
            /**
             * Execute the test suite.
             */
            run : function () {
                var runNext,
                    i = -1,
                    l = this.modules.length,
                    tyrtle = this
                ;
                Tyrtle.renderer.beforeRun(this);
                runNext = function () {
                    var mod;
                    ++i;
                    if (i === l) {
                        Tyrtle.renderer.afterRun(tyrtle);
                        tyrtle.callback();
                    } else {
                        mod = tyrtle.modules[i];
                        if (tyrtle.filter && mod.name !== tyrtle.filter) {
                            runNext();
                        } else {
                            runModule(mod, tyrtle, function () {
                                each(['passes', 'fails', 'errors', 'skips'], function (key) {
                                    tyrtle[key] += mod[key];
                                });
                                defer(runNext);
                            });
                        }
                    }
                };
                runNext();
            }
        });

        runModule = function (mod, tyrtle, callback) {
            Tyrtle.renderer.beforeModule(mod, tyrtle);
            mod.run(function () {
                Tyrtle.renderer.afterModule(mod, tyrtle);
                callback();
            });
        };
    }());
    //
    // Module
    //
    (function () {
        var addHelper, runHelper;
        Module = function (name, body) {
            this.name = name;
            this.tests = [];
            this.helpers = {};
            body.call(this); // TODO: could provide a reduced api here
        };
        addHelper = function (name, fn) {
            if (this.helpers[name]) {
                throw new Error("This module already has a " + name + " helper function.");
            }
            this.helpers[name] = fn;
        };
        runHelper = function (helper, callback, catchBlock) {
            if (helper) {
                try {
                    if (helper.length) {
                        helper(function () {
                            defer(callback);
                        });
                    } else {
                        helper();
                        callback();
                    }
                } catch (e) {
                    catchBlock(e);
                }
            } else {
                callback();
            }
        };
        extend(Module, {
            tests : null,   // array of tests
            tyrtle : null,  // reference to the owner Tyrtle instance
            helpers : null, // object containing the (before|after)(All)? functions
            passes : 0,     // }
            fails : 0,      // } counts of the test results
            skips : 0,      // }
            errors : 0,     // }
            //////////////////
            test : function (name, fn, assertionsFn) {
                this.tests.push(new Test(name, fn, assertionsFn));
            },
            before : function (fn) {
                addHelper.call(this, 'before', fn);
            },
            after : function (fn) {
                addHelper.call(this, 'after', fn);
            },
            beforeAll : function (fn) {
                addHelper.call(this, 'beforeAll', fn);
            },
            afterAll : function (fn) {
                addHelper.call(this, 'afterAll', fn);
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
                    ++i;
                    if (i >= l) {
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
                            Tyrtle.renderer.afterTest(test, mod, mod.tyrtle);
                            defer(runNext);
                        });
                    }
                };
                runHelper(this.helpers.beforeAll, runNext, function (e) {
                    // mark all the tests as failed.
                    for (j = 0, jl = mod.tests.length; j < jl; ++j) {
                        Tyrtle.renderer.beforeTest(mod.tests[j], mod, mod.tyrtle);
                        mod.tests[j].status = FAIL;
                        mod.tests[j].error = e;
                        Tyrtle.renderer.afterTest(mod.tests[j], mod, mod.tyrtle);
                    }
                    // set the group statistics
                    mod.passes = mod.skips = 0;
                    mod.fails = mod.errors = jl;
                    i = l; // <-- so the 'runNext' function thinks it's done all the tests & will call the afterAll.
                    runNext();
                });
            },
            runTest : function (test, callback) {
                var m = this, t = this.tyrtle, go, done;
                Tyrtle.renderer.beforeTest(test, m, t);
                go = function () {
                    test.run(done);
                };
                done = function () {
                    runHelper(m.helpers.after, callback, function (e) {
                        test.status = FAIL;
                        if (!test.error) {
                            test.statusMessage = "Error in the after helper.";
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
                    Tyrtle.renderer.afterModule(mod, tyrtle);
                    Tyrtle.renderer.afterRun(tyrtle);
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
            }
        });
    }());
    //
    // Test
    //
    (function () {
        Test = function (name, body, asyncFn) {
            this.name = name;
            this.body = body;
            this.asyncFn = asyncFn;
        };
        extend(Test, {
            status : null,
            statusMessage: '',
            runTime : -1,
            error : null,
            asyncFn : null,
            ///////////////
            skip : function (reason) {
                throw new SkipMe(reason);
            },
            skipIf : function (condition, reason) {
                if (condition) {
                    this.skip(reason);
                }
            },
            run : function (callback) {
                var start, success, handleError, test = this;
                success = function () {
                    test.runTime = new Date() - start;
                    test.status = PASS;
                    test.statusMessage = 'Passed';
                    callback(test);
                };
                handleError = function (e) {
                    test.status = FAIL;
                    test.statusMessage = "Failed: " + ((e && e.message) || String(e));
                    if (e instanceof SkipMe) {
                        test.status = SKIP;
                        test.statusMessage = "Skipped" + (e.message ? " because " + e.message : "");
                    } else if (!(e instanceof AssertionError)) {
                        test.error = e;
                    }
                    callback(test);
                };
                try {
                    start = new Date();
                    if (this.asyncFn) {
                        this.body(function (variables) {
                            variables = variables || {};
                            try {
                                test.asyncFn.call(variables, assert);
                                success();
                            } catch (ee) {
                                handleError(ee);
                            }
                        });
                    } else {
                        this.body(assert);
                        success();
                    }
                } catch (e) {
                    handleError(e);
                }
            }
        });
    }());

    AssertionError = function (msg, args, userMessage) {
        this.name = "AssertionError";
        this.message = Tyrtle.renderer.templateString.apply(
            Tyrtle.renderer,
            [msg + (userMessage ? ": " + userMessage : "")].concat(args)
        );
    };

    SkipMe = function (reason) {
        this.message = reason;
    };

    //////////////////
    //  Assertions  //
    //////////////////
    (function () {
        var assertions, build;
        assertions = {
            /**
             * Assert that two values are not identical. Uses strict equality checking: `!==`.
             *
             * @param  {*} unexpected The value which should be different
             */
            not : function (unexpected) {
                return build(
                    function (a, un) {
                        if (a !== a && un !== un) {
                            return false;
                        } else {
                            return a !== un;
                        }
                    },
                    "Actual value was the same as the unexpected value {0}",
                    this.actual,
                    unexpected
                );
            },
            /**
             * Assert that a value is truthy.
             */
            ok : function () {
                return build(
                    function (a) {
                        return !!a;
                    },
                    "Actual value {0} was not truthy as expected",
                    this.actual
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
                    function (a, e) {
                        var type = typeof a;
//#JSCOVERAGE_IF typeof /a/ === 'function'
                        // webkit incorrectly reports regexes as functions.
                        if (type === 'function' && a.constructor === RegExp) {
                            type = 'object';
                        }
//#JSCOVERAGE_ENDIF
                        switch (e.toLowerCase()) {
                        case 'array' :
                            return isArray(a);
                        case 'date' :
                            return isDate(a);
                        case 'regexp' :
                            return isRegExp(a);
                        default :
                            return type === e;
                        }
                    },
                    "Type of value {0} was not {1} as expected",
                    this.actual,
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
                    function (a, m) {
                        return m.test(a);
                    },
                    "{0} does not match the expected {1}",
                    this.actual,
                    match
                );
            },
            /**
             * Assert that the value is a string which starts with the given value.
             *
             * @param  {String} needle The value which should be at the start of subject.
             */
            startsWith : function (needle) {
                return build(
                    function (a, n) {
                        if (typeof a !== 'string') {
                            return [
                                "Actual value {0} is of type {2}, therefore it can not start with {1} as expected",
                                typeof a
                            ];
                        }
                        return a.length >= n.length && n === a.substr(0, n.length);
                    },
                    "Actual value {0} does not begin with {1} as expected",
                    this.actual,
                    needle
                );
            },
            endsWith : function (needle) {
                return build(
                    function (a, n) {
                        if (typeof a !== 'string') {
                            return [
                                "Actual value {0} is of type {2}, therefore it can not start with {1} as expected",
                                typeof a
                            ];
                        }
                        return a.length >= n.length && n === a.substr(-n.length);
                    },
                    "Actual value {0} does not end with {1} as expected",
                    this.actual,
                    needle
                );
            },
            contains : function (needle) {
                return build(
                    function (a, n) {
                        return a.indexOf(n) !== -1;
                    },
                    "Actual value {0} does not contain the expected substring {1}",
                    this.actual,
                    needle
                );
            },
            willThrow : function (expectedError) {
                return build(
                    function (f, expectedError) {
                        try {
                            f();
                            return "The function unexpectedly threw no errors";
                        } catch (e) {
                            if (expectedError) {
                                if (typeof expectedError === 'string') {
                                    if (expectedError !== (e.message || e)) {
                                        return [
                                            "An error {2} was thrown, but it did not match the expected error {1}",
                                            e.message || e
                                        ];
                                    }
                                } else if (isRegExp(expectedError)) {
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
                    "",
                    this.actual, // a function
                    expectedError
                );
            },
            wontThrow : function () {
                return build(
                    function (f) {
                        try {
                            f();
                            return true;
                        } catch (e) {
                            return ["%1 {1}", e];
                        }
                    },
                    "Function unexpectedly raised an error",
                    this.actual
                );
            },
            equals : function (object) {
                return build(
                    isEqual,
                    "Actual value {0} did not match expected value {1} with object comparison.",
                    this.actual,
                    object
                );
            }
        };
        assert = function (actual) {
            var f = function (expected) {
                // `is`
                return build(
                    function (a, e) {
                        if (a !== a) {
                            return e !== e;
                        } else {
                            return a === e;
                        }
                    },
                    "Actual value {0} did not match expected value {1}",
                    f.actual,
                    expected
                );
            };

            each(assertions, function (fn, key) {
                f[key] = function () {
                    return fn.apply(f, arguments);
                };
            });

            f.actual = actual;
            f.is = f;
            return f;
        };
        assert.that = assert;

        build = function (condition, message) {
            var args = Array.prototype.slice.call(arguments, 2),
                f
            ;
            f = function (userMessage) {
                var result = condition.apply({}, args),
                    isArr
                ;
                // unless the result is exactly true
                if (result !== true) {
                    isArr = isArray(result);

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
            };
            f.since = f;
            return f;
        };
    }());

    // Export some of our helper functions too.
    // They might be useful to someone!
    Tyrtle.isArray  = isArray;
    Tyrtle.isRegExp = isRegExp;
    Tyrtle.isDate   = isDate;
    Tyrtle.getKeys  = getKeys;

//#JSCOVERAGE_IF
    if (typeof module !== 'undefined') {
        module.exports = Tyrtle;
    } else {
        root.Tyrtle = Tyrtle;
    }
    extend = null;
}(this));
