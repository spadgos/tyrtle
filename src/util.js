/**
 * Helper methods for Tyrtle. These are also exported on Tyrtle.util
 */
//#JSCOVERAGE_IF 0
var util,
    root = require('root'),
    nativeBind = Function.prototype.bind,
    slice = Array.prototype.slice;

function Ctor() {}

module.exports = util = {
  extend: function (target, source) {
    var i;
    for (i in source) {
      if (source.hasOwnProperty(i)) {
        target[i] = source[i];
      }
    }
    return target;
  },
  defer: !root.postMessage
        /**
         * The regular defer method using a 0ms setTimeout. In reality, this will be executed in 4-10ms.
         */
        ? function (fn) {
          setTimeout(fn, 0);
        }
        /**
         * The postMessage defer method which will get executed as soon as the call stack has cleared.
         * Credit to David Baron: http://dbaron.org/log/20100309-faster-timeouts
         */
        : (function () {
          var timeouts = [], messageName = "zero-timeout-message", setZeroTimeout, handleMessage;

          setZeroTimeout = function (fn) {
            timeouts.push(fn);
            root.postMessage(messageName, "*");
          };

          handleMessage = function (event) {
            if (event.source === root && event.data === messageName) {
              event.stopPropagation();
              if (timeouts.length > 0) {
                var fn = timeouts.shift();
                fn();
              }
            }
          };

          root.addEventListener("message", handleMessage, true);

          return function (func) {
            setZeroTimeout(func);
          };
        }()),
  noop: function () {},
  each: function (obj, iterator, context) {
    if (obj !== null && typeof obj !== 'undefined') {
      if (Array.prototype.forEach && obj.forEach === Array.prototype.forEach) {
        obj.forEach(iterator, context);
      } else {
        for (var key in obj) {
          if (obj.hasOwnProperty(key)) {
            iterator.call(context, obj[key], key, obj);
          }
        }
      }
    }
  },
  /**
   * PhantomJS's Object.keys implementation is buggy. It gives the following results:
   *    window.hasOwnProperty('setTimeout') === true
   *    Object.keys(window).indexOf('setTimeout') === -1
   * So, we're always falling back to the manual method
   */
  getKeys: function (obj) {
    /*jslint newcap : false */
    if (obj !== Object(obj)) {
      throw new TypeError('Invalid object');
    }
    /*jslint newcap : true */

    var keys = [], key;
    for (key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        keys[keys.length] = key;
      }
    }
    return keys;
  },
  isRegExp: function (obj) {
    return !!(obj && obj.test && obj.exec && (obj.ignoreCase || obj.ignoreCase === false));
  },
  isFunction: function(obj) {
    return Object.prototype.toString.call(obj) === '[object Function]';
  },
  /**
   * This function is taken from Underscore.js 1.1.6
   * (c) 2011 Jeremy Ashkenas, DocumentCloud Inc.
   * http://documentcloud.github.com/underscore
   */
  isEqual: function (a, b) {
    /*jslint eqeqeq: false */
    var aKeys, atype, bKeys, btype, key;
    // Check object identity.
    if (a === b) {
      return true;
    }
    // Different types?
    atype = typeof(a);
    btype = typeof(b);

    if (atype !== btype) {
      return false;
    }
    // One is falsy and the other truthy.
    if ((!a && b) || (a && !b)) {
      return false;
    }
    // One of them implements an isEqual()?
    if (a.isEqual) {
      return a.isEqual(b);
    }
    if (b.isEqual) {
      return b.isEqual(a);
    }
    // Check dates' integer values.
    if (util.isDate(a) && util.isDate(b)) {
      return a.getTime() === b.getTime();
    }
    // Both are NaN?
    if (a !== a && b !== b) {
      return false;
    }
    // Compare regular expressions.
    if (util.isRegExp(a) && util.isRegExp(b)) {
      return a.source     === b.source
          && a.global     === b.global
          && a.ignoreCase === b.ignoreCase
          && a.multiline  === b.multiline
      ;
    }
    // If a is not an object by this point, we can't handle it.
    if (atype !== 'object') {
      return false;
    }
    // Check for different array lengths before comparing contents.
    if (a.length && (a.length !== b.length)) {
      return false;
    }
    // Nothing else worked, deep compare the contents.
    aKeys = util.getKeys(a);
    bKeys = util.getKeys(b);
    // Different object sizes?
    if (aKeys.length !== bKeys.length) {
      return false;
    }
    // Recursive comparison of contents.
    for (key in a) {
      if (!(key in b) || !util.isEqual(a[key], b[key])) {
        return false;
      }
    }
    /*jslint eqeqeq: true */
    return true;
  },
  isDate: function isDate (obj) {
    return !!(obj && obj.getTimezoneOffset && obj.setUTCFullYear);
  },
  isArray: Array.isArray || function isArray (obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
  },
  // This method stolen from Underscore
  bind: function bind(func, context) {
    var bound, args;
    if (func.bind === nativeBind && nativeBind) {
      return nativeBind.apply(func, slice.call(arguments, 1));
    }
    if (!util.isFunction(func)) {
      throw new TypeError;
    }
    args = slice.call(arguments, 2);
    bound = function() {
      if (!(this instanceof bound)) {
        return func.apply(context, args.concat(slice.call(arguments)));
      }
      Ctor.prototype = func.prototype;
      var self = new Ctor;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) {
        return result;
      }
      return self;
    };
    return bound;
  }
};

//#JSCOVERAGE_ENDIF
