const {
    DocScanClient,
    SessionSpecificationBuilder,
    RequestedDocumentAuthenticityCheckBuilder,
    RequestedLivenessCheckBuilder,
    RequestedTextExtractionTaskBuilder,
    RequestedFaceMatchCheckBuilder,
    SdkConfigBuilder,
    NotificationConfigBuilder,
} = require('yoti');
const fs = require('fs');
const path = require('path');

const YOTI_DOC_SCAN_API_URL = 'https://api.yoti.com/sandbox/idverify/v1'
const SANDBOX_CLIENT_SDK_ID = '9141ff6a-84f4-4baa-9569-e4a070e427c8';
const PEM = fs.readFileSync('../TechnicalTest/privateKey.pem', 'utf8');


const { SandboxDocScanClientBuilder } = require('@getyoti/sdk-sandbox');

const sandboxClient = new SandboxDocScanClientBuilder()
  .withClientSdkId(SANDBOX_CLIENT_SDK_ID)
  .withPemString(PEM)
  .build();

const docScanClient = new DocScanClient(SANDBOX_CLIENT_SDK_ID, PEM);

// create session

 docScanClient
    .createSession(sessionSpec)
    .then((session) => {
        const sessionId = session.getSessionId();
        const clientSessionToken = session.getClientSessionToken();
        const clientSessionTokenTtl = session.getClientSessionTokenTtl();
        console.log(sessionId);
    })
    .catch((err) => {
        console.log(err)
    });