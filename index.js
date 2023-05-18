// include the express module
var express = require("express");

// create an express application
var app = express();
const url = require('url');

// helps in extracting the body portion of an incoming request stream
var bodyparser = require('body-parser');

// fs module - provides an API for interacting with the file system
var fs = require("fs");

var path = require('path');

// helps in managing user sessions
var session = require('express-session');

// include the mysql module
var mysql = require("mysql");

// Bcrypt library for comparing password hashes
const bcrypt = require('bcrypt');

// helpful for reading, compiling, rendering pug templates
const pug = require("pug");  
const { ppid } = require("process");

// apply the body-parser middleware to all incoming requests
app.use(bodyparser());

// use express-session
// in memory session is sufficient for this assignment
app.use(session({
  secret: "csci4131secretkey",
  saveUninitialized: true,
  resave: false
}));

const connection = mysql.createConnection({
  host: "cse-mysql-classes-01.cse.umn.edu",
  user: "C4131DF23U4",               
  password: "66",                 
  database: "C4131DF23U4", 
  port: 3306          
});

connection.connect(function(err) {
  if (err) {
    console.log('Error connecting to the database: ' + err);
    return;
  }
});

app.listen(9025, () => console.log('Listening on port 9025!'));

// Load view engine
app.set('views', path.join(__dirname,'views'));
app.set('view engine', 'pug');

app.get('/', function(req, res) {
  // res.sendFile(__dirname + '/client/welcome.html');
  res.render('welcome');
});

app.get('/login', function(req, res) {
  if(req.session.loggedin) {
    res.redirect('/schedule');
  } else {
    // res.sendFile(__dirname + '/client/login.html');
    res.render('login');
  }
});

app.get("/getSchedule", function(req, res) {
  if(req.session.loggedin) {
    res.render("schedule");
  } else {
    res.render("login");
  }
})

app.post('/loginPOST', function(req, res) {
  var username = req.body.username;
  var password = req.body.password;

  connection.query('SELECT acc_password FROM tbl_accounts WHERE acc_login = ?', [username], function(error, results, fields) {
    if(error) {
      console.log('Error occurred while querying the database: ' + error);
      res.status(500).json({ status: 'error', message: 'An error occurred while processing your request.' });
    } else {
      if(results.length > 0 && bcrypt.compareSync(password, results[0].acc_password)) {
        req.session.loggedin = true;
        req.session.username = username;

        console.log('Login successful!');
        res.json({ status: 'success' });
      } else {
        console.log('Invalid username or password!');
        res.status(401).json({ status: 'failure', message: 'Invalid username or password!' });
      }
    }
  });
});

app.get('/addEvent', function(req, res) {
  if(!req.session.loggedin) {
    res.redirect('login');
    // res.render('/login');
  } else {
    // res.sendFile(__dirname + '/client/addEvent.html');
    res.render("addEvent");
  }
})

app.post('/postEventEntry', function(req, res) {
  if(!req.session.loggedin) {
    res.redirect('/login');
    // res.render('/login');
  } else {
    var day = req.body.day;
    var event = req.body.event;
    var start = req.body.start;
    var end = req.body.end;
    var location = req.body.location;
    var phone = req.body.phone;
    var info = req.body.info;
    var url = req.body.url;

    var query = 'INSERT INTO tbl_events (event_day, event_event, event_start, event_end, event_location, event_phone, event_info, event_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    var values = [day, event, start, end, location, phone, info, url];

    connection.query(query, values, function(error, results, fields) {
      if(error) {
        console.log('Error inserting data into database: ' + error);
        res.status(500).json({ status: 'error', message: 'An error processing request.' });
      } else {
        console.log('Data inserted into database successfully.');
        res.redirect('getSchedule');
      }
    });
  }
});

app.get('/schedule', function(req, res) {
  if(!req.session.loggedin) {
    res.redirect('login');
    // res.render('/login');
  } else {
    const dayOf = req.query.day;
    const query = `SELECT * FROM tbl_events WHERE event_day = ? ORDER BY event_start`;
    connection.query(query, (dayOf),  (error, results) => {
      if (error) {
        console.error(error);
        res.status(500).send('Error retrieving schedule');
      } else {
        res.json(results);
      }
    });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(); 
  res.redirect('login');
  // res.render('/login');
});

app.get('/editEvent/:eventId', (req, res) => {
  const eventId = req.params.eventId;
  connection.query('SELECT * FROM tbl_events WHERE event_id = ?', [eventId], function (error, results) {
    if (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    } else if (results.length === 0) {
      res.status(404).send('Event not found');
    } else {
      const event = results[0];
      res.render('editEvent', { event });
    }
  });
});

app.delete('/schedule/:eventId', function (req, res) {
  const eventId = req.params.eventId;
  connection.query('SELECT * FROM tbl_events WHERE event_id = ?', [eventId], function (error, results) {
    if (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    } else if (results.length === 0) {
      res.status(404).send('Event not found');
    } else {
      connection.query('DELETE FROM tbl_events WHERE event_id = ?', [eventId], function (error, results) {
        if (error) {
          console.error(error);
          res.status(500).send('Internal Server Error');
        } else {
          res.status(200).send('Event deleted');
        }
      });
    }
  });
});

app.post('/editEventEntry', function(req, res) {
  if(!req.session.loggedin) {
    res.redirect('/login');
  } else {
    var eventId = req.body.eventId;
    var day = req.body.day;
    var event = req.body.event;
    var start = req.body.start;
    var end = req.body.end;
    var location = req.body.location;
    var phone = req.body.phone;
    var info = req.body.info;
    var url = req.body.url;

    console.log( typeof req.body.eventId);

    var query = 'UPDATE tbl_events SET event_day=?, event_event=?, event_start=?, event_end=?, event_location=?, event_phone=?, event_info=?, event_url=? WHERE event_id=?';
    var values = [day, event, start, end, location, phone, info, url, eventId];

    connection.query(query, values, function(error, results, fields) {
      if(error) {
        console.log('Error updating data in the database: ' + error);
        res.status(500).json({ status: 'error', message: 'An error processing request.' });
      } else {
        console.log('Data updated in database successfully.');
        res.redirect('getSchedule');
      }
    });
  }
});


app.use('/client', express.static(__dirname + '/client'));


app.get('*', function(req, res) {
  res.sendStatus(404);
});
