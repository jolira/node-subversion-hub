var http = require('http');

module.exports = function(cfg) {
  http.createServer(function (req, res) {
    console.log("req", req);

    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Hello World\n');
  }).listen(cfg.httpPort);
};
