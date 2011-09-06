/*globals Tyrtle */
(function () {
    var tests = new Tyrtle();
    
    tests.module("Tyrtle tests", function () {
        var skipCounter = 0;
        
        this.test("Checking for equality", function (assert) {
            var x = 3;
            assert.that(x).is(3).since("x should be three");
            assert.that(x).is.not("3").since("x should not be a string");
        });
        this.test("Checking types", function (assert) {
            this.skipIf(!assert().ofType, "ofType has not been implemented yet");
            var x;
            assert.that(3).is.ofType('number').since('3 should be a number');
            assert('3').ofType('string')('"3" should be a string');
            assert.that({}).is.ofType('object')('{} is an object');
            assert.that([]).is.ofType('object')('arrays are objects too');
            assert.that(/a/).is.ofType('object')('regexes are objects');
            assert.that(null).is.ofType('object')('strangely, null is an object');
            assert.that(x).is.ofType('undefined')('undefined variables are undefined');
            assert.that(function () {}).is.ofType('function')();
        });
        this.test("Skip this test", function (assert) {
            this.skip("This test should be skipped.");
            
            assert.that(3).is(4)("This should never be executed.");
            var x = 0;
            x(); // this should never be executed, either.
        });
        this.test("Conditionally skipping", function (assert) {
            this.skipIf(++skipCounter % 2, "This will be skipped every second time.");
        });
        this.test("This is an asynchronous test", function (callback) {
            setTimeout(function () {
                callback({
                    x : 1,
                    y : 2
                });
            }, 15);
        }, function (assert) {
            assert.that(this.x).is(1)("x should be one");
            assert.that(this.y).is(2)("y should be two");
        });
    });
    tests.module("Failing assertions (these should all fail)", function () {
        this.test("Equality checking is strict", function (assert) {
            var x = 3;
            assert.that(x).is("3").since("Comparing to a string should fail");
        });
    });
    tests.module("Tests which have asynchronous before helpers", function () {
        var x;
        this.before(function (cb) {
            setTimeout(function () {
                x = 2;
                cb();
            }, 5);
        });
        this.test("Check that the before is executed first", function (assert) {
            assert.that(x).is(2)("The before should have finished running before this test.");
            x = -666;
        });
        this.test("And again, in between the tests", function (assert) {
            assert.that(x).is(2)("The before should have run again before this test.");
        });
    });
    tests.module("Tests which have asynchronous after helpers", function () {
        var x, y;
        this.beforeAll(function () {
            x = null;
            y = true;
        });
        this.after(function (cb) {
            setTimeout(function () {
                x = 1;
                cb();
            }, 5);
        });
        this.test("Check that the after has not run yet", function (assert) {
            assert.that(x).is(null)("The beforeAll should have set x to null.");
            x = -666;
            y = false;
        });
        this.test("Check that the after has executed now", function (assert) {
            this.skipIf(y, "This test should only be run after the first test in this module.");
            assert.that(x).is(1)("The after should have run before this test.");
        });
    });
    tests.module("Tests which have asynchronous beforeAll helpers", function () {
        var x, y;
        this.beforeAll(function (cb) {
            setTimeout(function () {
                x = 1;
                cb();
            }, 5);
        });
        this.test("Check that the beforeAll has run yet", function (assert) {
            assert.that(x).is(1)("The beforeAll should have set x to 1.");
            x = -666;
            y = false;
        });
        this.test("Check that the after has executed now", function (assert) {
            this.skipIf(y, "This test should only be run after the first test in this module.");
            assert.that(x).is(-666)("The beforeAll should not have run again.");
        });
    });
    tests.run();
}());
