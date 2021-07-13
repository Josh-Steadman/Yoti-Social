require('dotenv').config();
const {
    DocScanClient,
    SessionSpecificationBuilder,
    RequestedDocumentAuthenticityCheckBuilder,
    RequestedLivenessCheckBuilder,
    RequestedTextExtractionTaskBuilder,
    RequestedFaceMatchCheckBuilder,
    SdkConfigBuilder,
} = require('yoti');
const fs = require('fs');
const path = require('path');
const express = require('express');
const session = require('express-session');
var cookieParser = require('cookie-parser');


const yotiApi = process.env.YOTI_DOC_SCAN_API_URL
const CLIENT_SDK = process.env.SANDBOX_CLIENT_SDK_ID
const PEM = fs.readFileSync(process.env.YOTI_KEY_FILE_PATH, 'utf8');
const app = express()
const port = 3010

app.set('view engine', 'ejs')
app.use(express.static(__dirname + '/public'));
app.use(cookieParser());
app.use(session({
    key: process.env.SESSION_KEY,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 6000000
    }
  }));


const {
    SandboxDocScanClientBuilder,
    SandboxBreakdownBuilder,
    SandboxRecommendationBuilder,
    SandboxDocumentAuthenticityCheckBuilder,
    SandboxCheckReportsBuilder,
    SandboxResponseConfigBuilder,
    SandboxDocumentTextDataCheckBuilder,
    SandboxTaskResultsBuilder,
    SandboxDocumentTextDataExtractionTaskBuilder,
  } = require('@getyoti/sdk-sandbox');





const sandboxClient = new SandboxDocScanClientBuilder()
  .withClientSdkId(CLIENT_SDK)
  .withPemString(PEM)
  .build();

  

const docScanClient = new DocScanClient(CLIENT_SDK, PEM);

// // create session

const documentAuthenticityCheck = new RequestedDocumentAuthenticityCheckBuilder().build();

    //Liveness check with 2 retries
const livenessCheck = new RequestedLivenessCheckBuilder()
    .forZoomLiveness()
    .withMaxRetries(2)
    .build();

    //Face Match Check with manual check set to fallback
const faceMatchCheck = new RequestedFaceMatchCheckBuilder()
    .withManualCheckFallback()
    .build();

    //ID Document Text Extraction Task with manual check set to fallback
const textExtractionTask = new RequestedTextExtractionTaskBuilder()
    .withManualCheckFallback()
    .build();

    //Configuration for the client SDK (Frontend)
const sdkConfig = new SdkConfigBuilder()
    .withAllowsCameraAndUpload()
    .withPresetIssuingCountry('GBR')
    .withSuccessUrl('http://localhost:3010/home')
    .withErrorUrl('http://localhost:3010/error')
    .build();

    //Buiding the Session with defined specification from above
const sessionSpec = new SessionSpecificationBuilder()
    .withClientSessionTokenTtl(600)
    .withResourcesTtl(604800) 
    .withUserTrackingId('some-user-tracking-id')
    .withRequestedCheck(documentAuthenticityCheck)
    .withRequestedCheck(livenessCheck)
    .withRequestedCheck(faceMatchCheck)
    .withRequestedTask(textExtractionTask)
    .withSdkConfig(sdkConfig)
    .build();

    


