var Tyrtle = require('../Tyrtle'),
    renderer = require('../renderers/node'),
    tests = require('./node-tests'),
    t,
    i, l
;
Tyrtle.setRenderer(renderer);

t = new Tyrtle();

if (Tyrtle.isArray(tests)) {
    for (i = 0, l = tests.length; i < l; ++i) {
        t.module(tests[i]);
    }
} else {
    t.module(tests);
}
t.run();
