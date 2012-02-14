var http = require('http');

http.IncomingMessage.prototype._addHeaderLine = function(field, value) {
  var dest = this.complete ? this.trailers : this.headers;

  switch (field) {
    // Array headers:
    case 'set-cookie':
      if (field in dest) {
        dest[field].push(value);
      } else {
        dest[field] = [value];
      }
      break;

    // Comma separate. Maybe make these arrays?
    case 'accept':
    case 'accept-charset':
    case 'accept-encoding':
    case 'accept-language':
    case 'connection':
    case 'cookie':
    case 'pragma':
    case 'link':
      if (field in dest) {
        dest[field] += ', ' + value;
      } else {
        dest[field] = value;
      }
      break;


    default:
      if (field.slice(0, 2) == 'x-') {
        // except for x-
        if (field in dest) {
          dest[field] += ', ' + value;
        } else {
          dest[field] = value;
        }
      } else {
        // drop duplicates
        if (!(field in dest)) dest[field] = value;
        else if (Array.isArray(dest[field])) dest[field].push(value);
        else dest[field] = [ dest[field], value ];
      }
      break;
  }
};

var CRLF = '\r\n';
var connectionExpression = /Connection/i;
var transferEncodingExpression = /Transfer-Encoding/i;
var closeExpression = /close/i;
var chunkExpression = /chunk/i;
var contentLengthExpression = /Content-Length/i;
var expectExpression = /Expect/i;
var continueExpression = /100-continue/i;

http.ServerResponse.prototype._storeHeader =
http.OutgoingMessage.prototype._storeHeader = function(firstLine, headers) {
  var sentConnectionHeader = false;
  var sentContentLengthHeader = false;
  var sentTransferEncodingHeader = false;
  var sentExpect = false;

  // firstLine in the case of request is: 'GET /index.html HTTP/1.1\r\n'
  // in the case of response it is: 'HTTP/1.1 200 OK\r\n'
  var messageHeader = firstLine;
  var field, value;
  var self = this;

  function store(field, value) {
    if (Array.isArray(value)) {
      value.forEach(function(val) {
        messageHeader += field + ': ' + val + CRLF;
      });
    }
    else {
      messageHeader += field + ': ' + value + CRLF;
    }

    if (connectionExpression.test(field)) {
      sentConnectionHeader = true;
      if (closeExpression.test(value)) {
        self._last = true;
      } else {
        self.shouldKeepAlive = true;
      }

    } else if (transferEncodingExpression.test(field)) {
      sentTransferEncodingHeader = true;
      if (chunkExpression.test(value)) self.chunkedEncoding = true;

    } else if (contentLengthExpression.test(field)) {
      sentContentLengthHeader = true;

    } else if (expectExpression.test(field)) {
      sentExpect = true;
    }
  }

  if (headers) {
    var keys = Object.keys(headers);
    var isArray = (Array.isArray(headers));
    var field, value;

    for (var i = 0, l = keys.length; i < l; i++) {
      var key = keys[i];
      if (isArray) {
        field = headers[key][0];
        value = headers[key][1];
      } else {
        field = key;
        value = headers[key];
      }

      if (Array.isArray(value)) {
        for (var j = 0; j < value.length; j++) {
          store(field, value[j]);
        }
      } else {
        store(field, value);
      }
    }
  }

  // keep-alive logic
  if (sentConnectionHeader === false) {
    if (this.shouldKeepAlive &&
        (sentContentLengthHeader || this.useChunkedEncodingByDefault || this.agent)) {
      messageHeader += 'Connection: keep-alive\r\n';
    } else {
      this._last = true;
      messageHeader += 'Connection: close\r\n';
    }
  }

  if (sentContentLengthHeader == false && sentTransferEncodingHeader == false) {
    if (this._hasBody) {
      if (this.useChunkedEncodingByDefault) {
        messageHeader += 'Transfer-Encoding: chunked\r\n';
        this.chunkedEncoding = true;
      } else {
        this._last = true;
      }
    } else {
      // Make sure we don't end the 0\r\n\r\n at the end of the message.
      this.chunkedEncoding = false;
    }
  }

  this._header = messageHeader + CRLF;
  this._headerSent = false;

  // wait until the first body chunk, or close(), is sent to flush,
  // UNLESS we're sending Expect: 100-continue.
  if (sentExpect) this._send('');
};
