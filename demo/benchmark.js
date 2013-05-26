module.exports = {
  'Stress test': function () {
    for (var i = 1; i <= 10000; ++i) {
      this.test('Test #' + i, makeTest(i));
    }
  }
};
function makeTest(i) {
  return function (assert) {
    assert.that(i).is(i)();
    assert.that(i).is.not(i + 1)();
  };
}
