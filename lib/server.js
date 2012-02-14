var http = require('http');
var https = require('https');
var url = require('url');

function mergPath(p1, p2) {
  if (p1) {
    return p2 ? p1 + p2 : p1;
  }

  return p2;
}

function proxy(req, res, proxied) {
  console.log("req.url", req.url);
  console.log("req.method", req.method);
  console.log("req.headers", req.headers);

  var client = proxied.protocol == "https:" ? https : http;
  var opts = {
    "hostname": proxied.hostname,
    "method": req.method,
    "headers": {
      "user-agent": req.headers["user-agent"],
      "content-type": req.headers["content-type"],
      "dav": req.headers["dav"]
    }
  };

  if (proxied.port) {
    opts.port = proxied.port;
  }

  if (proxied.depth) {
    opts.depth = proxied.depth;
  }

  var _url = url.parse(req.url);

  opts.path = proxied.pathname ? proxied.pathname + _url.pathname : _url.pathname;

  var _req = client.request(opts, function (_res) {
    console.log("_res.headers", _res.headers);
    res.statusCode = _res.statusCode;
    res.setHeader("content-type", _res.headers["content-type"]);
    
    if (_res.headers.dav) {
      res.setHeader("dav", _res.headers.dav);
    }

    if (_res.headers.allow) {
      res.setHeader("allow", _res.headers.allow);
    }

    _res.setEncoding('utf8');
    _res.on('data', function (chunk) {
      console.log("=== response:", chunk);
      res.write(chunk);
    });
    _res.on('end', function () {
      console.log("=======================================================================");
      res.end();
      console.log("_res.trailers", _res.trailers);
    });
  });

  req.setEncoding("utf8");
  req.on('data', function(chunk){
    console.log("=== request:", chunk);
    _req.write(chunk);
  });
  req.on('end', function(){
    _req.end();
    console.log("req.trailers", req.trailers);
  });
}

function getListener(repos) {
  return function (req, res) {
    var proxied = repos["node-subversion-hub"];

    proxy(req, res, proxied);
  };
}

function compileRepos(repos, cb) {
  if (!repos) {
    return cb({});
  }

  var result = {};

  for (key in repos) {
    var _url = repos[key];
    var parsed = url.parse(_url, true);

    result[key] = parsed;
  }

  return cb(result);
}

function makeListener(cfg, cb) {
  return compileRepos(cfg.repos, function (repos) {
    var listener = getListener(repos);

    return cb(listener);
  });
}

module.exports = function (cfg, cb) {
  makeListener(cfg, function (listener) {
    var server = http.createServer(listener);

    server.listen(cfg.httpPort);

    return !cb || cb(server);
  });
};