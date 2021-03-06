// Generated by CoffeeScript 1.9.3
var Contact, americano, async, baseController, helpers, multiparty, path;

path = require('path');

multiparty = require('multiparty');

async = require('async');

Contact = require('../models/contact');

helpers = require('../helpers/helpers');

americano = require('cozydb');

baseController = new americano.SimpleController({
  model: Contact,
  reqParamID: 'contactid',
  reqProp: 'contact'
});

module.exports = {
  fetch: baseController.fetch,
  list: baseController.listAll,
  read: baseController.send,
  "delete": baseController.destroy,
  picture: baseController.sendAttachment({
    filename: 'picture',
    "default": path.resolve(__dirname, '../assets/defaultpicture.png')
  }),
  create: function(req, res, next) {
    var create, dp, i, isImport, len, model, name, ref, toCreate;
    model = req.body.contact ? JSON.parse(req.body.contact) : req.body;
    isImport = model["import"];
    delete model["import"];
    toCreate = new Contact(model);
    create = function() {
      toCreate.revision = new Date().toISOString();
      return Contact.create(toCreate, function(err, contact) {
        if (err) {
          return next(err);
        } else {
          return res.send(contact, 201);
        }
      });
    };
    if (isImport) {
      name = '';
      if ((toCreate.fn != null) && toCreate.fn.length > 0) {
        name = toCreate.fn;
      } else if (toCreate.n && toCreate.n.length > 0) {
        name = toCreate.n.split(';').join(' ').trim();
      } else {
        ref = toCreate.datapoints;
        for (i = 0, len = ref.length; i < len; i++) {
          dp = ref[i];
          if (dp.name === 'email') {
            name = dp.value;
          }
        }
      }
      return Contact.request('byName', {
        key: name
      }, function(err, contacts) {
        if (contacts.length === 0) {
          return create();
        } else {
          return res.send(contacts[0], 201);
        }
      });
    } else {
      return create();
    }
  },
  update: function(req, res) {
    var model;
    model = req.body.contact ? JSON.parse(req.body.contact) : req.body;
    return req.contact.updateAttributes(model, function(err) {
      if (err) {
        return res.error(500, "Update failed.", err);
      } else {
        return res.send(req.contact, 201);
      }
    });
  },
  updatePicture: function(req, res, next) {
    var form;
    form = new multiparty.Form();
    res.on('close', function() {
      return req.abort();
    });
    return form.parse(req, function(err, fields, files) {
      var file;
      if (err) {
        return next(err);
      } else if ((files != null) && (files.picture != null) && files.picture.length > 0) {
        file = files.picture[0];
        return req.contact.savePicture(file.path, function(err) {
          if (err) {
            return next(err);
          } else {
            return res.send(req.contact, 201);
          }
        });
      } else {
        return next(new Error('Can\'t change picture, no file is attached.'));
      }
    });
  },
  vCard: function(req, res, next) {
    return Contact.request('all', function(err, contacts) {
      return async.mapSeries(contacts, function(contact, done) {
        return contact.toVCF(done);
      }, function(err, outputs) {
        var date, vCardOutput;
        if (err != null) {
          return next(err);
        }
        vCardOutput = outputs.join('');
        date = helpers.makeDateStamp();
        res.attachment(date + "-cozy-contacts.vcf");
        res.set('Content-Type', 'text/x-vcard');
        return res.send(vCardOutput);
      });
    });
  },
  vCardContact: function(req, res, next) {
    return req.contact.toVCF(function(err, vCardOutput) {
      var date, txt;
      if (err != null) {
        return next(err);
      }
      date = helpers.makeDateStamp();
      txt = req.params.fn.replace(new RegExp(' ', 'g'), '-');
      res.attachment(date + "-" + txt + ".vcf");
      res.set('Content-Type', 'text/x-vcard');
      return res.send(vCardOutput);
    });
  }
};
