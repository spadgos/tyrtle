/*globals jQuery, asyncTest, test, Tyrtle, Myrtle, equal, expect, start, raises */
jQuery(function ($) {
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
    asyncTest("Basic assertions", function () {
        var t = new Tyrtle({
            callback : function () {
                var i, l, results, expected, test, undef;
                results = [
                    'PASS',
                    'PASS',
                    'PASS',
                    'FAIL',
                    'PASS',
                    'FAIL'
                ];
                for (i = 0, l = results.length; i < l; ++i) {
                    test = t.modules[0].tests[i];
                    expected = results[i];
                    equal(
                        test.status,
                        Tyrtle[expected],
                        "Test " + test.name + " did not " + expected.toLowerCase() + " as expected."
                    );
                    equal(
                        test.error,
                        undef,
                        "There should not have been an error in test " + test.name
                    );
                }
                
                start();
            }
        });
        t.module("tests", function () {
            var x = 3;
            this.test("a", function (assert) {
                assert.that(x).is(3).since("x should be three");
            });
            this.test("b", function (assert) {
                assert(x).is(3).since("x should be three");
            });
            this.test("c", function (assert) {
                assert(x).is(3)("x should be three");
            });
            this.test("d", function (assert) {
                assert.that(x).is(4)("x should be four");
            });
            this.test("e", function (assert) {
                assert.that(x).is.not(4).since("x should not be four");
            });
            this.test("f", function (assert) {
                assert(x).not(3)("x should not be three");
            });
        });
        t.run();
    });
    asyncTest("Assertions can be reused", function () {
        expect(1);
        var t;
        t = new Tyrtle({
            callback : function () {
                equal(this.passes, 1, "There should be one pass");
                start();
            }
        });
        t.module("foo", function () {
            this.test("a", function (assert) {
                var x = 3, a;
                a = assert(x).is(3);
                a("works the first time");
                a("works the second time");
            });
        });
        t.run();
    });
    asyncTest("Test helpers are executed properly", function () {
        expect(5);
        var t, helpers, x, y;
        t = new Tyrtle({
            callback : function () {
                /*jslint newcap: false */
                equal(this.passes, 2, "All tests should have passed.");
                equal(Myrtle(helpers, 'before').callCount(),    2, "The before should be run twice");
                equal(Myrtle(helpers, 'after').callCount(),     2, "The after should be run twice");
                equal(Myrtle(helpers, 'beforeAll').callCount(), 1, "The beforeAll should be run once");
                equal(Myrtle(helpers, 'afterAll').callCount(),  1, "The afterAll should be run once");
                Myrtle.releaseAll();
                start();
                /*jslint newcap: true */
            }
        });
        
        helpers = {
            before : function () {
                x = 1;
            },
            after : function () {},
            beforeAll : function () {
                y = 2;
            },
            afterAll : function () {}
        };
        Myrtle.spy(helpers, "before");
        Myrtle.spy(helpers, "beforeAll");
        Myrtle.spy(helpers, "after");
        Myrtle.spy(helpers, "afterAll");
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
    asyncTest("Errors in the afterAll are reported on the last test", function () {
        var t;
        expect(3);
        t = new Tyrtle({
            callback : function () {
                equal(this.passes, 3, "the first three should have passed.");
                equal(this.fails, 1, "the last should have failed.");
                equal(this.errors, 1, "that failure should have been from an error.");
                start();
            }
        });
        t.module("foo", function () {
            this.afterAll(function () {
                throw "an error";
            });
            this.test("a", function () {});
            this.test("b", function () {});
            this.test("c", function () {});
            this.test("d", function () {});
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
});
