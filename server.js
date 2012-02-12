var config = require("./lib/config");
var server = require("./lib/server");

var home = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
var candidates = [
        path.join(home, ".subversion-hub.json")
];

var cfgEnv = process.env["SUBVERSION-HUB-CONFIG"];

if (cfgEnv) {
  candidates.push(cfgEnv);
}

if (process.argv.length >= 3) {
  candidates.push(process.argv[2]);
}

config(candidates, function(err, cfg){
  if (err) {
    return console.error(err.stack || err);
  }

  server(cfg);
});