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
        this.test("Skip this test", function (assert) {
            this.skip("This test should be skipped.");
            
            assert.that(3).is(4)("This should never be executed.");
            var x = 0;
            x(); // this should never be executed, either.
        });
        this.test("Conditionally skipping", function (assert) {
            this.skipIf(++skipCounter % 2, "This will be skipped every second time.");
        });
    });
    tests.module("Failing assertions (these should all fail)", function () {
        this.test("Equality checking is strict", function (assert) {
            var x = 3;
            assert.that(x).is("3").since("Comparing to a string should fail");
        });
    });
    tests.run();
}());
