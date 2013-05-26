var renderer;

module.exports = {
  get: function () {
    return renderer;
  },
  set: function (r) {
    renderer = r;
  }
};
