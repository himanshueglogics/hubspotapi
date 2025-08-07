require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser'); // For parsing workflow JSON properly
const Hubspot = require('@hubspot/api-client');

const hubspotClient = new Hubspot.Client({"developerApiKey":"na2-fbde-3ecf-4c48-935d-97425ba80209"});
const app = express();
app.use(bodyParser.json()); // HubSpot webhook sends JSON

const clientId = 'd47e06e6-9156-4495-bc9c-efba677a610c';
const clientSecret = '45518836-399f-49cf-89a2-0e43924ca323';
const url= process.env.BASE_URL; // Your app's callback URL
console.log('BASE_URL:', url);
// Important: Must match the registered redirect URI in HubSpot and in OAuth URL below!
const redirectUri = `${url}/oauth/callback`;

// In-memory store for demonstration only:
// In production, store these per user/portal in a DB!
let accessToken = '';
let refreshToken = '';

// Start OAuth install process
app.get('/install', (req, res) => {
    const authUrl = `https://app-na2.hubspot.com/oauth/authorize?client_id=d47e06e6-9156-4495-bc9c-efba677a610c&redirect_uri=${url}/oauth/callback&scope=crm.objects.contacts.write%20automation%20oauth%20crm.objects.contacts.read`;
    res.redirect(authUrl);
});

// Receive OAuth callback
app.get('/oauth/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.status(400).send('Missing OAuth code');

    try {
        const tokenResponse = await axios.post('https://api.hubapi.com/oauth/v1/token',
            new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                code,
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        accessToken = tokenResponse.data.access_token;
        refreshToken = tokenResponse.data.refresh_token;
        console.log('OAuth successful, tokens obtained:', { accessToken, refreshToken });
        // Register the workflow extension with the user's token
        const ok = await registerWorkflowExtension(accessToken);
        if (ok) {
            res.send('App installed and workflow extension registered! Go to HubSpot Workflows to use your custom action.');
        } else {
            res.status(500).send('Workflow extension registration failed, check logs.');
        }
    } catch (error) {
        console.error('OAuth failed', error.response?.data || error.message);
        res.status(500).send("OAuth failed: " + (error.response?.data?.message || error.message));
    }
});

