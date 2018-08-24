const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const app = express();
require('dotenv').config()
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
var crypto = require('crypto');
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}`
const salt = process.env.SALT; /** Gives me salt of length 16 */

function saltHashPassword(password) {
  const hash = crypto.createHmac('sha512', salt); /** Hashing algorithm sha512 */
  hash.update(password);
  return hash.digest('hex');
}


function generateUserObject(body) {
  const hash = saltHashPassword(body.password);
  return {
    name: body.username,
    password: hash
  }
}

app.get('/', function (req, res){
  res.json({
    "status": 200,
    "message": "OK"
  });
});

app.post('/users', function(req, res) {
  if (!req.body.username || req.body.username == '') {
    res.json({
      status: 403,
      message: "You must specify a username and a password"
    })
    return
  }
  // Store User and Password to DB
  const user = generateUserObject(req.body)

  MongoClient.connect(uri, function(err, db){    //conect to mongoclient
    if (err) throw err;                          //if there is an error call error; throw = crash
    var dbo = db.db("BrowserExtension");         //select data base Browser Extension
    dbo.collection("users").findOne({name: user.name}, function(err, result) {   //find name in users collection
      if (err) throw err;                           //catch errors when trying to run the query
      if (result) {   //if result contains data then do ...
        db.close();   //close database
        res.json({    //send respone back to the client
          "status": 500,
          "message": "Error, you're already registered!"
        });
      } else {
        dbo.collection("users").insertOne(user, function(err, data) {   //start insert query
          if (err) throw err;                                           //catch errors when trying to run the query
          console.log("Number of documents inserted: " + data.insertedCount);   //callout log
          // Send response to Browser
          db.close();
          res.json({
            "status": 200,
            "username": user.name
          });
        });
      };
    });
  });
});

app.post('/login', function(req, res){
  if (!req.body.username || req.body.username == '') {
    res.json({
      status: 403,
      message: "You must specify a username and a password"
    })
    return
  }

  const user = generateUserObject(req.body);

  MongoClient.connect(uri, function(err, db){                                          //GET req (username, password),
    if (err) throw err;                          //if there is an error call error; throw = crash
    var dbo = db.db("BrowserExtension");
    dbo.collection("users").findOne({name: user.name}, function(err, result) {   //find name in users collection
      if (err) throw err;
      console.log(result)
      if (result) {   //if result contains data then do ...
        db.close();   //close database
        if (user.password === result.password) {
          res.json({
            status: 200,
            message: "Authenticated successfully"
          });
        } else {
          res.json({
            status: 401,
            message: "wrong password or username"
          });
        }
      } else {
        db.close();
        res.json({
          status: 404,
          message: "user not found please register"
        });
      }
    });
  });
});


app.listen(3000, function () {                //start listening to port 3000
  console.log('App listening to port 3000');
});
