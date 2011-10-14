/*!
 * Tyrtle - A JavaScript Unit Testing Framework
 *
 * Copyright (c) 2011 Nick Fisher
 * Distributed under the terms of the LGPL
 * http://www.gnu.org/licenses/lgpl.html
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
        setParams,
        root,
        runningInNode,
        moduleAssertions = null, // the extra assertions added by an individual module
        currentTestAssertions    // a counter for the number of assertions run in an individual test
    ;
    // Gets the global object, regardless of whether run as ES3, ES5 or ES5 Strict Mode.
    root = (function () {
        return this || (0 || eval)('this');
    }());

    runningInNode = typeof window === 'undefined';

    //////////////////////////
    //  RUNTIME PARAMETERS  //
    //////////////////////////
//#JSCOVERAGE_IF 0
    (function () {
        var urlParams, loadParams;
        loadParams = runningInNode
            ? function () {
                // node parameters must be set up manually and passed to the Tyrtle constructor
                // this is because a test harness may use its own command line parameters
                urlParams = {};
            }
            : function () {
                urlParams = {};
                var query, vars, i, l, pair;
                query = window.location.search.substring(1);
                vars = query.split("&");
                for (i = 0, l = vars.length; i < l; ++i) {
                    pair = vars[i].split("=");
                    urlParams[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
                }
            }
        ;

        getParam = function (name) {
            if (!urlParams) {
                loadParams();
                loadParams = null;
            }
            return urlParams.hasOwnProperty(name) ? urlParams[name] : null;
        };
        setParams = function (params) {
            urlParams = params || {};
        };
    }());
//#JSCOVERAGE_ENDIF
    extend = function (target, source) {
        var i;
        for (i in source) {
            if (source.hasOwnProperty(i)) {
                target[i] = source[i];
            }
        }
    };
    // defer
//#JSCOVERAGE_IF
    if (!root.postMessage) {
        /**
         * The regular defer method using a 0ms setTimeout. In reality, this will be executed in 4-10ms.
         */
        defer = function (fn) {
            setTimeout(fn, 0);
        };
    } else {
        /**
         * The postMessage defer method which will get executed as soon as the call stack has cleared.
         * Credit to David Baron: http://dbaron.org/log/20100309-faster-timeouts
         */
        defer = (function () {
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
        }());
    }
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
    getKeys = Object.keys;
