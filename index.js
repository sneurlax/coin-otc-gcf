'use strict';

const functions = require('firebase-functions');
const HH = require('firebase-humanhash');
const DEFAULT_HASHER = new HH.HumanHasher();

const twilio = require('twilio');
const twilioConfig = require('./config.json');

// Firebase Setup
const admin = require('firebase-admin');
const serviceAccount = require('./coin-otc-595e97625833.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${process.env.GCLOUD_PROJECT}.firebaseio.com`
});

// Twilio Setup
const accountSid = 'AC1b9c9ffd2e1b25cb611e4312e1e6979a'; // Your Account SID from www.twilio.com/console
const authToken = '828599c4764a07fdf3943beda477db18';   // Your Auth Token from www.twilio.com/console

const MessagingResponse = twilio.twiml.MessagingResponse;

// Google Cloud Platform Setup
const projectId = process.env.GCLOUD_PROJECT;
const region = 'us-central1';

exports.test = (req, res) => {
  var db = admin.database();
  var ref = db.ref('orders');
  var ordersRef = ref.child('buys');
  var newOrderRef = ordersRef.push();
  var order = {
    '2FA': pad(randomIntFromInterval(0, 999999), 6),
    'HHid': DEFAULT_HASHER.humanize(newOrderRef.key)
  }
  newOrderRef.set(order);

  // .then()?
  // .catch()?

  // ordersRef.set({
  //   '2FA': pad(randomIntFromInterval(0, 999999), 6),
  //   'id': newRef.key(),
  //   'HHid': DEFAULT_HASHER.humanize(newRef.key())
  // });
  // firebase.database().ref('orders').set({
  //   '2FA': pad(randomIntFromInterval(0, 999999), 6),
  //   'id': newRef.key(),
  //   'HHid': DEFAULT_HASHER.humanize(newRef.key())
  // });
  // 
  // var ref = firebase.database().ref('/coin-otc/order/');
  // var newRef = ref.push(); // doesn't call the server
  // var newOrder = {
  //   '2FA': pad(randomIntFromInterval(0, 999999), 6),
  //   'id': newRef.key(),
  //   'HHid': DEFAULT_HASHER.humanize(newRef.key())
  // };
  // newRef.set(newItem); // calls the server
  res
    .type('text/plain')
    .status(200)
    .send(order['2FA']);
  return
};

exports.auth = (req, res) => {
  // TODO proper auth
  res
    .type('text/plain')
    .status(204)
    .send('NO AUTH METHOD DEFINED')
    .end();
  return
};

exports.send = (req, res) => {
  // TODO take input
  var client = new twilio(accountSid, authToken);

  let isValid = true;

  client.messages.create({
    body: 'Hello from Node',
    to: '+14053566661',  // Text this number
    from: '+14158532646' // From a valid Twilio number
  })
  .then((message) => console.log(message.sid));

  // TODO proper response
  res
    .type('text/plain')
    .status(200)
    .send('MESSAGE SENT')
    .end();
  return
};

exports.reply = (req, res) => {
  let isValid = true;

  // Only validate that requests came from Twilio when the function has been
  // deployed to production.
  if (process.env.NODE_ENV === 'production') {
    isValid = twilio.validateExpressRequest(req, twilioConfig.TWILIO_AUTH_TOKEN, {
      url: `https://${region}-${projectId}.cloudfunctions.net/reply`
    });
  }

  // Halt early if the request was not sent from Twilio
  if (!isValid) {
    res
      .type('text/plain')
      .status(403)
      .send('Twilio Request Validation Failed.')
      .end();
    return
  }

  // Prepare a response to the SMS message
  const response = new MessagingResponse();

  // Add text to the response
  response.message('Hello from Google Cloud Functions!');

  // Send the response
  // res
  //   .status(200)
  //   .type('text/xml')
  //   .end(response.toString());

  // No need to spend money (and part of our daily total) responding to any texts.
  res
    .type('text/plain')
    .status(204)
    .send('Twilio SMS Response not needed.')
    .end();
  return
};

function randomIntFromInterval(min, max) {
  return Math.floor(Math.random()*(max-min+1)+min);
}

function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

require('make-runnable/custom')({ printOutputFrame: false });
