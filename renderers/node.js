var repeat,
  color,
  monochrome,
  colorful,
  colorVariable,
  Tyrtle = require('../Tyrtle'),
  Table = require('term-table'),
  table
;

repeat = function (str, len) {
  var A = Array;
  return (new A(len + 1)).join(str);
};
colorful = (function () {
  var colors = {
    black: '30',
    dgray: '1;30',
    red: '31',
    lred: '1;31',
    green: '32',
    lgreen: '1;32',
    brown: '33',
    yellow: '1;33',
    blue: '34',
    lblue: '1;34',
    purple: '35',
    lpurple: '1;35',
    cyan: '36',
    lcyan: '1;36',
    lgray: '37',
    white: '1;37'
  };
  return function (colour, bold, str) {
    if (arguments.length === 2) {
      str = bold;
      bold = false;
    }
    return "\u001b[" + (bold ? "1;" : "") + colors[colour] + "m" + str + "\u001b[0m";
  };
}());
monochrome = function (colour, bold, str) {
  return arguments[arguments.length - 1];
};
color = colorful;


colorVariable = function (v) {
  var vType = typeof v, str, ii, len, tmp, colors;
  colors = {
    nullish : 'dgray',
    date : 'purple',
    regex : 'red',
    number : 'blue',
    string : 'green',
    'function' : 'cyan',
    array : 'brown',
    object : 'white',
    'boolean' : 'lblue'
  };
  if (v === null || vType === 'undefined') {
    str = color(colors.nullish, String(v));
  } else if (vType === 'string') {
    str = "'" + color(colors.string, v) + "'";
  } else if (Tyrtle.isDate(v)) {
    str = color(colors.date, String(v));
  } else if (Tyrtle.isRegExp(v)) {
    str = color(colors.regex, v.toString());
  } else if (vType === 'function') {
    str = color(colors['function'], "Function" + (v.name ? " " + v.name : ""));
  } else if (vType === 'object') {
    if (Tyrtle.isArray(v)) {
      str = color(colors.array, "Array (length: ")
        + color(colors.number, v.length)
        + color(colors.array, ")");
    } else {
      str = String(v);
      if (str === "[object Object]") {
        str = "Object";
      }
      str = color(colors.object, str);
    }
  } else {
    str = color(colors[vType], String(v));
  }
  return str;
};

module.exports = {
  onlyErrors : false,
  setMonochrome : function (mono) {
    color = mono ? monochrome : colorful;
  },
  beforeRun : function (ty) {
    table = new Table(8, 60, 6);
    table.columnDividers = true;
  },
  beforeModule : function (m, ty) {
    var str = color('lblue', m.name),
      l = m.name.length
    ;
    console.log("\n" + str + "\n" + color('lgray', repeat("-", 80)));
    this.rowOffset = 1;
  },
  afterTest : function (test, m, ty) {
    var str = color('white', test.name),
      status,
      col,
      lines
    ;
    switch (test.status) {
    case Tyrtle.PASS :
      col = 'green';
      status = 'PASS';
      break;
    case Tyrtle.FAIL :
      col = 'red';
      status = 'FAIL';
      str += ": " + test.statusMessage;
      break;
    case Tyrtle.SKIP :
      col = 'dgray';
      status = 'SKIP';
      str += ": " + test.statusMessage;
    }
    if (!this.onlyErrors || test.status === Tyrtle.FAIL) {
      lines = table.row(
        '[ ' + color(col, status) + ' ]',
        str,
        test.status === Tyrtle.PASS ? test.runTime + "ms" : '-'
        //color('dgray', test.runTime) + "ms"
      );
      this.rowOffset += lines;
    }
    str = (m.passes + "/" + m.tests.length);
    console.log("\u001b[" + (this.rowOffset + 1) + "A"
      + "\u001b[" + (80 - str.length) + "C"
      + color(m.fails === 0 ? "green" : "red", str)
      + "\u001b[" + this.rowOffset + "B"
    );
  },
  afterRun : function (ty) {
    var col = ty.fails === 0 ? 'green' : 'red';
    console.log(
      color(col, "%d failed, %d passed, %d skipped"),
      ty.fails,
      ty.passes,
      ty.skips
    );
  },
  templateString : function (message) {
    var richText,
      argsRegex = /\{args\}/g,
      expandedArgs, i, l,
      self = this,
      args
    ;

    if (typeof arguments[0] === "boolean") {
      richText = arguments[0];
      message = arguments[1];
      args = Array.prototype.slice.call(arguments, 2);
    } else {
      richText = true;
      args = Array.prototype.slice.call(arguments, 1);
    }

    if (argsRegex.test(message)) {
      expandedArgs = [];
      for (i = 0, l = args.length; i < l; ++i) {
        expandedArgs.push('{' + i + '}');
      }
      message = message.replace(/\{args\}/g, "[" + expandedArgs.join(", ") + "]");
    }
    return message.replace(
      /\{([1-9][0-9]*|0)\}/g,
      function (str, p1) {
        var v = args[p1];
        return richText
          ? colorVariable(v)
          : (v === null
            ? "NULL"
            : (typeof v === "undefined"
               ? "UNDEFINED"
               : (v.toString ? v.toString() : String(v))
            )
            )
        ;
      }
    );
  }
};
