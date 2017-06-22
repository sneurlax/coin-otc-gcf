'use strict';

const functions = require('firebase-functions');
const HH = require('firebase-humanhash');
const DEFAULT_HASHER = new HH.HumanHasher();

const twilio = require('twilio');
const twilioConfig = require('./config.json');

// Firebase Setup
const admin = require('firebase-admin');
const serviceAccount = require('./coin-otc-firebase-adminsdk-s3vrv-c0f6e6ed01.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://coin-otc.firebaseio.com'
});

// Authentication (see https://github.com/firebase/functions-samples/tree/master/authorized-https-endpoint)
const express = require('express');
const cookieParser = require('cookie-parser')();
const cors = require('cors')({origin: true});
const app = express();

const validateFirebaseIdToken = (req, res, next) => {
  console.log('Check if request is authorized with Firebase ID token');

  if ((!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) &&
      !req.cookies.__session) {
    console.error('No Firebase ID token was passed as a Bearer token in the Authorization header.',
        'Make sure you authorize your request by providing the following HTTP header:',
        'Authorization: Bearer <Firebase ID Token>',
        'or by passing a "__session" cookie.');
    res.status(403).send('Unauthorized');
    return;
  }

  let idToken;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    console.log('Found "Authorization" header');
    // Read the ID Token from the Authorization header.
    idToken = req.headers.authorization.split('Bearer ')[1];
  } else {
    console.log('Found "__session" cookie');
    // Read the ID Token from cookie.
    idToken = req.cookies.__session;
  }
  admin.auth().verifyIdToken(idToken).then(decodedIdToken => {
    console.log('ID Token correctly decoded', decodedIdToken);
    req.user = decodedIdToken;
    next();
  }).catch(error => {
    console.error('Error while verifying Firebase ID token:', error);
    res
      .status(403)
      .send('Unauthorized');
  });
};

app.use(cors);
app.use(cookieParser);
app.use(validateFirebaseIdToken);

// Twilio Setup
const accountSid = 'AC1b9c9ffd2e1b25cb611e4312e1e6979a'; // Your Account SID from www.twilio.com/console
const authToken = '828599c4764a07fdf3943beda477db18';   // Your Auth Token from www.twilio.com/console

const MessagingResponse = twilio.twiml.MessagingResponse;

// Google Cloud Platform Setup
const projectId = process.env.GCLOUD_PROJECT;
const region = 'us-central1';

app.get('/test', (req, res) => {
  // Push new order to Firebase
  var db = admin.database();
  var ref = db.ref('orders');
  var ordersRef = ref.child('buys');
  var newOrderRef = ordersRef.push();
  var order = {
    '2FA': pad(randomIntFromInterval(0, 999999), 6),
    'HHid': DEFAULT_HASHER.humanize(newOrderRef.key)//,
    // 'id': newRef.key()
  }
  // TODO: RE-ENABLE
  // newOrderRef.set(order);
  // .then()?
  // .catch()?

  res
    .type('text/plain')
    .status(200)
    .send(order['2FA']);
  return
});

app.post('/auth', (req, res) => {
  // TODO validate req.body.number

  // Push new order to Firebase
  var db = admin.database();
  var ref = db.ref('orders');
  var ordersRef = ref.child('buys');
  var newOrderRef = ordersRef.push();
  var randToken = pad(randomIntFromInterval(0, 999999), 6);
  var order = {
    'phone': req.body.number,
    'twoFA': randToken,
    'HHid': DEFAULT_HASHER.humanize(newOrderRef.key)//,
    // 'id': newRef.key()
  }
  newOrderRef.set(order);
  // .then()?
  // .catch()?

  // Text 2FA code
  /*
  var client = new twilio(accountSid, authToken);

  let isValid = true;

  client.messages.create({
    body: 'Coin-OTC 2FA Token: '+order['2FA'],
    to: '+'+order['phone'],  // Text this number
    from: '+14158532646' // From a valid Twilio number
  })
  .then((message) => console.log(message.sid));
  */

  res
    .type('text/plain')
    .status(202)
    .send(newOrderRef.key);
  return
});

app.post('/twoFA', (req, res) => {
  // TODO validate orderUID
  // TODO validate 2FA

  // Check order's 2FA on Firebase
  var db = admin.database();
  var ref = db.ref('orders/buys/'+req.body.orderUID).once('value').then(function(snapshot) {
    if(snapshot.val().twoFA == req.body.twoFA) {
      res
        .type('text/plain')
        .status(202)
        .send();
    } else {
      res
        .type('text/plain')
        .status(401)
        .send();
    }
    return
  });
});

exports.app = functions.https.onRequest(app);
exports.test = functions.https.onRequest(app);
exports.auth = functions.https.onRequest(app);
exports.twoFA = functions.https.onRequest(app);

// exports.send = (req, res) => {
//   // TODO take input
//   var client = new twilio(accountSid, authToken);

//   let isValid = true;

//   client.messages.create({
//     body: 'Hello from Node',
//     to: '+14053566661',  // Text this number
//     from: '+14158532646' // From a valid Twilio number
//   })
//   .then((message) => console.log(message.sid));

//   // TODO proper response
//   res
//     .type('text/plain')
//     .status(200)
//     .send('MESSAGE SENT')
//     .end();
//   return
// };

// exports.reply = (req, res) => {
//   let isValid = true;

//   // Only validate that requests came from Twilio when the function has been
//   // deployed to production.
//   if (process.env.NODE_ENV === 'production') {
//     isValid = twilio.validateExpressRequest(req, twilioConfig.TWILIO_AUTH_TOKEN, {
//       url: `https://${region}-${projectId}.cloudfunctions.net/reply`
//     });
//   }

//   // Halt early if the request was not sent from Twilio
//   if (!isValid) {
//     res
//       .type('text/plain')
//       .status(403)
//       .send('Twilio Request Validation Failed.')
//       .end();
//     return
//   }

//   // Prepare a response to the SMS message
//   const response = new MessagingResponse();

//   // Add text to the response
//   response.message('Hello from Google Cloud Functions!');

//   // Send the response
//   // res
//   //   .status(200)
//   //   .type('text/xml')
//   //   .end(response.toString());

//   // No need to spend money (and part of our daily total) responding to any texts.
//   res
//     .type('text/plain')
//     .status(204)
//     .send('Twilio SMS Response not needed.')
//     .end();
//   return
// };

function randomIntFromInterval(min, max) {
  return Math.floor(Math.random()*(max-min+1)+min);
}

function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

require('make-runnable/custom')({ printOutputFrame: false });
