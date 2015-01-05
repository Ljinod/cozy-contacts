// Generated by CoffeeScript 1.8.0
var Contact, ContactLog, americano, fs, log;

americano = require('americano-cozy');

ContactLog = require('./contact_log');

fs = require('fs');

log = require('printit')({
  prefix: 'Contact Model'
});

module.exports = Contact = americano.getModel('Contact', {
  id: String,
  fn: String,
  n: String,
  datapoints: function(x) {
    return x;
  },
  note: String,
  tags: function(x) {
    return x;
  },
  _attachments: Object
});

Contact.prototype.remoteKeys = function() {
  var dp, model, out, _i, _len, _ref;
  model = this.toJSON();
  out = [this.id];
  _ref = model.datapoints;
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    dp = _ref[_i];
    if (dp.name === 'tel') {
      out.push(ContactLog.normalizeNumber(dp.value));
    } else if (dp.name === 'email') {
      out.push(dp.value.toLowerCase());
    }
  }
  return out;
};

Contact.prototype.savePicture = function(path, callback) {
  var data;
  data = {
    name: 'picture'
  };
  log.debug(path);
  return this.attachFile(path, data, function(err) {
    if (err) {
      return callback(err);
    } else {
      return fs.unlink(path, function(err) {
        if (err) {
          log.error("failed to purge " + file.path);
        }
        return callback();
      });
    }
  });
};

Contact.prototype.getComputedFN = function(config) {
  var familly, given, middle, prefix, suffix, _ref;
  _ref = this.n.split(';'), familly = _ref[0], given = _ref[1], middle = _ref[2], prefix = _ref[3], suffix = _ref[4];
  if (config == null) {
    config = {};
  }
  if (config.nameOrder == null) {
    config.nameOrder = 'given-familly';
  }
  switch (config.nameOrder) {
    case 'given-familly':
      return "" + given + " " + middle + " " + familly;
    case 'familly-given':
      return "" + familly + ", " + given + " " + middle;
    case 'given-middleinitial-familly':
      return "" + given + " " + (initial(middle)) + " " + familly;
  }
};

Contact.prototype.toVCF = function(config, callback) {
  var buffers, getVCardOutput, model, stream, _ref;
  model = this.toJSON();
  getVCardOutput = (function(_this) {
    return function(picture) {
      var content, dp, folded, i, key, out, type, value, _ref;
      if (picture == null) {
        picture = null;
      }
      out = "BEGIN:VCARD\n";
      out += "VERSION:3.0\n";
      if (model.note) {
        out += "NOTE:" + model.note + "\n";
      }
      if (model.n) {
        out += "N:" + model.n + "\n";
        out += "FN:" + (_this.getComputedFN(config)) + "\n";
      } else if (model.fn) {
        out += "N:;;;;\n";
        out += "FN:" + model.fn + "\n";
      } else {
        out += "N:;;;;\n";
        out += "FN:\n";
      }
      _ref = model.datapoints;
      for (i in _ref) {
        dp = _ref[i];
        value = dp.value;
        key = dp.name.toUpperCase();
        switch (key) {
          case 'ABOUT':
            if (dp.type === 'org' || dp.type === 'title') {
              out += "" + (dp.type.toUpperCase()) + ":" + value + "\n";
            } else {
              out += "X-" + (dp.type.toUpperCase()) + ":" + value + "\n";
            }
            break;
          case 'OTHER':
            out += "X-" + (dp.type.toUpperCase()) + ":" + value + "\n";
            break;
          case 'ADR':
            value = value.replace(/(\r\n|\n\r|\r|\n)/g, ";");
            content = "TYPE=home,postal:;;" + value + ";;;;";
            out += "ADR;" + content + "\n";
            break;
          default:
            if (dp.type != null) {
              type = ";TYPE=" + (dp.type.toUpperCase());
            } else {
              type = "";
            }
            out += "" + key + type + ":" + value + "\n";
        }
      }
      if (picture != null) {
        folded = picture.match(/.{1,75}/g).join('\n ');
        out += "PHOTO;ENCODING=B;TYPE=JPEG;VALUE=BINARY:\n " + folded + "\n";
      }
      return out += "END:VCARD\n";
    };
  })(this);
  if (((_ref = model._attachments) != null ? _ref.picture : void 0) != null) {
    buffers = [];
    stream = this.getFile('picture', function() {});
    stream.on('data', buffers.push.bind(buffers));
    return stream.on('end', function() {
      var picture;
      picture = Buffer.concat(buffers).toString('base64');
      return callback(null, getVCardOutput(picture));
    });
  } else {
    return callback(null, getVCardOutput());
  }
};
