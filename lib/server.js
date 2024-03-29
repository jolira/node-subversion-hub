var http = require('http');
var https = require('https');
var url = require('url');

function stripTrailingSlash(s) {
  if (s.substr(-1) !== '/') {
    return s;
  }
  
  return s.substr(0, s.length-1);
}

function mergPath(proxied, req) {
  if (req.indexOf("/svn/!svn/") === 0) {
    return req;
  }
  proxied = stripTrailingSlash(proxied);
  req = stripTrailingSlash(req);

  if (proxied) {
    return req ? proxied + req : proxied;
  }

  return req;
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

  if (req.headers.depth) {
    opts.headers.depth = req.headers.depth;
  }

  if (req.headers.label) {
    opts.headers.label = req.headers.label;
  }

  var _url = url.parse(req.url);

  opts.path = mergPath(proxied.pathname, _url.pathname);

  var _req = client.request(opts, function (_res) {
    console.log("_res.headers", _res.headers);
    res.statusCode = _res.statusCode;
    res.setHeader("content-type", _res.headers["content-type"]);
    
    if (_res.headers.dav) {
      res.setHeader("dav", _res.headers.dav);
    }

    if (_res.headers["MS-Author-Via"]) {
      res.setHeader("MS-Author-Via", _res.headers["MS-Author-Via"]);
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