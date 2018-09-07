
var Fabric_Client = require('fabric-client');
var path = require('path');
var util = require('util');
var os = require('os');

(async () => {
	var fabric_client = new Fabric_Client();

	var channel = fabric_client.newChannel('mychannel');
	var peer = fabric_client.newPeer('grpc://localhost:7051');
	channel.addPeer(peer);

	var store_path = path.join(__dirname, '../hfc-key-store');
	console.log('Store path:' + store_path);

	var state_store = await Fabric_Client.newDefaultKeyValueStore({ path: store_path });

	fabric_client.setStateStore(state_store);
	var crypto_suite = Fabric_Client.newCryptoSuite();
	var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
	crypto_suite.setCryptoKeyStore(crypto_store);
	fabric_client.setCryptoSuite(crypto_suite);

	var user_from_store = await fabric_client.getUserContext('user1', true);

	if (!user_from_store || !user_from_store.isEnrolled()) {
		throw new Error('Failed to get user1!');
	}

	const request = {
		chaincodeId: 'umwerkchaincode',
		fcn: 'getName',
		args: ['']
	};

	var query_responses = await channel.queryByChaincode(request);

	console.log("Query has completed, checking results");

	if (query_responses && query_responses.length == 1) {
		if (query_responses[0] instanceof Error) {
			console.error("error from query =", query_responses[0]);
		} else {
			console.log("Response is", query_responses[0].toString());
		}
	} else {
		console.log("No payloads were returned from query");
	}
})();