//#JSCOVERAGE_IF
    if (!getKeys) {
        getKeys = function (obj) {
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
    }

    isRegExp = function (obj) {
        return !!(obj && obj.test && obj.exec && (obj.ignoreCase || obj.ignoreCase === false));
    };
    /**
    * This function is taken from Underscore.js 1.1.6
    * (c) 2011 Jeremy Ashkenas, DocumentCloud Inc.
    * http://documentcloud.github.com/underscore
    */
//#JSCOVERAGE_IF 0
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
//#JSCOVERAGE_ENDIF
    //
    // Tyrtle
    //
    (function () {
        var runModule, emptyRenderer;

        Tyrtle = function (options) {
            options = options || {};
            this.modules = [];
            this.callback = options.callback || noop;
            this.modFilter = options.modFilter === false
                ? null
                : (typeof options.modFilter === 'string'
                   ? options.modFilter
                   : getParam('modFilter')
                  )
            ;
            this.testFilter = options.testFilter === false
                ? null
                : (typeof options.testFilter === 'string'
                   ? options.testFilter
                   : getParam('testFilter')
                 )
            ;
        };
        emptyRenderer = {
            beforeRun      : noop,
            beforeModule   : noop,
            beforeTest     : noop,
            afterTest      : noop,
            afterModule    : noop,
            afterRun       : noop,
            templateString : function (message) {
                var args = [].slice.call(arguments, 1);
                return message.replace(
                    /\{([1-9][0-9]*|0)\}/g,
                    function (str, p1) {
                        var v = args[p1];
                        return (v === null
                            ? "NULL"
                            : (typeof v === "undefined"
                               ? "UNDEFINED"
                               : (v.toString ? v.toString() : String(v))
                            )
                        );
                    }
                );
            }
        };

        // Static methods and properties
        extend(Tyrtle, {
            PASS : PASS,
            FAIL : FAIL,
            SKIP : SKIP,
            renderer : emptyRenderer,
            /**
             *  Get the current renderer
             *  @return {Object}
             */
            getRenderer : function () {
                return this.renderer;
            },
            /**
             *  Set the current renderer. This is a static method because the renderer is global to all instances of
             *  Tyrtle. If one of the renderer properties is not specified, then the corresponding property from
             *  `emptyRenderer` is used.
             *  @param {Object} renderer
             */
            setRenderer : function (renderer) {
                each(emptyRenderer, function (val, key) {
                    if (!(key in renderer)) {
                        renderer[key] = val;
                    }
                }, this);
                this.renderer = renderer;
            },
            /**
             *  Set the parameters which Tyrtle uses for default values. In the browser, Tyrtle will automatically use
             *  the parameters specified in the url.
             */
            setParams : setParams,
            /**
             * Static method used when you do not have an instance of Tyrtle yet. Modules returned by this function must
             * still be added to an instance of Tyrtle using Tyrtle.module()
             *
             * @param  {String} name The name of the module
             * @param  {Function} body   The body function of the module
             *
             * @return {Module}
             */
            module : function (name, body) {
                return new Module(name, body);
            }
        });

        // instance methods and properties
        extend(Tyrtle.prototype, {
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
                        if (tyrtle.modFilter && mod.name !== tyrtle.modFilter) {
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
        var addHelper, runHelper, applyAssertions, cleanUpAssertions;
        /**
         * A testing module. Represents a logical grouping of tests. A Module can have custom **helpers** to assist in
         * setting up and cleaning up the tests, as well as custom assertions which streamline writing the tests.
         *
         * @class
         * @param {String} name The name of this module
         * @param {Function} body The body of this function.
         */
        Module = function (name, body) {
            this.name = name;
            this.tests = [];
            this.helpers = {};
            body.call(this);
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
        applyAssertions = function (fnMap) {
            moduleAssertions = fnMap;
        };
        cleanUpAssertions = function () {
            moduleAssertions = null;
        };
        extend(Module.prototype, {
            tests : null,           // array of tests
            tyrtle : null,          // reference to the owner Tyrtle instance
            helpers : null,         // object containing the (before|after)(All)? functions
            extraAssertions : null, // object holding custom assertions. Only populated if required.
            passes : 0,             // }
            fails : 0,              // } counts of the test results
            skips : 0,              // }
            errors : 0,             // }
            //////////////////////////
            /**
             * Create a new Test and add it to this Module
             * @param  {String} name A name for this test.
             * @param  {Function} bodyFn The body function for this test.
             * @param  {Function=} assertionsFn If writing an asynchronous test, this is the function where assertions
             *                                  can be executed. For synchronous tests, *do not supply this parameter*.
             * @return {Test} The newly created test.
             */
            test : function (name, bodyFn, assertionsFn) {
                var t = new Test(name, bodyFn, assertionsFn);
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
                    each(fnMap, function (fn, name) {
                        this.extraAssertions[name] = fn;
                    }, this);
                }
            },
            /**
             * @protected
             */
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
                    if (i >= l) { // we've done all the tests, break the loop.
                        cleanUpAssertions();
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
                                Tyrtle.renderer.afterTest(test, mod, mod.tyrtle);
                                defer(runNext);
                            });
                        }
                    }
                };
                applyAssertions(this.extraAssertions);
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
            /**
             * @protected
             */
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
                    applyAssertions(mod.extraAssertions);
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
                    Tyrtle.renderer.afterTest(test, mod, tyrtle);
                    Tyrtle.renderer.afterModule(mod, tyrtle);
                    Tyrtle.renderer.afterRun(tyrtle);
                    cleanUpAssertions();
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
        var incorrectNumAssertions;

        Test = function (name, body, asyncFn) {
            this.name = name;
            this.body = body;
            this.asyncFn = asyncFn;
        };

        extend(Test.prototype, {
            /** @type {Status} one of PASS, FAIL, SKIP or null */
            status : null,
            statusMessage: '',
            runTime : -1,
            error : null,       // If an error (not an AssertionError is thrown it is stored here)
            exception : null,   // Any thrown error is stored here (including AssertionErrors)
            asyncFn : null,
            expectedAssertions : -1,
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
                var start, success, handleError, test = this;
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
                    start = new Date();
                    if (this.asyncFn) {
                        this.body(function (variables) {
                            variables = variables || {};
                            try {
                                currentTestAssertions = 0; // this is incremented by the `since` function
                                test.asyncFn.call(variables, assert);
                                if (test.expectedAssertions !== -1) {
                                    assert.that(currentTestAssertions)
                                          .is(test.expectedAssertions)
                                          .since("Incorrect number of assertions made by this test.")
                                    ;
                                }
                                success();
                            } catch (ee) {
                                handleError(ee);
                            }
                        });
                    } else {
                        currentTestAssertions = 0;
                        this.body(assert);
                        if (test.expectedAssertions !== -1) {
                            assert.that(currentTestAssertions)
                                  .is(test.expectedAssertions)
                                  .since("Incorrect number of assertions made by this test.")
                            ;
                        }
                        success();
                    }
                } catch (e) {
                    handleError(e);
                }
            }
        });
    }());

    /**
     * AssertionError exception class. An instance of this class is thrown whenever an assertion fails.
     * @class
     * @param {String} msg A message for the failed assertion, this is defined by the assertion itself.
     * @param {Array} args Arguments passed to the assertion, these are used to substitute into the error message.
     * @param {String} userMessage An error message as defined by the user.
     */
    AssertionError = function (msg, args, userMessage) {
        var newError = new Error(),
            re_stack = /([^(\s]+\.js):(\d+):(\d+)/g
        ;
        this.message = Tyrtle.renderer.templateString.apply(
            Tyrtle.renderer,
            [(msg || "") + (msg && userMessage ? ": " : "") + (userMessage || "")].concat(args)
        );
        if (newError.stack) { // TODO: cross-browser implementation
            this.stack = [];
            each(newError.stack.match(re_stack), function (str) {
                re_stack.lastIndex = 0;
                var parts = re_stack.exec(str);
                if (parts) {
                    this.stack.push(parts.slice(1));
                }
            }, this);

            this.stack = this.stack.slice(3);
        }
    };
    AssertionError.prototype.name = "AssertionError";

    /**
     * SkipMe exception. This is thrown by tests when `this.skip()` or `this.skipIf(true)` is called.
     * @class
     * @param  {String} reason A reason for this test to be skipped.
     */
    SkipMe = function (reason) {
        this.message = reason;
    };
    SkipMe.prototype.name = 'SkipMe';

    //////////////////
    //  Assertions  //
    //////////////////
    (function () {
        var assertions, build, handleAssertionResult, internalAssertionCount = 0;
        assertions = {
            /**
             * Assert that two values are not identical. Uses strict equality checking: `!==`.
             *
             * @param {*} unexpected The value which should be different
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
                    this.subject,
                    unexpected
                );
            },
            /**
             * Assert that a value is truthy, (`subject == true`)
             */
            ok : function () {
                return build(
                    function (a) {
                        return !!a;
                    },
                    "Actual value {0} was not truthy as expected",
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
                    function (a, e) {
                        var type = typeof a;
//#JSCOVERAGE_IF typeof /a/ === 'function'
                        // webkit (incorrectly?) reports regexes as functions. Normalize this to 'object'.
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
                    function (a, m) {
                        return m.test(a);
                    },
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
                    function (a, n) {
                        if (typeof a !== 'string') {
                            return [
                                "Actual value {0} is of type {2}, therefore it can not end with {1} as expected",
                                typeof a
                            ];
                        }
                        return a.length >= n.length && n === a.substr(-n.length);
                    },
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
                    function (a, n) {
                        return a.indexOf(n) !== -1 || (typeof a === 'string' ? "%1 substring {1}" : "%1 element {1}");
                    },
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
                    function (f) {
                        try {
                            f();
                            return true;
                        } catch (e) {
                            return ["%1 {1}", e];
                        }
                    },
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
                    isEqual,
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
                    function (subject, numTimes) {
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
        assert = function (actual) {
            var is;
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
            is = function (expected) {
                // `is`
                return build(
                    function (a, e) {
                        if (a !== a) { // NaN
                            return e !== e;
                        } else {
                            return a === e;
                        }
                    },
                    "Actual value {0} did not match expected value {1}",
                    is.subject,
                    expected
                );
            };
            // Copy the regular functions onto the new assertion object, importantly, binding them to the function.
            // Without this binding, then it would be more difficult to reuse assertions like this:
            //  var a = assert(x)(3);
            //  a('foo');
            //  a('bar');
            each(assertions, function (fn, key) {
                is[key] = function () {
                    return fn.apply(is, arguments);
                };
            });
            // Copy the module-specific functions onto the assertion object
            // The syntax for these is simpler than the built-in ones
            each(moduleAssertions, function (fn, key) {
                is[key] = function () {
                    return build.apply(null, [fn, "", is.subject].concat([].slice.apply(arguments)));
                };
            });

            is.subject = actual;
            is.is = is; // head hurts.
            return is;
        };
        assert.that = assert;

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
        handleAssertionResult = function (result, args, message, userMessage) {
            var isArr;
            // success can be signalled by returning true, or returning nothing.
            if (result !== true && typeof result !== 'undefined') {
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

        /**
         *  Builds the actual assertion function.
         *  @param {Function} condition The function which tests the assertion
         *  @param {String} message A default assertions message.
         *  @param {*...} Additional arguments which are to be passed to the condition function
         *  @return {Function} The assertion, ready to run.
         */
        build = function (condition, message/*, args */) {
            var args = Array.prototype.slice.call(arguments, 2),
                since
            ;
            since = function (userMessage) {
                try {
                    if (internalAssertionCount++ === 0) {
                        ++currentTestAssertions;
                    }
                    handleAssertionResult(condition.apply(assert, args), args, message, userMessage);
                } finally {
                    --internalAssertionCount;
                }
            };
            since.since = since;
            return since;
        };
        extend(Tyrtle, {
            /**
             *  Global assertions, added to all modules of all instances of Tyrtle
             *  @param {Object} newAssertions A map of AssertionName => AssertionFunction
             */
            addAssertions : function (newAssertions) {
                each(newAssertions, function (fn, name) {
                    assertions[name] = function () {
                        return build.apply(null, [fn, "", this.subject].concat([].slice.apply(arguments)));
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
            }
        });
    }());

    // Export some of our helper functions too.
    // They might be useful to someone!
    extend(Tyrtle, {
        isArray  : isArray,
        isRegExp : isRegExp,
        isDate   : isDate,
        getKeys  : getKeys
    });

//#JSCOVERAGE_IF
    if (typeof module !== 'undefined') {
        module.exports = Tyrtle;
    } else {
        root.Tyrtle = Tyrtle;
    }
    extend = null;
}(this));
