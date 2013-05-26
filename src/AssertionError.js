/**
 * AssertionError exception class. An instance of this class is thrown whenever an assertion fails.
 * @class
 * @param {String} msg A message for the failed assertion, this is defined by the assertion itself.
 * @param {Array} args Arguments passed to the assertion, these are used to substitute into the error message.
 * @param {String} userMessage An error message as defined by the user.
 */
var AssertionError,
    renderer = require('renderer'),
    util = require('util');

module.exports = AssertionError = function (msg, args, userMessage) {
  var newError = new Error(),
      re_stack = /([^(\s]+\.js):(\d+):(\d+)/g
  ;
  this.message = renderer.get().templateString.apply(
    renderer.get(),
    [(msg || "") + (msg && userMessage ? ": " : "") + (userMessage || "")].concat(args)
  );
  if (newError.stack) { // TODO: cross-browser implementation
    this.stack = [];
    util.each(newError.stack.match(re_stack), function (str) {
      re_stack.lastIndex = 0;
      var parts = re_stack.exec(str);
      if (parts) {
        this.stack.push(parts.slice(1));
      }
    }, this);

    this.stack = this.stack.slice(3);
  }
};
AssertionError.prototype.name = "AssertionError";
