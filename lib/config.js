var fs = require('fs');
var path = require('path');

function load(candidates, cb) {
  var candidate = candidates.pop();

  if (!candidate) {
    return cb(new Error("configuration not found"));
  }

  fs.readFile(candidate, "utf8", function(err, data){
    if (err) {
      return load(candidates, cb);
    }
    
    var cfg = JSON.parse(data);
    
    return cb(undefined, cfg);
  });
}

module.exports = load;