var vows = require('vows');
var horaa = require('horaa');
var assert = require('assert');
var config = require('../lib/config');
var fs = horaa('fs');

fs.hijack('readFile', function (file, encoding, cb) {
  if (file !== "c") {
    return cb(new Error("not found"));
  }
  return cb(undefined, '{"x":"y"}');
});

// Create a Test Suite
vows.describe('configuration file').addBatch({
  'load': {
    topic: function () {
      debugger;
      config(["a", "b", "c"], this.callback);
    },
    'configuration equals {"x":"y"}': function (cfg) {
      assert.equal("y", cfg.x);
    }
  }
}).run(); // Run it