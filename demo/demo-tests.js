/*globals Tyrtle */
(function () {
    var tests = new Tyrtle();
    
    tests.module("Tyrtle tests", function () {
        
        this.test("Checking for equality", function (assert) {
            var x = 3;
            assert.that(x).is(3).since("x should be three");
            assert.that(x).is.not("3").since("x should not be a string");
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
