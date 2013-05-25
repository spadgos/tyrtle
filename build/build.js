({
  baseUrl: "../target",
  include: ["Tyrtle", "../vendor/almond"],
  out: "../Tyrtle.js",
  optimize: 'none',
  wrap: {
    startFile: 'wrap-start.frag.js',
    endFile: 'wrap-end.frag.js'
  }
})
