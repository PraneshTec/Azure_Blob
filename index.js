require('dotenv').config();
const express = require('express');
const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cron = require('node-cron');
const qs = require('qs');

const multer = require('multer');

const app = express();
const port = process.env.PORT || 3000;
const querystring = require('node:querystring'); 


const salesforceClientId = process.env.SALESFORCE_CLIENT_ID;
const salesforceClientSecret = process.env.SALESFORCE_CLIENT_SECRET;
const salesforceUsername = process.env.SALESFORCE_USERNAME;
const salesforcePassword = process.env.SALESFORCE_PASSWORD;
const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;


if (!salesforceClientId || !salesforceClientSecret || !salesforceUsername || !salesforcePassword || !accountName || !accountKey || !containerName) {
    throw new Error("Environment variables are not configured correctly.");
  }
  
  const credentials = new StorageSharedKeyCredential(accountName, accountKey);
  const blobServiceClient1 = new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, credentials);

  // console.log(blobServiceClient1,"++++++++++++++++++++++++++++++++++");
  
  const data1 ="grant_type=password&client_id=3MVG9pRzvMkjMb6lZD5iPWTQcIRg0mhoygDMz9reFB.hvygJyNPguLwF4GFNIJSCtMEgkEREF_KAg86ZS5MAX&client_secret=312D860BE7BEA8D900FF25E4F7C2F69C1C44C9BE5ECD2793D0755F001D075D44&username=mugeshkannagk@gmail.com&password=3002012819SK@l"

  async function getSalesforceContentVersions() {
    const authResponse = await axios.post('https://login.salesforce.com/services/oauth2/token',data1, {
     headers : {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
    // data: querystring.stringify({
    //     grant_type: 'password',
    //     client_id: salesforceClientId,
    //     client_secret: salesforceClientSecret,
    //     username: salesforceUsername,
    //     password: salesforcePassword
    //   })
    // params: {
    //   grant_type: 'password',
    //   client_id: salesforceClientId,
    //   client_secret: salesforceClientSecret,
    //   username: salesforceUsername,
    //   password: salesforcePassword
    // }
    });
  
    const accessToken = authResponse.data.access_token;
    const instanceUrl = authResponse.data.instance_url;

    // console.log(authResponse,"---------------------------------------------------------------");
  
    const dataResponse = await axios.get(`${instanceUrl}/services/data/v59.0/query`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      params: {
        q: 'SELECT Id, Title, VersionData FROM ContentVersion'
      }
    });
    // console.log(dataResponse.data.records,"++++++++++++++++++++++++++");
    return dataResponse.data.records;
    
  }
  // console.log(getSalesforceContentVersions(),">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>--------------------------------------------------------------------");
  // async function storeContentInAzureBlob(content) {
  //   // console.log(getSalesforceContentVersions(),">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>--------------------------------------------------------------------");
  //   const containerClient = blobServiceClient1.getContainerClient(containerName);
  //   for (const record of content) {
  //     const blockBlobClient = containerClient.getBlockBlobClient(`${record.Title}-${record.Id}.bin`);
  //     const contentResponse = await axios.get(record.VersionData, {
  //       responseType: 'arraybuffer',
  //       headers: {
  //         Authorization: `Bearer ${accessToken}`
  //       }
  //     });
  //     const contentBuffer = Buffer.from(contentResponse.data);
  //     await blockBlobClient.upload(contentBuffer, contentBuffer.length);
  //   }
  // }
  
  async function storeContentInAzureBlob(data) {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobName = `salesforce-data-${Date.now()}.json`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const dataBuffer = Buffer.from(JSON.stringify(data));
  
    await blockBlobClient.upload(dataBuffer, dataBuffer.length);
  }

  async function fetchDataAndStore() {
    try {
      const content = await getSalesforceContentVersions();
      await storeContentInAzureBlob(content);
      console.log('Content successfully fetched from Salesforce and stored in Azure Blob Storage.');    


    } catch (error) {
      console.error('Error fetching content from Salesforce or storing in Azure Blob Storage:', error);
    }
  }
  
  // Schedule the process to run every 30 days
  cron.schedule('0 0 0 */30 * *', fetchDataAndStore);




  app.get('/run-task', async (req, res) => {
    await fetchDataAndStore();
    res.send('Data fetching and storing task executed.');
  });

