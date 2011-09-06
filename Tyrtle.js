/*!
 * Tyrtle - A JavaScript Unit Testing Framework
 * 
 * Copyright (c) 2011 Nick Fisher
 * Licensed under the Creative Commons BY-SA License
 * http://creativecommons.org/licenses/by-sa/3.0/
 */
/*globals module */
(function (root) {
    var Tyrtle, Module, Test, assert,
        AssertionError, SkipMe,
        PASS = 0,
        FAIL = 1,
        SKIP = 2,
        extend,
        defer,
        setDefer,
        noop,
        each
    ;
    extend = function (Cls, obj) {
        var i;
        for (i in obj) {
            if (obj.hasOwnProperty(i)) {
                Cls.prototype[i] = obj[i];
            }
        }
    };
    // defer
    (function () {
        var legacyMethod, postMessageMethod;
        /**
         * The regular defer method using a 0ms setTimeout. In reality, this will be executed in 4-10ms.
         */
        legacyMethod = function (func) {
            var args = Array.prototype.slice.call(arguments, 1);
            setTimeout(args.length === 0 ? func : function () {
                func.apply(func, args);
            }, 0);
        };
        /**
         * The postMessage defer method which will get executed as soon as the call stack has cleared.
         * Credit to David Baron: http://dbaron.org/log/20100309-faster-timeouts
         */
        postMessageMethod = !root.postMessage
            ? legacyMethod
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
                    var args = Array.prototype.slice.call(arguments, 1);
                    setZeroTimeout(args.length === 0 ? func : function () {
                        func.apply(func, args);
                    });
                };
            }())
        ;
        /**
         * Override the current defer method. This should be only needed for testing of Tyrtle itself.
         */
        setDefer = function (forceLegacy) {
            defer = forceLegacy ? legacyMethod : postMessageMethod;
        };
        setDefer(false);
    }());
    noop = function () {};
    each = function (obj, iterator, context) {
        if (obj === null || typeof obj === 'undefined') {
            return;
        }
        if (Array.prototype.forEach && obj.forEach === Array.prototype.forEach) {
            obj.forEach(iterator, context);
        } else {
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    iterator.call(context, obj[key], key, obj);
                }
            }
        }
    };
    //
    // Tyrtle
    //
    (function () {
        Tyrtle = function (options) {
            options = options || {};
            this.modules = [];
            this.callback = options.callback || noop;
        };
        Tyrtle.PASS = PASS;
        Tyrtle.FAIL = FAIL;
        Tyrtle.SKIP = SKIP;
        Tyrtle.setRenderer = function (renderer) {
            this.renderer = renderer;
        };
        Tyrtle.useLegacyTimeouts = function (legacy) {
            setDefer(legacy);
        };
        // a default renderer which clearly does nothing, provided so that we don't have to check each function exists
        // when using it
        Tyrtle.renderer = {
            beforeRun    : noop,
            beforeModule : noop,
            beforeTest   : noop,
            afterTest    : noop,
            afterModule  : noop,
            afterRun     : noop
        };
        extend(Tyrtle, {
            passes : 0,
            fails : 0,
            errors : 0,
            skips : 0,
            ////
            module : function (name, body) {
                var m = new Module(name, body);
                m.tyrtle = this;
                this.modules.push(m);
            },
            run : function (options) {
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
                        tyrtle.runModule(mod, function () {
                            each(['passes', 'fails', 'errors', 'skips'], function (key) {
                                tyrtle[key] += mod[key];
                            });
                            defer(runNext);
                        });
                    }
                };
                runNext();
            },
            runModule : function (mod, callback) {
                var self = this;
                Tyrtle.renderer.beforeModule(mod, this);
                mod.run(function () {
                    Tyrtle.renderer.afterModule(mod, self);
                    callback();
                });
            }
        });
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
                    if (catchBlock) {
                        catchBlock(e);
                    } else {
                        throw e;
                    }
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
            test : function (name, fn) {
                this.tests.push(new Test(name, fn));
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
                    Tyrtle.renderer.afterTest(test, m, t);
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
            rerunTest : function (test, tyrtle) {
                var mod = this, run, done;
                switch (test.status) {
                case PASS :
                    --this.passes;
                    --tyrtle.passes;
                    break;
                case FAIL :
                    --this.fails;
                    --tyrtle.fails;
                    if (test.error) {
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
                        var callback = function () {
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
                            done();
                        };
                        runHelper(mod.helpers.afterAll, callback, function (e) {
                            test.status = FAIL;
                            test.statusMessage = "Error in the afterAll helper";
                            callback();
                        });
                    });
                };
                done = function () {
                    Tyrtle.renderer.afterModule(mod, tyrtle);
                    Tyrtle.renderer.afterRun(tyrtle);
                };
                runHelper(this.helpers.beforeAll, run);
            }
        });
    }());
    
    (function () {
        //
        // Test
        //
        Test = function (name, body) {
            this.name = name;
            this.body = body;
        };
        extend(Test, {
            status : null,
            statusMessage: '',
            runTime : -1,
            error : null,
            isAsync : false,
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
                var start;
                try {
                    start = new Date();
                    this.body(assert);
                    this.runTime = new Date() - start;
                    this.status = PASS;
                    this.statusMessage = 'Passed';
                } catch (e) {
                    this.status = FAIL;
                    this.statusMessage = "Failed: " + ((e && e.message) || String(e));
                    if (e instanceof SkipMe) {
                        this.status = SKIP;
                        this.statusMessage = "Skipped" + (e.message ? " because " + e.message : "");
                    } else if (!(e instanceof AssertionError)) {
                        this.error = e;
                    }
                } finally {
                    callback(this);
                }
            }
        });
    }());
    
    AssertionError = function (msg, args, userMessage) {
        this.name = "AssertionError";
        this.message = msg + (userMessage ? ": " + userMessage : "");
        this.args = args;
    };
    
    SkipMe = function (reason) {
        this.message = reason;
    };
    
    //////////////////
    //  Assertions  //
    //////////////////
    (function () {
        var AssertThat, fail, assertions;
        
        assert = function (actual) {
            return new AssertThat(actual);
        };
        assert.that = assert;
        
        fail = function (message, args, userMessage) {
            throw new AssertionError(message, args, userMessage);
        };
        
        AssertThat = function (actual) {   
            this.actual = actual;
        };
        assertions = {
            is : function (expected) {
                var actual, f;
                actual = this.actual;
                f = function (message) {
                    if (actual !== expected) {
                        fail(
                            "Actual value {0} did not match expected value {1}",
                            [actual, expected],
                            message
                        );
                    }
                };
                f.since = f;
                return f;
            },
            not : function (unexpected) {
                var actual, f;
                actual = this.actual;
                f = function (message) {
                    if (actual === unexpected) {
                        fail(
                            "Actual value matched the unexpected value {0}",
                            [actual],
                            message
                        );
                    }
                };
                f.since = f;
                return f;
            }
        };
        each(assertions, function (fn, key) {
            if (key !== 'is') {
                assertions.is[key] = fn;
            }
        });
        extend(AssertThat, assertions);
    }());

//#JSCOVERAGE_IF
    if (typeof module !== 'undefined') {
        module.exports = Tyrtle;
    } else {
        root.Tyrtle = Tyrtle;
    }
    
}(this));
