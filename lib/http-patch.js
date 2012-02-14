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

    default:
      if (field in dest) {
        dest[field] += ', ' + value;
      } else {
        dest[field] = value;
      }
      break;
  }
};
