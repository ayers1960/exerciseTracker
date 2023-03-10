const mongoose = require('mongoose');
const bodyParser = require('body-parser')
const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

let userNameSchema = new mongoose.Schema({
  "username"   : String
});

let dbCnt = process.env.DB_CNT
let userDB = 'User_'+dbCnt;
let exerciseDB = 'Exercise_'+dbCnt;
console.log(userDB);
console.log(exerciseDB);

let UserDB = mongoose.model(userDB, userNameSchema);

let exerciseSchema = new mongoose.Schema({
  username    : String,
  description : String,
  duration    : Number,
  date        : Date,
})
let ExerciseDB = mongoose.model(exerciseDB, exerciseSchema);


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


app.get("/api/users", (req,res) => {
  UserDB.find({}, (err,data)=> {
    if (err) return console.error(err);
    res.json(data);
  });
});


app.post('/api/users',(req,res) => {
  let response;
  if ( req.body.username == "" )
    res.send("NEED A USER NAME");
  else {
    console.log(req.body.username);
    UserDB.find({"username": req.body.username}, function(err,data) {
      if (err) return console.error(err);
      if ( data.length == 0 ) {
        let newUser = new UserDB({"username": req.body.username});
        newUser.save( function(err,data) {
          console.log("CREATED USER" + data);
          response = {"username" : data.username,
                      "_id"      : data["_id"]
                    };
          return res.json(response);
        });
      }
      else {
        console.log("USERINFO:"+data[0]);
        response = {"username" : data[0].username,
                    "_id"      : data[0]["_id"]
                   };
        return res.json(response);
      }
    });
  }
});


app.post('/api/users//exercises',(req,res) => {
  console.log(req.body);
  res.send("NEED A VALID _ID");
});


app.post('/api/users/:id/exercises',(req,res) => {
  console.log("!!!!!EXERCISES:")
  console.log(req.body);
  console.log(req.params);
//  let id = req.body[":_id"];
  let id = req.params["id"];
  let duration = Number(req.body.duration);
  console.log("ID IS "+id)
  if (typeof(id) === "undefined" || !id.match(/^[0-9a-fA-F]{24}$/)) {
    console.log("INVALID _ID");
    return res.send("INVALID _ID");
  }
  else if ( typeof(req.body.description) === "undefined" || req.body.description == "" ) {
    console.log("INVALID DESCRIPTION");
    return res.send("INVALID DESCRIPTION");
  }
  else if ( !Number.isInteger(duration)) {
    console.log("INVALID DURATION");
    return res.send("INVALID DURATION");
  }
  else if (typeof(req.body.date) === "undefined" ||  req.body.date == "") {
    console.log("Getting Current Date")
    req.body.date = new Date().toDateString();
  }
  else {
    console.log("Creating DATE from '"+req.body.date+"'");
    req.body.date = new Date(req.body.date).toDateString();
    console.log("DATE is: "+ req.body.date);
  }
  console.log("looking for "+id);
  UserDB.findById(id, function(err,data) {
    if (err) return console.error(err);
    if (data === null)
      return  res.send("USER NOT FOUND");
    else {
      console.log('all good');
      console.log(req.body.date);
      let newExercise = new ExerciseDB({
        "username"    : data.username
        ,"date"        : req.body.date
        ,"duration"    : req.body.duration
        ,"description" : req.body.description
      });
        console.log("+++> " + newExercise);
      newExercise.save( (err,data) => {
        if (err) return console.error(err);
        let response = {
          "_id"          : id
          ,"username"    : data.username
          ,"date"        : data.date.toDateString()
          ,"duration"    : data.duration
          ,"description" : data.description
        }
        console.log(response);
        return res.json(response);
      });
    }
  });
//  console.log(req.body);
//  res.send("exercises");

});


app.get('/api/users/:id/logs',(req,res) => {
  let id = req.params.id;
  console.log(req.params);
  console.log(req.query);
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.send("INVALID _ID");
  }
  UserDB.findById(id, (err,data) => {
    if (data === null)
      return  res.send("USER NOT FOUND");
    else {
      let limitSize = 0;
      query = {};
      query["username"]  = data.username;
      let dateQ =  {};
      if ( typeof(req.query.from) !== "undefined" )
        dateQ["$gt"] = req.query.from;
      if ( typeof(req.query.to) !== "undefined" )
        dateQ["$lt"] = req.query.to;
      if ( typeof(req.query.limit) !== "undefined" )
        limitSize =  req.query.limit;
      if ( Object.keys(dateQ).length > 0  )
        query["date"]      =  dateQ;
      console.log(query) ;
      console.log("LIMIT: " + limitSize);
      let response = {};
      response["_id"] = id;
      response["username"] = data.username;
      response["count"] = 0
      response["log"] =[];
      ExerciseDB.find(query,
                      (err,data) => {
                        response["count"] = data.length;
                        data.forEach( (usr) => {
                          let obj = {
                            description  : usr.description
                            ,duration     : usr.duration
                            ,date         : usr.date.toDateString()
                                    }
                          response.log.push(obj);
                        });
                        console.log(response);
                        res.json(response);
                      }).limit(limitSize);
    }
  });
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
