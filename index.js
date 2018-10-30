const express = require('express');

const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');

const mongoose = require('mongoose');

const User = require('./models/user');
const Contact = require('./models/contact');

const Response = require('./responses');

const app = express();
const router = express.Router();
const JWTSecret = 'JWT_SECRET';

app.use(bodyParser.json());
app.use('/api', router);

const JWTMiddleware = (req, res, next) => {
  const JWToken = req.headers.authorization;
  const cleanToken = JWToken.replace('Bearer ', '');

  jwt.verify(cleanToken, JWTSecret, (err, isValid) => {
    if(!isValid) {
      res.status(401).send(Response.unauthorized);
    } else {
      next();
    }
  });
};

const db = mongoose.connection;
mongoose.connect('mongodb://localhost:27017/phonebook');

db.on('error', console.error.bind(console, 'connection error:'));

db.once('open', function() {

  /*
   * Handle Login
   */

  router.post('/login', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    User.findOne({
      username: username
    }, (err, data) => {
      if(data && password === data.password) {

        const token = jwt.sign({
          exp: Math.floor(Date.now() / 1000) + 3600,
          username: username,
        }, "JWT_SECRET");

        return res.status(200).send({
          "token": token,
        });

      } else {
        return res.status(401).send(Response.unauthorized);

      }
    });
  });
  router.get('/login', (req, res) => {
    return res.send(400).send(Response.badRequest);
  });
  router.put('/login', (req, res) => {
    return res.send(400).send(Response.badRequest);
  });
  router.delete('/login', (req, res) => {
    return res.send(400).send(Response.badRequest);
  });

  /*
   * Handle contacts listing
   */

  router.get('/contacts', JWTMiddleware, (req, res) => {
    const sort = req.query.sort || 'desc';
    const filter = req.query.filter || null;

    const sortingParam = sort === 'asc' ? -1 : 1;

    let query = {};

    if(filter) {
      const reg = new RegExp(filter);

      query = { $or: [
        { firstName: reg },
        { lastName: reg },
        { phoneNumber: reg },
      ]};
    }

    Contact
      .find(query, null, { sort: { firstName: sortingParam } })
      .catch((err) => {
        console.error(err);
        return res.status(500).send(Response.serverError);
      })
      .then(data => {
        return res.status(200).send(data);
      });
  });

  /*
   * Handle contact create
   */

  router.post('/contacts', JWTMiddleware, (req, res) => {
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const phoneNumber = req.body.phoneNumber;

    Contact.findOne({firstName, lastName, phoneNumber})
      .catch(err => {
        console.error(err);
        return res.status(500).send(Response.serverError);
      })
      .then(data => {
        if(!data) {
          const newContact = new Contact({
            firstName,
            lastName,
            phoneNumber,
          });

          return newContact.save();
        } else {
          return null;
        }
      })
      .then((person) => {
        if(!person) {
          return res.status(400).send(Response.alreadyExists);
        } else {
          return res.status(201).send(person);
        }
      });
  });

  /*
   * Handle contact update
   */
  router.put('/contacts/:id?', JWTMiddleware, (req, res) => {
    const id = req.params.id;
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const phoneNumber = req.body.phoneNumber;

    if(id) {
      Contact.findByIdAndUpdate(id, {
        firstName,
        lastName,
        phoneNumber,
      }, {new: true})
        .catch( err => {
          console.error(err);
          return res.status(500).send(Response.serverError);
        })
        .then( data => {
          if(!data) {
            return res.status(404).send(Response.notFound);
          } else {
            return res.status(200).send(data);
          }
        });

    } else if(Array.isArray(req.body)) {

      const entries = req.body;
      const updatedEntries = [];

      const updateQueue = entries.map( entry => {
        const entryId = entry._id;

        return Contact.updateOne({ _id: entryId}, { ...entry })
          .then( raw => raw)
          .then( data => {
            if(data.nModified === 1) {
              updatedEntries.push(entry);
            }
          });
      });


      Promise
        .all(updateQueue)
        .catch(err => {
          console.error(err);
          return res.status(500).send(Response.serverError);
        })
        .then( () => {
          return res.status(200).send(updatedEntries);
        });
    } else {
      return res.status(400).send(Response.badRequest);
    }
  });

  /*
   * Handle contact delete
   */
  router.delete('/contacts/:id', JWTMiddleware, (req, res) => {
    const id = req.params.id;
    if(id) {
      Contact.findOneAndDelete({_id: id})
        .catch( err => {
          console.error(err);
          return res.status(500).send(Response.serverError);
        })
        .then( data => {
          if(!data) {
            res.status(404).send(Response.notFound);
          } else {
            res.status(204).send();
          }
        });
    } else {
      return res.status(400).send(Response.badRequest);
    }
  });

  app.listen(3000, () => console.log('server started'));
});