// // Environment variables (make sure to set these in your environment)
// const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
// const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
// const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;

// if (!accountName || !accountKey || !containerName) {
//   throw new Error('AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_ACCOUNT_KEY, and AZURE_STORAGE_CONTAINER_NAME must be set');
// }

// const credentials = new StorageSharedKeyCredential(accountName, accountKey);
// const blobServiceClient = new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, credentials);

// app.get('/blob', async (req, res) => {
//   const blobName = req.query.name;

//   if (!blobName) {
//     return res.status(400).send('Blob name is required as a query parameter');
//   }

//   try {
//     const containerClient = blobServiceClient.getContainerClient(containerName);
//     const blobClient = containerClient.getBlobClient(blobName);
//     const downloadBlockBlobResponse = await blobClient.download();

//     // Convert stream to buffer
//     const buffer = await streamToBuffer(downloadBlockBlobResponse.readableStreamBody);

//     res.setHeader('Content-Type', downloadBlockBlobResponse.contentType);
//     res.send(buffer);
//   } catch (error) {
//     res.status(500).send(`Error retrieving blob: ${error.message}`);
//   }
// });

// async function streamToBuffer(readableStream) {
//   return new Promise((resolve, reject) => {
//     const chunks = [];
//     readableStream.on('data', (data) => {
//       chunks.push(data instanceof Buffer ? data : Buffer.from(data));
//     });
//     readableStream.on('end', () => {
//       resolve(Buffer.concat(chunks));
//     });
//     readableStream.on('error', reject);
//   });
// }

const containerName1 = 'sffiles';

const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);

const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('file'), async (req, res) => {
    const file = req.file;

    if (!file) {
        return res.status(400).send('No file uploaded.');
    }

    try {
      // console.log(req.file.mimetype,"999999999999999999999999999");
        // Get the container client
        const containerClient = blobServiceClient.getContainerClient(containerName1);

        // Get the file path and name
        const filePath = file.path;
        const fileName = file.originalname;
        const filetype = req.file.mimetype;
        const fileSize = req.file.size;

        const form = new FormData();

        form.append("attachment", fs.readFileSync(filePath)); // Option B

        // Create the blob client
        const blockBlobClient = containerClient.getBlockBlobClient(fileName);

        // Read the file into a buffer
        const fileData = fs.readFileSync(filePath);

        // Upload the file
        await blockBlobClient.upload(fileData, fileData.length,{ blobHTTPHeaders: { blobContentType: filetype }});

        // Delete the temporary file
        fs.unlinkSync(filePath);

        const downloadBlockBlobResponse = await blockBlobClient.download(0);
        const contentType = downloadBlockBlobResponse.contentType;
        res.setHeader('Content-Type', "multipart/form-data");

        const blobClient = containerClient.getBlobClient(fileName);

        const blobProperties = await blobClient.getProperties()

// console.log(blobProperties,"tttttttttttttttttttttttt");

    //    const Preview = axios.get('http://localhost:3000/preview/'+`${fileName}`, async (req, res) => {
    //       // const blobName = fileName;
      
          
    //           const containerClient = blobServiceClient.getContainerClient(containerName1);
    //           const blobClient = containerClient.getBlobClient(fileName);
    //           const downloadBlockBlobResponse = await blobClient.download(0);
              
    //           // Set appropriate content type for previewing
    //           const contentType = downloadBlockBlobResponse.contentType;
    //           // console.log(contentType,"-----------------------------------------------------------");
    //           // res.setHeader('Content-Type', contentType);
      
    //           // Pipe the blob content to the response
    //           // downloadBlockBlobResponse.readableStreamBody.pipe(res);
        
    //   console.log(contentType,"===========================");
    // });

        res.status(200).json({
            // `"File uploaded successfully". Blob URL: ${blockBlobClient.url}`
            Status: "File uploaded successfully",
            Blob_URL: `${blockBlobClient.url}`,
            File_Name: `${fileName}`,
            Preview_URL: "http://localhost:3000/preview/"+`${fileName}`,
            File_Type:  contentType,
            File_Size: fileSize,
            LastModified_Date: blobProperties.lastModified,
            CreatedOn_Date: blobProperties.createdOn
     });
    
    // console.log(Preview.data+"-----------------------------");
    } catch (error) {
        console.error('Error uploading file:', error.message);
        res.status(500).send('Error uploading file');
    }
    // return Preview;   
});