// mock data


  const responseConfig = new SandboxResponseConfigBuilder()
      .withCheckReports(
        new SandboxCheckReportsBuilder()
          .withAsyncReportDelay(5)
          .withDocumentAuthenticityCheck(
            new SandboxDocumentAuthenticityCheckBuilder()
              .withBreakdown(
                new SandboxBreakdownBuilder()
                  .withSubCheck('security_features')
                  .withResult('NOT_AVAILABLE')
                  .withDetail('some_detail', 'some_detail_value')
                  .build()
              )
              .withRecommendation(
                new SandboxRecommendationBuilder()
                  .withValue('NOT_AVAILABLE')
                  .withReason('PICTURE_TOO_DARK')
                  .withRecoverySuggestion('BETTER_LIGHTING')
                  .build()
              )
              .build()
          )
          .withDocumentTextDataCheck(
            new SandboxDocumentTextDataCheckBuilder()
              .withBreakdown(
                new SandboxBreakdownBuilder()
                  .withSubCheck('document_in_date')
                  .withResult('PASS')
                  .build()
              )
              .withRecommendation(
                new SandboxRecommendationBuilder()
                  .withValue('APPROVE')
                  .build()
              )
              .withDocumentFields({
                full_name: 'Joshua Steadman',
                nationality: 'GBR',
                date_of_birth: '1997-09-30',
                document_number: '123456789',
              })
              .build()
          )
          .build()
      )
      .withTaskResults(
        new SandboxTaskResultsBuilder()
          .withDocumentTextDataExtractionTask(
            new SandboxDocumentTextDataExtractionTaskBuilder()
              .withDocumentFields({
                full_name: 'Joshua Steadman',
                nationality: 'GBR',
                date_of_birth: '1997-09-30',
                document_number: '123456789',
              })
              .build()
          )
          .build()
      )
      .build();


app.get('/',function(req,res) { 
    res.sendFile(path.join(__dirname+'/views/home.html'));
});



app.get('/index', (req,res) => {
    let sessionId
    docScanClient
    .createSession(sessionSpec)
    .then((session) => {
         sessionId = session.getSessionId();
        const clientSessionToken = session.getClientSessionToken();
        
        
        console.log(sessionId);
        console.log(clientSessionToken)
        req.session.YotiId = sessionId
        
        sandboxClient.configureSessionResponse(sessionId, responseConfig);
        // Send user to sandbox indentification page 
        res.statusCode = 302;
        res.setHeader("Location", `https://api.yoti.com/sandbox/idverify/v1/web/index.html?sessionID=${sessionId}&sessionToken=${clientSessionToken}`);
        res.end();

    })
    .catch((err) => {
        console.log(err)
    });
    
    
    
})



// make get request async
app.get('/home',  async (req,res) => {
    let docId;
    let data;
    // get Yoti_session_id to retrieve data and image 
    console.log(req.session.YotiId)
    
    
    const session = await docScanClient.getSession(req.session.YotiId)
        
        const resources = session.getResources();

    // Returns a collection of ID Documents
    const idDocuments = resources.getIdDocuments();
    let pageMediaIds; 

    idDocuments.map((idDocument) => {

        
        // Returns pages of an ID Document
        const pages = idDocument.getPages();
        // Get pages media ids
         pageMediaIds = pages.map(page => {
            if (page.getMedia() && page.getMedia().getId()) {
                return page.getMedia().getId();
            }
            return null;
        });

        const documentFields = idDocument.getDocumentFields();
        // Get document fields media id
        let documentFieldsMediaId = null;
        if (documentFields) {
            documentFieldsMediaId = documentFields.getMedia().getId();
        }
        console.log('Here')
        console.log(pageMediaIds)
        console.log(documentFieldsMediaId)
        docId = documentFieldsMediaId
        console.log('HERE')
        
    })
   
      // do const media = await docScanClient
       const media = await docScanClient.getMediaContent(req.session.YotiId, docId)
            const content = media.getContent();
            const buffer = content.toBuffer();
            const jsonData = JSON.parse(buffer);
            // handle jsonData here
            console.log(jsonData)
            data = jsonData
        

      const mediaImage = await docScanClient.getMediaContent(req.session.YotiId, pageMediaIds[0])
        
        const base64Content = mediaImage.getBase64Content();        
      
      res.render('index', {'data': data, 'image': base64Content} ) 
    
    
})

app.get('/error', (req,res) => {
    res.sendFile(path.join(__dirname+'/views/error.html'))
})

app.listen(port, () => {
        console.log(`listening on port ${port}`)
})

