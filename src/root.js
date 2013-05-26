/**
 * Gets the global object
 */
module.exports = (function () {
  return this || (0 || eval)('this');
}());
