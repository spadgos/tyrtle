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
    defer = (root && root.postMessage 
        ? (function () {
            // credit to David Baron: http://dbaron.org/log/20100309-faster-timeouts
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
        : function (func) {
            var args = Array.prototype.slice.call(arguments, 1);
            setTimeout(args.length === 0 ? func : function () {
                func.apply(func, args);
            }, 0);
        }
    );
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
        Module = function (name, body) {
            this.name = name;
            this.tests = [];
            body.call(this); // TODO: could provide a reduced api here
        };
        extend(Module, {
            tests : null,   // array of tests
            tyrtle : null,  // reference to the owner Tyrtle instance
            passes : 0,     // }
            fails : 0,      // } counts of the test results
            skips : 0,      // } 
            errors : 0,     // }
            //////////////////
            test : function (name, fn) {
                this.tests.push(new Test(name, fn));
            },
            run : function (callback) {
                var runNext,
                    i = -1,
                    l = this.tests.length,
                    mod = this
                ;
                runNext = function () {
                    var test;
                    ++i;
                    if (i === l) {
                        // do the afterall
                        defer(callback);
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
                runNext();
            },
            runTest : function (test, callback) {
                var m = this, t = this.tyrtle;
                Tyrtle.renderer.beforeTest(test, m, t);
                test.run(function () {
                    Tyrtle.renderer.afterTest(test, m, t);
                    callback();
                });
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
            run : function (callback) {
                var start;
                try {
                    start = new Date();
                    this.body.call({}, assert);
                    this.runTime = new Date() - start;
                    this.status = PASS;
                    this.statusMessage = 'Passed';
                } catch (e) {
                    this.status = FAIL;
                    this.statusMessage = "Failed: " + ((e && e.message) || String(e));
                    if (e instanceof SkipMe) {
                        this.status = SKIP;
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
