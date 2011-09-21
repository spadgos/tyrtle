/*globals asyncTest, test, Tyrtle, equal, expect, start, raises, ok, module */
module('Renderers');

asyncTest("Custom renderers can be used", function () {
    var t, r, noop, br, bm, bt, at, am, ar, ts, old = Tyrtle.getRenderer();
    noop = function () {};
    r = {
        beforeRun : function () {
            ++br;
        },
        beforeModule : function () {
            ++bm;
        },
        beforeTest : function () {
            ++bt;
        },
        afterTest : function () {
            ++at;
        },
        afterModule : function () {
            ++am;
        },
        afterRun : function () {
            ++ar;
        },
        templateString : function (s) {
            ++ts;
            return s;
        }
    };
    br = bm
       = bt
       = at
       = am
       = ar
       = ts
       = 0
    ;
    Tyrtle.setRenderer(r);

    t = new Tyrtle({
        callback : function () {
            equal(br, 1, "The beforeRun function was not called as often as expected.");
            equal(bm, 2, "The beforeModule function was not called as often as expected.");
            equal(bt, 4, "The beforeTest function was not called as often as expected.");
            equal(at, 4, "The afterTest function was not called as often as expected.");
            equal(am, 2, "The afterModule function was not called as often as expected.");
            equal(ar, 1, "The afterRun function was not called as often as expected.");
            ok(ts > 0, "The templateString function should have been used.");
            t.modules[0].rerunTest(t.modules[0].tests[0], t, function () {
                equal(br, 1, "Rerun: The beforeRun function was not called as often as expected.");
                equal(bm, 2, "Rerun: The beforeModule function was not called as often as expected.");
                equal(bt, 5, "Rerun: The beforeTest function was not called as often as expected.");
                equal(at, 5, "Rerun: The afterTest function was not called as often as expected.");
                equal(am, 3, "Rerun: The afterModule function was not called as often as expected.");
                equal(ar, 2, "Rerun: The afterRun function was not called as often as expected.");
                start();
                Tyrtle.setRenderer(old);
            });
        }
    });
    t.module("a", function () {
        this.test("aa", function () {});
        this.test("ab", function () {});
    });
    t.module("b", function () {
        this.test("ba", function () {});
        this.test("bb", function (assert) {
            assert(2 + 2)(5)();
        });
    });
    t.run();
});
