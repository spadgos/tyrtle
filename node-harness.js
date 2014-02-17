var Tyrtle = require('./Tyrtle'),
  renderer,
  fs = require('fs'),
  path = require('path'),
  glob,
  tests,
  args,
  color,
  loadFiles,
  inp, inptext,
  runTests,
  oldCwd
;

args = require('optimist')
  .boolean("monochrome")
  .describe("monochrome", "Output without any colors")
  .boolean("only-errors")
  .describe("only-errors", "Only show tests which fail")
  .string("list")
  .describe("list", "If this is set, then the files specified should contain a JSON object specifying the paths "
    + "of other files to include"
  )
  .boolean('dry')
  .alias('dry', 'dry-run')
  .describe('dry', "Perform a dry run. In this mode, none of the test modules are loaded. Instead, a list of the "
        + "files which *would* have been loaded is displayed and the program exits. This is useful for "
        + "testing file-matching patterns")
  .string('renderer')
  .alias('renderer', 'r')['default']('renderer', 'node')
  .usage("[1] : $0 [options] [--] file [file [file ...]]\n"
     + "[2] : $0 [options] --list fileList.json\n"
     + "\n"
     + "In method [1], wildcards can be used, eg: $0 *.test.js test.*.js\n"
     + "To use recursive matching (through subdirectories) you will need to quote the strings,\n"
     + "eg: $0 \"tests/**.js\" \"vendors/tests/**\"\n"
     + "\n"
     + "In method [2], specify a file containing an array of paths in JSON format. Paths in the\n"
     + "file list are relative to the list itself. Wildcard patterns can also be used inside a\n"
     + "file list, however no extra quoting is required."
  )
  .wrap(80)
  .check(function (args) {
    // this function throws so that optimist doesn't print out the body of this function
    if (args._.length === 0) {
      if (!args.list) {
        throw "";
      }
    } else if (args.list) {
      throw "";
    }
    if (args.renderer) {
      try {
        if (/^\.{0,2}\//.test(args.renderer)) { // relative or absolute path given
          // load the path given
          renderer = require(args.renderer);
        } else {
          try {
            // load from the renderers folder
            renderer = require('./renderers/' + args.renderer);
          } catch (ee) {
            // try loading from node_modules or whatever
            renderer = require(args.renderer);
          }
        }
      } catch (e) {
        throw "Renderer [" + args.renderer + "] not found";
      }
    }
  })
  .argv
;

//console.log(require('optimist'));
//console.log(args);
//process.exit(0);
if (renderer.setMonochrome) {
  renderer.setMonochrome(args.monochrome);
}
renderer.onlyErrors = args['only-errors'];
Tyrtle.setRenderer(renderer);

color = args.monochrome
  ? function (col, s) {
    return s;
  }
  : (function () {
    var c = {
      red : '31',
      white : '1;37'
    };
    return function (col, s) {
      return '\u001b[' + c[col] + 'm' + s + '\u001b[0m';
    };
  }())
;
runTests = function () {
  var i, l, val,
    re_glob = /[?*]/,
    newFiles,
    run = false,
    t,
    options = {}
  ;
  Object.keys(args).forEach(function (key) {
    if (!(/^(\$0|_)$/.test(key))) {
      options[key] = args[key];
    }
  });
  options.callback = function () {
    process.exit(t.fails);
  };
  t = new Tyrtle(options);

  for (i = 0, l = loadFiles.length; i < l; ++i) {
    val = loadFiles[i];
    if (re_glob.test(val)) {
      glob = glob || require('glob');
      newFiles = glob.sync(val);
      loadFiles.push.apply(loadFiles, newFiles);
      l += newFiles.length;
    } else {
      if (!(/^\.{0,2}\//.test(val))) {
        val = process.cwd() + '/' + val;
      }
      if (args.dry) {
        console.log(fs.realpathSync(val));
      } else {
        try {
          tests = require(val);
        } catch (e) {
          console.error(
            color('red', "Could not load module ")
            + color('white', "%s"),
            val.replace(/\.js$/, '') + '.js'
          );
          continue;
        }
        run = true;
        if (Tyrtle.util.isArray(tests)) {
          for (i = 0, l = tests.length; i < l; ++i) {
            t.module(tests[i]);
          }
        } else {
          t.module(tests);
        }
      }
    }
  }
  if (run) {
    t.run();
  }
};


if (args.list) {
  oldCwd = process.cwd();
  inp = fs.createReadStream(args.list); // TODO: handle the cwd
  process.chdir(path.dirname(fs.realpathSync(args.list)));
  inptext = "";

  inp.setEncoding('utf8');
  inp.on('data', function (data) {
    inptext += data;
  });
  inp.on('end', function (close) {
    loadFiles = JSON.parse(inptext);
    runTests();
    process.chdir(oldCwd);
  });
} else {
  loadFiles = args._;
  runTests();
}
