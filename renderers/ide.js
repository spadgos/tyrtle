var Tyrtle = require("../Tyrtle");

module.exports = {
    afterTest : function (test, mod, tyrtle) {
        if (test.status === Tyrtle.FAIL) {
            var msg = test.name + ": " + test.statusMessage.replace(/\n/g, '\\n'),
                out
            ;
            if (test.error) {
                out = [
                    '-',
                    '0',
                    msg
                ];
            } else {
                out = [
                    test.exception.stack[0][0], // fileName
                    test.exception.stack[0][1], // line
                    msg
                ];
            }
            out = out.join(':');
            console.log(out);
        }
    }
};
