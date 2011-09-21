/*globals asyncTest, test, Tyrtle, equal, expect, start, raises, ok, module */
module('Assertions');
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

asyncTest("Custom assertions can be created", function () {
    expect(5);
    var t;
    t = new Tyrtle({
        callback : function () {
            var tests = t.modules[0].tests;
            equal(tests[0].status, Tyrtle.PASS, "The first test should have passed");
            equal(tests[0].statusMessage, "Passed");

            equal(tests[1].status, Tyrtle.FAIL, "The second test should have failed");
            equal(tests[1].statusMessage, "Failed: 123 should be alphabetical");

            equal(tests[2].status, Tyrtle.PASS, "The third test should have passed.");
            start();
        }
    });
    t.module("first", function () {
        this.addAssertions({
            alpha : function (subject) {
                return (/^[a-z]+$/).test(subject);
            }
        });
        this.addAssertions({
            lessThan : function (subject, num) {
                return subject < num;
            }
        });
        this.test("letters", function (assert) {
            assert.that("abc").is.alpha()("abc should be alphabetical");
        });
        this.test("numbers", function (assert) {
            assert.that("123").is.alpha()("123 should be alphabetical"); // not..!
        });
        this.test("numbers 2", function (assert) {
            assert.that(3).is.lessThan(4)("3 should be less than 4");
        });
    });
    t.run();
});

asyncTest("Custom assertions are not shared between modules", function () {
    expect(5);
    var t;
    t = new Tyrtle({
        callback : function () {
            start();
        }
    });
    t.module("first", function () {
        this.addAssertions({
            alpha : function (subject) {
                return (/^[a-z]+$/).test(subject);
            }
        });

        this.test("letters", function (assert) {
            equal(typeof assert.that('abc').is.alpha, 'function', "the assert object should have the custom fn");
        });
    });
    t.module("second", function () {
        this.addAssertions({
            numeric : function (subject) {
                return (/^\d+$/).test(subject);
            }
        });
        this.test("numbers", function (assert) {
            equal(typeof assert.that('123').is.numeric, 'function', "This function should have the custom fn");
            equal(typeof assert.that('123').is.alpha, 'undefined', "The previous module's fn should not be here");
        });
    });
    t.module("third", function () {
        this.test("numbers", function (assert) {
            equal(typeof assert.that('123').is.numeric, 'undefined', "The previous module's fn should not be here");
            equal(typeof assert.that('123').is.alpha, 'undefined', "The previous module's fn should not be here");
        });
    });

    t.run();
});

asyncTest("Custom assertions can override built-in assertions", function () {
    var t;
    expect(2);
    t = new Tyrtle({
        callback : function () {
            equal(t.modules[0].tests[0].status, Tyrtle.PASS, "first test should have passed");
            equal(t.modules[0].tests[1].status, Tyrtle.FAIL, "second test should have failed");
            start();
        }
    });
    t.module("first", function () {
        this.addAssertions({
            ok : function (subject) {
                return subject === 'nickf';
            }
        });

        this.test("ok", function (assert) {
            assert.that('nickf').is.ok()("he's a cool guy!");
        });
        this.test("ok 2", function (assert) {
            assert.that('you').is.ok()("you're not a cool guy!");
        });
    });
    t.run();
});
asyncTest("Custom error messages with assertions", function () {
    var t;
    expect(2);
    t = new Tyrtle({
        callback : function () {
            equal(t.modules[0].tests[0].statusMessage, "Failed: you is not nickf: you're not a cool guy!");
            equal(t.modules[0].tests[1].statusMessage, "Failed: you is not nickf");
            start();
        }
    });
    t.module("first", function () {
        this.addAssertions({
            ok : function (subject) {
                return subject === 'nickf' || "{0} is not nickf";
            },
            lessThan : function (subject, expected) {
                return subject < expected || "{0} is not less than {1}";
            }
        });

        this.test("ok", function (assert) {
            assert.that('you').is.ok()("you're not a cool guy!");
        });
        this.test("ok 2", function (assert) {
            assert.that('you').is.ok()();
        });
    });
    t.run();
});

asyncTest("Custom assertions are reapplied to rerun functions", function () {
    expect(10);
    var t;
    t = new Tyrtle({
        callback : function () {
            var mods = t.modules;
            mods[0].rerunTest(mods[0].tests[0], t, function () {
                mods[1].rerunTest(mods[1].tests[0], t, function () {
                    mods[2].rerunTest(mods[2].tests[0], t, function () {
                        start();
                    });
                });
            });
        }
    });
    t.module("first", function () {
        this.addAssertions({
            alpha : function (subject) {
                return (/^[a-z]+$/).test(subject);
            }
        });

        this.test("letters", function (assert) {
            equal(typeof assert.that('abc').is.alpha, 'function', "the assert object should have the custom fn");
        });
    });
    t.module("second", function () {
        this.addAssertions({
            numeric : function (subject) {
                return (/^\d+$/).test(subject);
            }
        });
        this.test("numbers", function (assert) {
            equal(typeof assert.that('123').is.numeric, 'function', "This function should have the custom fn");
            equal(typeof assert.that('123').is.alpha, 'undefined', "The previous module's fn should not be here");
        });
    });
    t.module("third", function () {
        this.test("numbers", function (assert) {
            equal(typeof assert.that('123').is.numeric, 'undefined', "The previous module's fn should not be here");
            equal(typeof assert.that('123').is.alpha, 'undefined', "The previous module's fn should not be here");
        });
    });

    t.run();
});
