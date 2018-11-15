const chai= require('chai');
const chaiHttp = require('chai-http');
const chaiJSON = require('chai-json');

const should = chai.should();
const server = require('../').server;

chai.use(chaiHttp);
chai.use(chaiJSON);

describe("Authentication", () => {
  describe("GET /login should not be accessible", () => {
    it("should return 400", function(done) {
      chai
        .request(server)
        .get('/api/login')
        .end( (err, res) => {
          if(err) done(err);
          res.should.have.status(400);
          done();
        });
    });
  });

  describe("POST /login should authenticate the user", () => {
    it('should return a valid JWToken', function(done){
      chai.request(server)
        .post('/api/login')
        .send({
          username: 'admin',
          password: 'admin',
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.should.be.an('object');
          res.body.should.have.property('token');
          done();
        });
    });
  });
});

describe("CRUD Functionality", () => {
  let token = null;
  let createdContactID = null;
  let contactDummyData = {
    firstName: "Testel",
    lastName: "Testescu",
    phoneNumber: "123454363",
  };

  before(function() {
    return new Promise( (resolve) => {
      chai.request(server)
        .post('/api/login')
        .send({
          username: 'admin',
          password: 'admin',
        })
        .end( (err, res) => {
          token = res.body.token;
          resolve();
        });
    });
  });

  it("should list all users at GET /contacts ", function(done) {
    chai.request(server)
      .get('/api/contacts')
      .set({'Authorization': 'Bearer ' + token})
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.an('array');
        done();
      });
  });

  it("should create a new contact at POST /contacts ", function(done) {
    chai.request(server)
      .post('/api/contacts')
      .set({'Authorization': 'Bearer ' + token})
      .send(contactDummyData)
      .end((err, res) => {
        createdContactID = res.body._id;

        res.should.have.status(201);
        res.body.should.have.property('_id');
        res.body.should.have.property('firstName');
        res.body.should.have.property('lastName');
        res.body.should.have.property('phoneNumber');

        done();
      })
  });

  it("should update the contact previously created at PUT /contacts/:id", function(done) {
    if(createdContactID) {
      contactDummyData.lastName = "popescu";
      contactDummyData.phoneNumber = "999999";

      chai.request(server)
        .put('/api/contacts/' + createdContactID)
        .set({'Authorization': 'Bearer ' + token})
        .send(contactDummyData)
        .end( (err, res) => {
          if(err) done(err);
          res.should.have.status(200);
          res.body.should.have.property("lastName").and.equal("popescu");
          done();
        })
    } else {
      done(new Error("no contact id"));
    }
  });

  it("should delete the contact previously created at DELETE /contacts/:id", function(done) {
    if(createdContactID) {
      chai.request(server)
        .del('/api/contacts/' + createdContactID)
        .set({'Authorization': 'Bearer ' + token})
        .end( (err, res) => {
          if(err) done(err);
          res.should.have.status(204);
          res.body.should.be.empty;
          done();
        })
    } else {
      done(new Error('no contact id'));
    }
  });
});