async function registerWorkflowExtension(accessToken) {
    // Same extension can generally only be registered once per portal.
    // Use try/catch to handle "already exists" errors gracefully.
    // const payload = {
    //     enabled: true,
    //     name: "Send SMS/WhatsApp via SendMetrix",
    //     description: "Send SMS or WhatsApp messages via SendMetrix gateway from HubSpot workflows.",
    //     actions: [
    //         {
    //             id: "send_sms_whatsapp",
    //             name: "Send SMS/WhatsApp Message",
    //             type: "STANDARD",
    //             labels: { en: "Send SMS/WhatsApp" },
    //             inputFields: [
    //                 {
    //                     type: "enumeration",
    //                     fieldType: "select",
    //                     name: "channel",
    //                     label: "Message Channel",
    //                     description: "Choose SMS or WhatsApp",
    //                     options: [
    //                         { label: "SMS", value: "sms" },
    //                         { label: "WhatsApp", value: "whatsapp" }
    //                     ],
    //                     required: true,
    //                     groupName: "message"
    //                 },
    //                 {
    //                     type: "string",
    //                     fieldType: "text",
    //                     name: "message",
    //                     label: "Message Content",
    //                     description: "Use tokens, e.g. {{ contact.firstname }}",
    //                     required: true,
    //                     groupName: "message"
    //                 },
    //                 {
    //                     type: "string",
    //                     fieldType: "text",
    //                     name: "phone_number",
    //                     label: "Phone Number",
    //                     description: "Contact's phone number or contact property with phone.",
    //                     required: true,
    //                     groupName: "message"
    //                 }
    //             ],
    //             outputFields: [
    //                 {
    //                     type: "string",
    //                     fieldType: "text",
    //                     name: "status",
    //                     label: "Send Status"
    //                 }
    //             ]
    //         }
    //     ],
    //     callbackUrl: "http://localhost:8000/workflow/trigger"
    // };

//     const actionDefinition = {
//   name: "Send SMS/WhatsApp via SendMetrix",
//   description: "Custom action to send SMS or WhatsApp messages via SendMetrix",
//   inputFields: [
//     {
//       name: "channel",
//       label: "Channel",
//       description: "Choose SMS or WhatsApp",
//       type: "enumeration",
//       options: [
//         { label: "SMS", value: "sms" },
//         { label: "WhatsApp", value: "whatsapp" }
//       ],
//       required: true,
//     },
//     {
//       name: "message",
//       label: "Message Content",
//       description: "Text message with tokens, e.g. {{ contact.firstname }}",
//       type: "string",
//       required: true
//     },
//     {
//       name: "phone_number",
//       label: "Phone Number",
//       description: "Phone number or contact property",
//       type: "string",
//       required: true
//     }
//   ],
//   outputFields: [
//     {
//       name: "status",
//       label: "Send Status",
//       type: "string"
//     }
//   ],
//   callbackUrl: "https://yourdomain.com/workflow/trigger",
//   appActionId: "send_sms_whatsapp_001"
// };

const PublicActionDefinitionEgg = {
  "functions": [],
  "actionUrl": `${url}/workflow/trigger`,
  "published": true,
  "labels": {
    "en": {
      "inputFieldDescriptions": {
        "phone_number": "Contact's phone number",
        "channel": "Which channel to use",
        "message": "Message text with optional personalization tokens"
      },
      "outputFieldLabels": {
        "status": "Send Status"
      },
      "actionDescription": "Send an SMS or WhatsApp message from a workflow",
      "inputFieldLabels": {
        "phone_number": "Phone Number",
        "channel": "Channel",
        "message": "Message"
      },
      "actionName": "Send SMS/WhatsApp",
      "actionCardContent": "This action sends an SMS or WhatsApp message using SendMetrix"
    }
  },
  "inputFields": [
    {
      "isRequired": true,
      "automationFieldType": "string",
      "typeDefinition": {
        "helpText": "The destination phone number. Can use a contact property.",
        "referencedObjectType": null,
        "name": "phone_number",
        "options": [],
        "description": "Contact's phone number",
        "externalOptionsReferenceType": null,
        "label": "Phone Number",
        "type": "string",
        "fieldType": "text",
        "optionsUrl": null,
        "externalOptions": false
      },
      "supportedValueTypes": [
        "STATIC_VALUE"
      ]
    },
    {
      "isRequired": true,
      "automationFieldType": "string",
      "typeDefinition": {
        "helpText": "Choose SMS or WhatsApp",
        "referencedObjectType": null,
        "name": "channel",
        "options": [
          {
            "label": "SMS",
            "value": "sms"
          },
          {
            "label": "WhatsApp",
            "value": "whatsapp"
          }
        ],
        "description": "Select delivery channel",
        "externalOptionsReferenceType": null,
        "label": "Channel",
        "type": "enumeration",
        "fieldType": "select",
        "optionsUrl": null,
        "externalOptions": false
      },
      "supportedValueTypes": [
        "STATIC_VALUE"
      ]
    },
    {
      "isRequired": true,
      "automationFieldType": "string",
      "typeDefinition": {
        "helpText": "Your message. Supports tokens like {{ contact.firstname }}.",
        "referencedObjectType": null,
        "name": "message",
        "options": [],
        "description": "Text content of the message",
        "externalOptionsReferenceType": null,
        "label": "Message",
        "type": "string",
        "fieldType": "text",
        "optionsUrl": null,
        "externalOptions": false
      },
      "supportedValueTypes": [
        "STATIC_VALUE"
      ]
    }
  ],
  "outputFields": [
    {
      "typeDefinition": {
        "helpText": "Message delivery status",
        "referencedObjectType": null,
        "name": "status",
        "options": [],
        "description": "Status of message sending",
        "externalOptionsReferenceType": null,
        "type": "string",
        "fieldType": "text",
        "optionsUrl": null,
        "externalOptions": false
      }
    }
  ],
  "objectTypes": [
    "CONTACT"
  ]
};



   

    try {
        // const reg = await axios.post(
        //     'https://api.hubapi.com/automationextensions/v1/extensions',
        //     payload,
        //     { headers: { Authorization: `Bearer ${accessToken}` } }
        // );
         const appId = 17385118; // your HubSpot app ID, numeric
    
    // const response = await axios.post(
    //   `https://api.hubapi.com/automation/v4/actions/${appId}`,
    //   actionDefinition,
    //   {
    //     headers: {
    //       Authorization: `Bearer ${accessToken}`,
    //       'Content-Type': 'application/json'
    //     }
    //   }
    // );
    const apiResponse = await hubspotClient.automation.actions.definitionsApi.create(appId, PublicActionDefinitionEgg);
    // console.log(JSON.stringify(apiResponse, null, 2));
    // console.log('Direct axios registration success:', apiResponse);
    console.log('Workflow extension created:', JSON.stringify(apiResponse, null, 2));
    // Optionally, you can store the created action definition ID for later use
    const actionId = apiResponse.id;

        // console.log("Workflow extension registered:", reg.data);
        return true;
    } catch (error) {
        console.error('Extension registration error:', error.response?.data || error.message);
        return false;
    }
}

// Example webhook handler
app.post('/workflow/trigger', async (req, res) => {
    // You must use bodyParser to parse JSON, as above!
    const { inputs, objectId: contactId } = req.body; // Modern HubSpot uses objectId for contact!

    // In production, fetch stored tokens and keys for the portal/user!
    try {
        // 1. Fetch contact details (tokens, phone, etc.)
        const contact = await axios.get(
            `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}?properties=firstname,phone`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        // 2. Compose message
        let message = inputs.message || '';
        message = message.replace('{{ contact.firstname }}', contact.data.properties.firstname || '');
        // 3. Set phone number
        let phoneNumber = inputs.phone_number;
        if (contact.data.properties[phoneNumber]) phoneNumber = contact.data.properties[phoneNumber];

        // 4. Call your SendMetrix API here
        const sendmetrixResponse = { data: { status: 'ok' } }; // Mock for now

        // 5. Optionally log to HubSpot Engagements

        // 6. Respond to workflow
        res.json({ outputFields: { status: sendmetrixResponse.data.status }});
    } catch (error) {
        console.error('Workflow trigger error:', error);
        res.status(500).json({ outputFields: { status: 'fail' }});
    }
});

app.listen(8000, () => console.log('OAuth backend running at http://localhost:8000/install'));
