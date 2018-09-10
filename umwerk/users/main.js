var Fabric_Client = require('fabric-client');
var Fabric_CA_Client = require('fabric-ca-client');

var path = require('path');
var util = require('util');
var os = require('os');

async function getAdminUserContext(fabricClient, fabricCaClient) {
  console.log("retrieving admin user context");
  var adminUserContext = await fabricClient.getUserContext('admin', true);

  if (!adminUserContext || !adminUserContext.isEnrolled()) {
    console.log("enrolling admin user");
    
    console.log("retrieving admin enrollment");
    var enrollment = await fabricCaClient.enroll({
      enrollmentID: 'admin',
      enrollmentSecret: 'adminpw'
    });

    console.log("creating admin user");
    adminUserContext = await fabricClient.createUser({
      username: 'admin',
      mspid: 'Org1MSP',
      cryptoContent: { 
        privateKeyPEM: enrollment.key.toBytes(), 
        signedCertPEM: enrollment.certificate 
      }
    });

    console.log("setting admin user context");
    await fabricClient.setUserContext(adminUserContext)
  }

  return adminUserContext;
}

async function registerUser(username, mspid, adminUserContext, fabricClient, fabricCaClient) {
  console.log("registering user");
  var userSecret = await fabricCaClient.register({
    enrollmentID: username,
    affiliation: 'org1.department1',
    role: 'client'
  }, adminUserContext);

  console.log("user secret is ", userSecret);

  console.log("enrolling user");
  var userEnrollment = await fabricCaClient.enroll({
    enrollmentID: username, 
    enrollmentSecret: userSecret
  });

  console.log("creating user");
  var userContext = await fabricClient.createUser({
    username: username,
    mspid: mspid, //'Org1MSP',
    cryptoContent: { 
      privateKeyPEM: userEnrollment.key.toBytes(), 
      signedCertPEM: userEnrollment.certificate 
    }
  });

  console.log("setting user context");
  await fabricClient.setUserContext(userContext);

  return userContext;
}

(async () => {
  console.log("creating client");
  var fabricClient = new Fabric_Client();

  console.log("creating ca client");

  var	tlsOptions = {
    trustedRoots: [],
    verify: false
  };
  
  var fabricCaClient = new Fabric_CA_Client('http://localhost:7054', tlsOptions , 'ca.example.com', cryptoSuite);    
  
  var storePath = path.join(__dirname, '../hfc-key-store');
  console.log('store path ' + storePath);

  console.log("creating default key value store");
  var defaultKeyVauleStore = await Fabric_Client.newDefaultKeyValueStore({ path: storePath });

  console.log(defaultKeyVauleStore);

  console.log("setting states, suits and key stores")
  fabricClient.setStateStore(defaultKeyVauleStore);
  var cryptoSuite = Fabric_Client.newCryptoSuite();
  var cryptoStore = Fabric_Client.newCryptoKeyStore({path: storePath});
  cryptoSuite.setCryptoKeyStore(cryptoStore);
  fabricClient.setCryptoSuite(cryptoSuite);
  
  var adminUserContext = await getAdminUserContext(fabricClient, fabricCaClient);
  
  await registerUser("Vojko", "Org1MSP", adminUserContext, fabricClient, fabricCaClient);
  await registerUser("Miha", "Org1MSP", adminUserContext, fabricClient, fabricCaClient);
  await registerUser("Grega", "Org1MSP", adminUserContext, fabricClient, fabricCaClient);
  await registerUser("Dave", "Org1MSP", adminUserContext, fabricClient, fabricCaClient);
  
})();

