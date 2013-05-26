/**
 * SkipMe exception. This is thrown by tests when `this.skip()` or `this.skipIf(true)` is called.
 * @class
 * @param {String} reason A reason for this test to be skipped.
 */
var SkipMe;
module.exports = SkipMe = function (reason) {
  this.message = reason;
};
SkipMe.prototype.name = 'SkipMe';
