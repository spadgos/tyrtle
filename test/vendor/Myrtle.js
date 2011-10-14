/*!
 * Myrtle - A JavaScript Mocking Framework
 * @version 1.0.0
 *
 * https://github.com/spadgos/myrtle/wiki
 *
 * Copyright (c) 2011 Nick Fisher
 * Distributed under the terms of the LGPL
 * http://www.gnu.org/licenses/lgpl.html
 */
/*globals module */
/*jslint newcap: false */
(function (root) {
    var M,
        noop,
        undef,
        isEmpty
    ;

    noop = function () {};
    //////////////////////////
    //  SPYING AND MOCKING  //
    //////////////////////////
    (function () {
        var MyrtleHandle,
            store = [],
            addToStore,
            getFromStore,
            removeFromStore,
            cleanUp,
            makeFuncWithLength
        ;
        /**
         * Myrtle
         *
         * @param  {Object}             obj             Description
         * @param  {String}             fnName          The name of a function
         * @param  {Object}             options         Options for this function
         * @param  {Boolean}            options.spy     Whether the function should be spied upon.
         * @param  {Boolean}            options.profile Whether the function should be profiled.
         * @param  {Boolean|Function}   options.stub    A function to run instead of the original function, or true for
         *                                              no action, or false to disable stubbing.
         * @return {Object} A Myrtle handle to the method
         */
        M = function (obj, fnName, options) {
            var fn = obj[fnName],
                info
            ;
            options = options || {};
            if (typeof fn !== 'function') {
                throw new Error("Supplied variable (" + fnName + ") is not a function.");
            }
            info = getFromStore(fn);
            if (!info) {
                info = addToStore(obj, fnName, fn);
            }
            if (typeof options.spy !== 'undefined') {
                info.spy = !!options.spy;
            }
            if (typeof options.profile !== 'undefined') {
                info.profile = !!options.profile;
            }
            if (typeof options.stub !== 'undefined') {
                info.stub = options.stub === true ? null : options.stub;
                if (typeof info.stub === 'function' && typeof info.stub.__myrtleStub !== 'undefined') {
                    info.stub.__myrtleStub = true;
                }
            }
            return info.api;
        };
        /**
         * Spy on an object's method
         *
         * @param  {Object} obj      An object which holds the method to spy upon
         * @param  {String} fnName   The name of the method.
         *
         * @return {Object} A Myrtle handle to the method
         */
        M.spy = function (obj, fnName) {
            return M(obj, fnName, {
                spy : true
            });
        };

        /**
         * Stub an object's method
         *
         * @param  {Object} obj      An object which holds the method to spy upon
         * @param  {String} fnName   The name of the method.
         *
         * @return {Object} A Myrtle handle to the method
         */
        M.stub = function (obj, fnName, fn) {
            return M(obj, fnName, {
                stub : typeof fn === 'undefined' ? true : fn
            });
        };

        /**
         * Profile an object's method
         *
         * @param  {Object} obj      An object which holds the method to spy upon
         * @param  {String} fnName   The name of the method.
         *
         * @return {Object} A Myrtle handle to the method
         */
        M.profile = function (obj, fnName) {
            return M(obj, fnName, {
                profile : true
            });
        };
        /**
         * Get the number of methods which Myrtle has modified.
         *
         * @return {Number}
         */
        M.size = function () {
            return store.length;
        };
        /**
         * Release (restore) all the methods which Myrtle has modified.
         */
        M.releaseAll = function () {
            var info;
            while ((info = store.pop())) {
                cleanUp(info);
            }
        };
        /**
         * Check whether a given function is one which has been modified by Myrtle.
         *
         * @return {Boolean} true if the given method has been modified
         */
        M.hasModified = function (fn) {
            return getFromStore(fn, true) !== -1;
        };

        /**
         * The MyrtleHandle is what is returned from any of the spying/stubbing/profiling functions. It provides an API
         * to metadata about the modified method.
         */
        MyrtleHandle = function (info) {
            this.getHistory = this.h = function () {
                return info.history;
            };
            this.release = function () {
                removeFromStore(info.origObj[info.origFnName]);
            };
        };
        /**
         * Gets the number of times this method has been invoked.
         * @return {Number}
         */
        MyrtleHandle.prototype.callCount = function () {
            return this.h().length;
        };
        /**
         * Gets the history information about the last invocation.
         * @return {Object}
         */
        MyrtleHandle.prototype.last = function () {
            var h = this.h();
            return h[h.length - 1]; // h[-1] is ok.. undefined is the desired result in this case
        };
        /**
         * Gets the value last returned by this method.
         * @return {*}
         */
        MyrtleHandle.prototype.lastReturn = function () {
            var l = this.last();
            return l && l.ret;
        };
        /**
         * Gets the arguments last passed to this method.
         * @return {Array.<*>}
         */
        MyrtleHandle.prototype.lastArgs = function () {
            var l = this.last();
            return l && l.args;
        };
        /**
         * Gets the context (`this`) during the last invocation of this method
         * @return {*}
         */
        MyrtleHandle.prototype.lastThis = function () {
            var l = this.last();
            return l && l['this'];
        };
        /**
         * Gets the error thrown during the last invocation of this method, if any.
         *
         * @return {*} Undefined will be returned if nothing was thrown.
         */
        MyrtleHandle.prototype.lastError = function () {
            var l = this.last();
            return l && l.error;
        };
        /**
         * Gets the average running time of this method.
         * @return {Number}
         */
        MyrtleHandle.prototype.getAverageTime = function () {
            var total = 0, count = 0, i, l, h, history = this.h();
            for (i = 0, l = history.length; i < l; ++i) {
                h = history[i];
                if (h.time !== false) {
                    total += h.time;
                    ++count;
                }
            }
            return count && (total / count);
        };
        /**
         * Gets the history information about the quickest invocation of this function.
         * @return {Object}
         */
        MyrtleHandle.prototype.getQuickest = function () {
            var quickest = null, quickestIndex = -1, i, l, h, history = this.h();
            for (i = 0, l = history.length; i < l; ++i) {
                h = history[i];
                if (h.time !== false) {
                    if (quickest === null || h.time < quickest) {
                        quickest = h.time;
                        quickestIndex = i;
                    }
                }
            }
            return history[quickestIndex];
        };
        /**
         * Gets the history information about the slowest invocation of this function.
         * @return {Object}
         */
        MyrtleHandle.prototype.getSlowest = function () {
            var slowest = null, slowestIndex = -1, i, l, h, history = this.h();
            for (i = 0, l = history.length; i < l; ++i) {
                h = history[i];
                if (h.time !== false) {
                    if (slowest === null || h.time > slowest) {
                        slowest = h.time;
                        slowestIndex = i;
                    }
                }
            }
            return history[slowestIndex];
        };
        /**
         * Resets the history information for this method.
         */
        MyrtleHandle.prototype.reset = function () {
            this.h().splice(0); // remove all items from the array without actually replacing it.
        };
        /**
         * Replace all the functions on the handle with no-ops.
         */
        MyrtleHandle.prototype.destroy = function () {
            var i;
            for (i in this) {
                if (this.hasOwnProperty(i)) {
                    this[i] = noop;
                }
            }
            for (i in MyrtleHandle.prototype) {
                if (MyrtleHandle.prototype.hasOwnProperty(i)) {
                    this[i] = noop;
                }
            }
        };
        /**
         * Executes a function and then releases this method, even if an error is thrown during execution.
         * The MyrtleHandle object is accessible by `this`.
         *
         * Example usage:
         *
         *      Myrtle.spy(myObj, 'foo').and(function () {
         *          myObj.foo();
         *          assert.that(this.callCount()).is(1).since("The method should be called once");
         *      });
         *
         * @param  {Function} fn A function to execute
         */
        MyrtleHandle.prototype.and = function (fn) {
            try {
                fn.call(this);
            } finally {
                this.release();
            }
        };
        ////////////////////////////////////////
        getFromStore = function (fn, indexOnly) {
            var i, l;
            for (i = 0, l = store.length; i < l; ++i) {
                if (store[i].origObj[store[i].origFnName] === fn) {
                    return indexOnly ? i : store[i];
                }
            }
            return indexOnly ? -1 : undef;
        };
        removeFromStore = function (fn) {
            var ind = getFromStore(fn, true),
                info
            ;
            if (ind !== -1) {
                info = store.splice(ind, 1)[0];
                cleanUp(info);
            }
        };
        cleanUp = function (info) {
            var i;
            if (info.wasOwnFn) {
                // if the function existed on the object originally (not on its prototype), then put it back.
                info.origObj[info.origFnName] = info.origFn;
            } else {
                // otherwise, just remove the function we added.
                delete info.origObj[info.origFnName];
            }
            info.api.destroy();
            for (i in info) {
                if (info.hasOwnProperty(i)) {
                    delete info[i];
                }
            }
        };
        /**
         * Add a function into the store and get its metadata back
         */
        addToStore = function (obj, fnName, fn) {
            var info, replacement;
            info = {
                origObj : obj,                          // the object which holds the function
                origFnName : fnName,                    // the name of the function on that object
                origFn : fn,                            // the original function
                wasOwnFn : obj.hasOwnProperty(fnName),  // whether the function existed on that object directly or not
                                                        // USER SET OPTIONS:
                stub : false,                           // Whether this function is being stubbed.
                profile : false,                        // Whether this function is being profiled.
                spy : false,                            // Whether this function is being spied upon.

                history : []                            // Data about each call to this function
            };
            obj[fnName] = makeFuncWithLength(fn.length, function () {
                var ret, args, boundFn, startTime, error;

                // get the arguments passed to this function
                args = Array.prototype.slice.apply(arguments);

                // wrap the original function in a closure so that we can control the context during the call.
                // calling `boundFn()` will always have the original object set as `this`.
                boundFn = function () {
                    return info.origFn.apply(info.origObj, arguments);
                };

                // execute the original function, or the stub
                if (info.profile) {
                    startTime = new Date();
                }
                try {
                    ret = (info.stub === false)
                        ? info.origFn.apply(this, args)
                        : (info.stub
                           ? info.stub.apply(this, [boundFn].concat(args))
                           : undef
                        )
                    ;
                } catch (e) {
                    error = e;
                }
                if (info.spy || info.profile) {
                    info.history.push({
                        time   : info.profile && (new Date() - startTime),
                        ret    : info.spy ? ret : undef,
                        args   : info.spy ? args : undef,
                        'this' : this,
                        error  : error
                    });
                }
                if (error) {
                    throw error;
                } else {
                    return ret;
                }
            });
            info.api = new MyrtleHandle(info);

            store.push(info);
            return info;
        };

        /**
         * Creates a function with its length set to a specific number.
         * This is needed so that a function which has been spied upon keeps the same length property.
         *
         *     o.foo = function (a, b) {};
         *     o.foo.length;         // 2
         *     Myrtle.spy(o, 'foo');
         *     o.foo.length;         // 2
         *
         * @param  {Number} length     The desired length of the function
         * @param  {Function} fn       The actual function to execute
         *
         * @return {Function}
         */
        makeFuncWithLength = function (length, fn) {
            var args = [], i, evil;
            /*jslint white: false */
            switch (length) {
            case 0 : return function () {            return fn.apply(this, arguments); };
            case 1 : return function (a) {           return fn.apply(this, arguments); };
            case 2 : return function (a,b) {         return fn.apply(this, arguments); };
            case 3 : return function (a,b,c) {       return fn.apply(this, arguments); };
            case 4 : return function (a,b,c,d) {     return fn.apply(this, arguments); };
            case 5 : return function (a,b,c,d,e) {   return fn.apply(this, arguments); };
            case 6 : return function (a,b,c,d,e,f) { return fn.apply(this, arguments); };
            default :
                /*jslint white: true */
                /*jslint evil: true */
                args = [];
                for (i = 0; i < length; ++i) {
                    args.push('_' + i.toString(36));
                }
                evil = new Function("func",
                    "return function (" + args.join(",") + ") {"
                    + "    return func.apply(this, arguments);"
                    + "};"
                );
                /*jslint evil: false */
                return evil(fn);
            }
        };
    }());

    ////////////////////
    //  TIMERS MODULE //
    ////////////////////
    (function () {
        var counter,
            currentTime,
            queue,
            reset
        ;

        reset = function () {
            counter = 0;
            currentTime = 0;
            queue = {};
        };

        reset();

        M.fakeTimers = function (opt_fn) {
            M.stub(root, 'setTimeout', function (orig, fn, time) {
                var executeAt, id;

                time = Math.max(parseInt(time, 10) || 1, 1);

                executeAt = currentTime + time;

                if (fn.__myrtle_setInterval) {
                    id = fn.__myrtle_setInterval;
                } else {
                    id = ++counter;
                }
                if (typeof queue[executeAt] === 'undefined') {
                    queue[executeAt] = {};
                }
                queue[executeAt][id] = fn;
                return id;
            });

            M.stub(root, 'clearTimeout', function (orig, id) {
                var t;
                if (id && id <= counter) {
                    for (t in queue) {
                        if (queue.hasOwnProperty(t)) {
                            if (typeof queue[t][id] !== 'undefined') {
                                delete queue[t][id];
                                if (isEmpty(queue[t])) {
                                    delete queue[t];
                                }
                                return;
                            }
                        }
                    }
                }
            });

            M.stub(root, 'setInterval', function (orig, fn, time) {
                var id, wrapped;

                time = Math.max(parseInt(time, 10) || 1, 1);

                wrapped = function () {
                    fn.call(root);
                    root.setTimeout(wrapped, time);
                };
                id = root.setTimeout(wrapped, time);
                wrapped.__myrtle_setInterval = id;
                return id;
            });
            M.stub(root, 'clearInterval', function (orig, id) {
                root.clearTimeout(id);
            });

            if (typeof opt_fn === 'function') {
                try {
                    opt_fn();
                } finally {
                    M.realTimers();
                }
            }
        };

        M.realTimers = function () {
            M(root, 'setTimeout').release();
            M(root, 'clearTimeout').release();
            M(root, 'setInterval').release();
            M(root, 'clearInterval').release();
            reset();
        };

        M.tick = function (time) {
            var f, destination;
            if (typeof time !== 'number' || Math.floor(time) !== time || time < 1) {
                throw "tick() only accepts positive integer input";
            }

            if (!M.hasModified(root.setTimeout)) {
                throw "Fake timers are not currently active.";
            }
            destination = currentTime + time;

            if (isEmpty(queue)) {
                return;
            }

            // TODO: this is highly inefficient...
            for (++currentTime; currentTime <= destination; ++currentTime) {
                if (queue.hasOwnProperty(currentTime)) {
                    for (f in queue[currentTime]) {
                        if (queue[currentTime].hasOwnProperty(f)) {
                            queue[currentTime][f].call(root);
                        }
                    }
                    delete queue[currentTime];
                }
            }
            currentTime = destination;
        };
    }());

    /////////////////////////
    //  FUNCTION BUILDERS  //
    /////////////////////////
    (function () {
        var getMatchingMap = function (map, args) {
            var i, l, a, al = args.length, match, matchFound;

            // loop over the stored arguments to find a match
            for (i = 0, l = map.length; i < l; ++i) {
                if (map[i].args.length === al) {
                    matchFound = true;
                    for (a = 0; a < al; ++a) {
                        if (map[i].args[a] !== args[a]) {
                            matchFound = false;
                            break;
                        }
                    }
                    if (matchFound) {
                        match = map[i];
                        break;
                    }
                }
            }
            return match;
        };
        /**
         * Create a function whose return values and behaviour can be modified by setting up preconditions and actions
         * using the supplied methods on the object itself: `when`, `then` and `otherwise`
         *
         * @param  {Function?}  baseFn  Optional function to base this modified function on. Passing a function here
         *                              essentially the same as calling `.otherwise().run(baseFn)`
         * @return {Function}
         */
        M.fn = function (baseFn) {
            var f,
                map = [],
                blank = {},
                lastWhen = blank
            ;

            f = function () {
                var match = getMatchingMap(map,
                    f.__myrtleStub
                        // ignore the first argument (the original function)
                        ? Array.prototype.slice.call(arguments, 1)
                        : arguments
                );

                if (match) {
                    return match.hasOwnProperty('ret')
                         ? match.ret
                         : match.run.apply(this, arguments)
                    ;
                }
                return map.otherwiseRun
                     ? map.otherwiseRun.apply(this, arguments)
                     : (map.hasOwnProperty('otherwise') || typeof baseFn !== 'function'
                        ? map.otherwise
                        : baseFn.apply(this, arguments)
                       )
                ;
            };

            f.__myrtleStub = false;

            /**
             * Set up the function with the precondition that certain arguments are passed.
             *
             * @param {...args} Any number of arguments. If the created function is given these exact values, then the
             *                  precondition is met, and the appropriate value will be returned.
             * @return {this}   A reference to this object, allowing chaining.
             */
            f.when = function () {
                if (lastWhen !== blank) {
                    throw new Error(".when() can not be used after another .when()");
                }
                lastWhen = arguments;
                return this;
            };
            /**
             * Specify that a certain value should be returned when the precondition is met.
             *
             * @param  {*} returnVal    The value to return.
             * @return {this}           A reference to this object, allowing chaining.
             */
            f.then = function (returnVal) {
                if (lastWhen === blank) {
                    throw new Error(".then() can only be used after .when()");
                }
                map.unshift({
                    args : lastWhen,
                    ret : returnVal
                });
                lastWhen = blank;
                return this;
            };
            /**
             * Sets up a catch-all precondition and return value.
             *
             * @param  {*} returnVal    The value to return when no other condition has been met.
             * @return {this}           A reference to this object, allowing chaining.
             */
            f.otherwise = function (returnVal) {
                if (lastWhen !== blank) {
                    throw new Error(".otherwise() can not be used after .when()");
                }
                map.otherwise = returnVal;
                lastWhen = blank;
                return this;
            };
            /**
             * Instead of returning a hardcoded value when the preconditions are matched, this allows a custom function
             * to be executed instead.
             *
             * @param  {Function} customFn  A function to run instead. It receives the same arguments as the original,
             *                              and its return value will be used.
             *
             * @return {this}
             */
            f.run = function (customFn) {
                if (lastWhen === blank) {
                    if (map.hasOwnProperty('otherwise') && typeof map.otherwise === 'undefined') {
                        map.otherwiseRun = customFn;
                    } else {
                        throw new Error(".run() can only be used after .when() or .otherwise() with no args");
                    }
                } else {
                    map.unshift({
                        args : lastWhen,
                        run : customFn
                    });
                }
                lastWhen = blank;
                return this;
            };
            /**
             * Seal this function builder, preventing any further modifications. The interface remains exactly the same,
             * however the other functions now perform no action.
             *
             * @return {this}
             */
            f.seal = function () {
                var i, newFunc = function () {
                    return this;
                };
                for (i in f) {
                    if (i !== 'get' && f.hasOwnProperty(i) && typeof f[i] === 'function') {
                        f[i] = newFunc;
                    }
                }
                return this;
            };
            /**
             * Remove the extra function-building methods from this object, effective returning it to be a regular
             * function. Note that this is *not* necessary for most use cases, only in cases where having additional
             * properties on the function may affect program flow.
             *
             * @return {Function}
             */
            f.get = function () {
                var i;
                for (i in f) {
                    if (f.hasOwnProperty(i)) { // this will remove the __myrtleStub property, which is OK, I guess...
                        delete f[i];
                    }
                }
                return this;
            };
            return f;
        };
    }());

    /**
     * True if the given object has no properties
     * @param  {object} obj
     * @return {Boolean}
     */
    isEmpty = function (obj) {
        /*jslint forin: true */
        for (var i in obj) {
            return false;
        }
        /*jslint forin: false */
        return true;
    };

//#JSCOVERAGE_IF
    if (typeof module !== 'undefined') {
        module.exports = M;
    } else {
        root.Myrtle = M;
    }
}(this));
