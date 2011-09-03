/*globals jQuery, asyncTest, test, Tyrtle, equal, expect, start */
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
});