app.get('/blob', async (req, res) => {
  // module.exports = async function (context, req) {
      // replace with your container name
  
      try {
          const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
          const containerClient = blobServiceClient.getContainerClient(containerName1);
          const blobs = [];
          for await (const blob of containerClient.listBlobsFlat()) {
            // console.log(blob,"------------");
              blobs.push({
                name: blob.name,
                size: blob.properties.contentLength,
                lastModified: blob.properties.lastModified

              });
          }
         
          // res = {
          //     status: 200,
          //     body: blobs
          // };
          res.json(blobs)
      } catch (error) {
          // context.log.error(error.message);
          // res = {
          //     status: 500,
          //     body: `Error listing blobs: ${error.message}`
          // };
      }
  // };
  })

  app.get('/preview/:blobName', async (req, res) => {
    const blobName = req.params.blobName;

    try {
        const containerClient = blobServiceClient.getContainerClient(containerName1);
        const blobClient = containerClient.getBlobClient(blobName);
        const downloadBlockBlobResponse = await blobClient.download(0);
        
        // Set appropriate content type for previewing
        const contentType = downloadBlockBlobResponse.contentType;
        // console.log(contentType,"-----------------------------------------------------------");
        res.setHeader('Content-Type', contentType);

        // Pipe the blob content to the response
        downloadBlockBlobResponse.readableStreamBody.pipe(res);
    } catch (error) {
        console.error('Error downloading blob:', error.message);
        res.status(500).send('Error retrieving blob');
    }
});




// const url = 'https://login.salesforce.com/services/oauth2/token';
// const params = {
//       grant_type: 'password',
//       client_id: salesforceClientId,
//       client_secret: salesforceClientSecret,
//       username: salesforceUsername,
//       password: salesforcePassword
// };

// // Make the request to get the OAuth token
// axios.post(url, qs.stringify(params))
//   .then(response => {
//     console.log('Access Token::::::::::::::::::::::::::::::::::::::::::::::::::::::', response.data.access_token);
//     // You can now use the access token to make API calls to Salesforce
//   })
//   .catch(error => {
//     console.error('Error fetching access token from Salesforce:', error.response ? error.response.data : error.message);
//   });

// const Url = 'https://login.salesforce.com/services/oauth2/token';

// const params = {
//   grant_type: 'password',
//         client_id: salesforceClientId,
//         client_secret: salesforceClientSecret,
//         username: salesforceUsername,
//         password: salesforcePassword
// };

// console.log(qs.stringify(params),"00000000000000000000000000000000000000");

// const data ="grant_type=password&client_id=3MVG9pRzvMkjMb6lZD5iPWTQcIRg0mhoygDMz9reFB.hvygJyNPguLwF4GFNIJSCtMEgkEREF_KAg86ZS5MAX&client_secret=312D860BE7BEA8D900FF25E4F7C2F69C1C44C9BE5ECD2793D0755F001D075D44&username=mugeshkannagk@gmail.com&password=3002012819SK@l"

// // Make the POST request to Salesforce OAuth2 token endpoint
// axios.post('https://login.salesforce.com/services/oauth2/token', data, {
//   headers: {
//     'Content-Type': 'application/x-www-form-urlencoded'
//   }
// })
//   .then(response => {
//     console.log('Access Token:', response.data.access_token);
//   })
//   .catch(error => {
//     console.error('Error fetching access token from Salesforce:', error.response ? error.response.data : error.message);
//   });


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
