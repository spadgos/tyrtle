/*!
* Tyrtle - A JavaScript Unit Testing Framework
*
* Copyright (c) 2011-2012 Nick Fisher
* Distributed under the terms of the LGPL
* http://www.gnu.org/licenses/lgpl.html
*/
/*globals module, window */
var Tyrtle,
    Assert = require('Assert'),
    Module = require('Module'),
    renderer = require('renderer'),
    testStatuses = require('testStatuses'),
    util = require('util'),
    PASS = testStatuses.PASS,
    FAIL = testStatuses.FAIL,
    SKIP = testStatuses.SKIP,
    emptyRenderer,
    getParam,
    setParams,
    // root = require('root'),
    runningInNode
    // moduleAssertions = null,  // the extra assertions added by an individual module
;
runningInNode = typeof window === 'undefined';

//////////////////////////
//  RUNTIME PARAMETERS  //
//////////////////////////
//#JSCOVERAGE_IF 0
(function () {
var urlParams, loadParams;
loadParams = runningInNode
  ? function () {
    // node parameters must be set up manually and passed to the Tyrtle constructor
    // this is because a test harness may use its own command line parameters
    urlParams = {};
  }
  : function () {
    urlParams = {};
    var query, vars, i, l, pair;
    query = window.location.search.substring(1);
    vars = query.split("&");
    for (i = 0, l = vars.length; i < l; ++i) {
      pair = vars[i].split("=");
      urlParams[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
    }
  }
;

getParam = function (name) {
  if (!urlParams) {
    loadParams();
    loadParams = null;
  }
  return urlParams.hasOwnProperty(name) ? urlParams[name] : null;
};
setParams = function (params) {
  urlParams = params || {};
};
}());
//#JSCOVERAGE_ENDIF

module.exports = Tyrtle = function (options) {
  options = options || {};
  this.modules = [];
  this.callback = options.callback || util.noop;
  this.modFilter = options.modFilter === false
    ? null
    : (typeof options.modFilter === 'string'
       ? options.modFilter
       : getParam('modFilter')
      )
  ;
  this.testFilter = options.testFilter === false
    ? null
    : (typeof options.testFilter === 'string'
       ? options.testFilter
       : getParam('testFilter')
     )
  ;
};
emptyRenderer = {
  beforeRun      : util.noop,
  beforeModule   : util.noop,
  beforeTest     : util.noop,
  afterTest      : util.noop,
  afterModule    : util.noop,
  afterRun       : util.noop,
  templateString : function (message) {
    var args = Array.prototype.slice.call(arguments, 1);
    return message.replace(
      /\{([1-9][0-9]*|0)\}/g,
      function (str, p1) {
        var v = args[p1];
        return (v === null
          ? "NULL"
          : (typeof v === "undefined"
             ? "UNDEFINED"
             : (v.toString ? v.toString() : String(v))
          )
        );
      }
    );
  }
};

renderer.set(emptyRenderer);

// Static methods and properties
util.extend(Tyrtle, {
  PASS : PASS,
  FAIL : FAIL,
  SKIP : SKIP,
  util : util,
  addAssertions  : Assert.addAssertions,
  hasAssertion   : Assert.hasAssertion,
  removeAssertion: Assert.removeAssertion,
  /**
   *  Get the current renderer
   *  @return {Object}
   */
  getRenderer : renderer.get,
  /**
   *  Set the current renderer. This is a static method because the renderer is global to all instances of
   *  Tyrtle. If one of the renderer properties is not specified, then the corresponding property from
   *  `emptyRenderer` is used.
   *  @param {Object} renderer
   */
  setRenderer : function (rend) {
    util.each(emptyRenderer, function (val, key) {
      if (!(key in rend)) {
        rend[key] = val;
      }
    });
    renderer.set(rend);
  },
  /**
   *  Set the parameters which Tyrtle uses for default values. In the browser, Tyrtle will automatically use
   *  the parameters specified in the url.
   */
  setParams : setParams,
  /**
   * Static method used when you do not have an instance of Tyrtle yet. Modules returned by this function must
   * still be added to an instance of Tyrtle using Tyrtle.module()
   *
   * @param  {String} name The name of the module
   * @param  {Function} body   The body function of the module
   *
   * @return {Module}
   */
  module : function (name, body) {
    return new Module(name, body);
  }
});

// instance methods and properties
util.extend(Tyrtle.prototype, {
  passes : 0,
  fails : 0,
  errors : 0,
  skips : 0,
  startTime: 0,
  runTime: -1,
  ////
  /**
   * Create a new test module and add it to this instance of Tyrtle
   *
   * @param  {String} name The name for this module
   * @param  {Function} body The body of the module which can define tests, local variables and test helpers,
   *                         like before, after, beforeAll and afterAll
   */
  module : function (name, body) {
    var m;
    if (arguments.length === 1 && name instanceof Module) {
      m = name;
    } else if (arguments.length === 1 && typeof name === 'object') {
      util.each(name, function (body, name) {
        this.module(name, body);
      }, this);
      return;
    } else {
      m = new Module(name, body);
    }
    m.tyrtle = this;
    this.modules.push(m);
  },
  /**
   * Execute the test suite.
   */
  run : function () {
    var runNext,
      i = -1,
      l = this.modules.length,
      tyrtle = this
    ;
    this.startTime = +(new Date());
    renderer.get().beforeRun(this);
    runNext = function () {
      var mod;
      ++i;
      if (i === l) {
        tyrtle.runTime = +(new Date()) - tyrtle.startTime;
        renderer.get().afterRun(tyrtle);
        tyrtle.callback();
      } else {
        mod = tyrtle.modules[i];
        if (tyrtle.modFilter && mod.name !== tyrtle.modFilter) {
          runNext();
        } else {
          runModule(mod, tyrtle, function () {
            util.each(['passes', 'fails', 'errors', 'skips'], function (key) {
              tyrtle[key] += mod[key];
            });
            util.defer(runNext);
          });
        }
      }
    };
    runNext();
  }
});

function runModule (mod, tyrtle, callback) {
  renderer.get().beforeModule(mod, tyrtle);
  mod.run(function () {
    renderer.get().afterModule(mod, tyrtle);
    callback();
  });
}
