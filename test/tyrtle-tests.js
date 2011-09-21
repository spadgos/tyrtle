/*globals asyncTest, test, Tyrtle, equal, expect, start, raises, ok, module */
module("Tyrtle");

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
asyncTest("Errors in asynchronous tests", function () {
    var t;
    expect(2);
    t = new Tyrtle({
        callback : function () {
            equal(t.fails, 1, "Test should be failed");
            equal(t.errors, 1, "Test should be errored");
            start();
        }
    });
    t.module("foo", function () {
        this.test("a", function (callback) {
            throw 'foo';
        }, function (assert) {});
    });
    t.run();
});
asyncTest("Errors in the asynchronous callback", function () {
    var t;
    expect(2);
    t = new Tyrtle({
        callback : function () {
            equal(t.fails, 1);
            equal(t.errors, 1);
            start();
        }
    });
    t.module('foo', function () {
        this.test('a', function (callback) {
            callback();
        }, function (assert) {
            throw 'abc';
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
asyncTest("Custom renderers can be used", function () {
    var t, r, noop, br, bm, bt, at, am, ar, ts, old = Tyrtle.getRenderer();
    noop = function () {};
    r = {
        beforeRun : function () {
            ++br;
        },
        beforeModule : function () {
            ++bm;
        },
        beforeTest : function () {
            ++bt;
        },
        afterTest : function () {
            ++at;
        },
        afterModule : function () {
            ++am;
        },
        afterRun : function () {
            ++ar;
        },
        templateString : function (s) {
            ++ts;
            return s;
        }
    };
    br = bm
       = bt
       = at
       = am
       = ar
       = ts
       = 0
    ;
    Tyrtle.setRenderer(r);

    t = new Tyrtle({
        callback : function () {
            equal(br, 1, "The beforeRun function was not called as often as expected.");
            equal(bm, 2, "The beforeModule function was not called as often as expected.");
            equal(bt, 4, "The beforeTest function was not called as often as expected.");
            equal(at, 4, "The afterTest function was not called as often as expected.");
            equal(am, 2, "The afterModule function was not called as often as expected.");
            equal(ar, 1, "The afterRun function was not called as often as expected.");
            ok(ts > 0, "The templateString function should have been used.");
            t.modules[0].rerunTest(t.modules[0].tests[0], t, function () {
                equal(br, 1, "Rerun: The beforeRun function was not called as often as expected.");
                equal(bm, 2, "Rerun: The beforeModule function was not called as often as expected.");
                equal(bt, 5, "Rerun: The beforeTest function was not called as often as expected.");
                equal(at, 5, "Rerun: The afterTest function was not called as often as expected.");
                equal(am, 3, "Rerun: The afterModule function was not called as often as expected.");
                equal(ar, 2, "Rerun: The afterRun function was not called as often as expected.");
                start();
                Tyrtle.setRenderer(old);
            });
        }
    });
    t.module("a", function () {
        this.test("aa", function () {});
        this.test("ab", function () {});
    });
    t.module("b", function () {
        this.test("ba", function () {});
        this.test("bb", function (assert) {
            assert(2 + 2)(5)();
        });
    });
    t.run();
});
module("Assertions");
asyncTest("Tyrtle assertions", function () {
    var t = new Tyrtle({
        callback : function () {
            equal(t.passes, t.modules[0].tests.length, "All tests should have passed in the first module");
            equal(t.fails, t.modules[1].tests.length, "All tests should have failed in the second module");
            start();
        }
    });
    t.module("Passing tests", function () {
        this.test("Passing tests", function (assert) {
            var x = 3, undef, a, CustomError = function () {};
            assert.that(x).is(3).since("x should be three");
            assert.that(x).is(3)("x should be three");
            assert(x).is(3)("x should be three");
            assert(x)(3)("x should be three");

            assert.that(x).is.not('3').since("x should not be a string");
            assert.that(x).is.not('3')("x should not be a string");
            assert(x).is.not('3')("x should not be a string");
            assert(x).not('3')('x should not be a string');

            assert.that(x).not(undef)("x should not be undefined");
            assert.that(x).is.not(undef)("x should not be undefined when using `is`");

            assert.that(Math.sqrt(-1)).is(NaN)("Should be able to compare to NaN");
            assert.that(Math.sqrt(4)).is.not(NaN)("Should be able to compare against NaN");

            // ofType
            assert.that(3).is.ofType('number').since('3 should be a number');
            assert('3').ofType('string')('"3" should be a string');
            assert.that({}).is.ofType('object')('{} is an object');
            assert.that([]).is.ofType('object')('arrays are objects too');
            assert.that(/a/).is.ofType('object')('regexes are objects');
            assert.that(null).is.ofType('object')('strangely, null is an object');
            assert.that(undef).is.ofType('undefined')('undefined variables are undefined');
            assert.that(function () {}).is.ofType('function')();

            // ok
            assert(true).ok()("True should be ok");
            assert.that(1).ok()("Non-zero numbers should be ok");
            assert.that({}).is.ok()("All objects (even empty) are ok");

            // matches
            assert.that("abbbc").matches(/ab+c/)();

            // endsWith
            a = assert.that("abcdef");
            a.endsWith("def")();
            a.endsWith("abcdef")();
            a.startsWith("abc")();
            a.startsWith("abcdef")();
            a.contains("bcd")();
            a.contains("abc")();
            a.contains("abcdef")();

            // willThrow
            a = assert.that(function () {
                throw 'abc';
            });
            a.willThrow('abc')();
            a.willThrow(/c/)();

            a = assert.that(function () {
                throw new Error('abc');
            });
            a.willThrow('abc')();
            a.willThrow(/c/)();

            assert.that(function () {
                throw 'abc';
            }).willThrow()();
            assert.that(function () {
                throw new CustomError();
            }).willThrow(CustomError)();

            // wontThrow
            assert.that(function () {}).wontThrow()();

            //object equality
            assert
                .that([1, 2, 3])
                .equals([1, 2, 3])()
            ;
            assert
                .that(1)
                .equals(1)()
            ;
            assert
                .that("abc")
                .equals("abc")()
            ;
            assert
                .that({a : 'b', c : 'd'})
                .equals({a : 'b', c : 'd'})()
            ;
            assert
                .that(/abc/gim)
                .equals(/abc/mig)()
            ;
            assert.that({a : {b : 'c'}, d : {e : [/f/]}})
                .equals({a : {b : 'c'}, d : {e : [/f/]}})()
            ;
            assert.that(new Date(123456789)).equals(new Date(123456789))();
        });
    });
    t.module("failing tests", function () {
        this.test("Equality checking is strict", function (assert) {
            var x = 3;
            assert.that(x).is("3").since("Comparing to a string should fail");
        });
        this.test("Objects are tested for identity", function (assert) {
            assert.that([]).is([]).since("Two different objects are not identical");
        });
        this.test("Different objects are different", function (assert) {
            assert(['a', 'b', 'c'])({a : 'A', b : ['b'], c : {see : 'C'}})();
        });
        this.test("Not should reject identical variables", function (assert) {
            assert.that(3).not(3).since("Two identical objects should be the same");
        });
        this.test("Matches", function (assert) {
            assert.that("abbbc").matches(/^c/)();
        });
        this.test("Ok", function (assert) {
            assert.that(false).ok()();
        });
        this.test("Not NaN", function (assert) {
            assert(NaN).not(NaN)();
        });
        this.test("startsWith 1", function (assert) {
            assert.that("abcdef").startsWith("bcdef")();
        });
        this.test("startsWith 2", function (assert) {
            assert.that("abcdef").startsWith("abcdefg")();
        });
        this.test("startsWith 3", function (assert) {
            assert.that(123456).startsWith('123')();
        });
        this.test("endsWith 1", function (assert) {
            assert.that("abcdef").endsWith("abcde")();
        });
        this.test("endsWith 2", function (assert) {
            assert.that("abcdef").endsWith("abcdefg")();
        });
        this.test("endsWith 3", function (assert) {
            assert.that(123456).endsWith('456')();
        });
        this.test("willThrow 1", function (assert) {
            assert.that(function () {}).willThrow()();
        });
        this.test("willThrow 2", function (assert) {
            var CustomError = function () {},
                CustomError2 = function () {}
            ;
            assert.that(function () {
                throw new CustomError();
            }).willThrow(CustomError2)();
        });
        this.test("wontThrow", function (assert) {
            assert(function () {
                throw 'abc';
            }).wontThrow()();
        });
        this.test("equals NaN", function (assert) {
            assert(NaN).equals(NaN)();
        });
        this.test("equals array", function (assert) {
            assert([3, 2, 1]).equals([1, 2, 3])();
        });
        this.test("equals of different types", function (assert) {
            assert(3).equals('3')();
        });
    });
    t.run();
});
