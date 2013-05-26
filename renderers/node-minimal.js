var start;
module.exports = {
  beforeRun: function () {
    start = Date.now();
  },
  afterRun: function (tyrtle) {
    console.log(
      "%d failed, %d passed, %d skipped. Run time: %sms",
      tyrtle.fails,
      tyrtle.passes,
      tyrtle.skips,
      Date.now() - start
    );
  }
};
