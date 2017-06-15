'use strict';

const twilio = require('twilio');
const config = require('./config.json');

const accountSid = 'AC1b9c9ffd2e1b25cb611e4312e1e6979a'; // Your Account SID from www.twilio.com/console
const authToken = '828599c4764a07fdf3943beda477db18';   // Your Auth Token from www.twilio.com/console


const MessagingResponse = twilio.twiml.MessagingResponse;

const projectId = process.env.GCLOUD_PROJECT;
const region = 'us-central1';

exports.reply = (req, res) => {
  let isValid = true;

  // Only validate that requests came from Twilio when the function has been
  // deployed to production.
  if (process.env.NODE_ENV === 'production') {
    isValid = twilio.validateExpressRequest(req, config.TWILIO_AUTH_TOKEN, {
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
    return;
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
  return;
};

exports.send = (req, res) => {
  var client = new twilio(accountSid, authToken);

  let isValid = true;

  client.messages.create({
    body: 'Hello from Node',
    to: '+14053566661',  // Text this number
    from: '+14158532646' // From a valid Twilio number
  })
  .then((message) => console.log(message.sid));
};

require('make-runnable');
