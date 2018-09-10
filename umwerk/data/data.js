
var Fabric_Client = require('fabric-client');
var path = require('path');
var util = require('util');
var os = require('os');

async function invoke(fcn, args, fabric_client, channel, event_hub) {
	var tx_id = fabric_client.newTransactionID();
	console.log("Assigning transaction_id: ", tx_id._transaction_id);

	var request = {
		chaincodeId: 'umwerkchaincode',
		fcn: fcn,
		args: args,
		chainId: 'mychannel',
		txId: tx_id
	};

	var results = await channel.sendTransactionProposal(request);

	var proposalResponses = results[0];
	var proposal = results[1];
	
	if (!proposalResponses || !proposalResponses[0].response || proposalResponses[0].response.status != 200) {
		console.error('Transaction proposal was bad');
		throw new Error('Transaction proposal was bad')
	}

	console.log(util.format(
		'Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s"',
		proposalResponses[0].response.status, proposalResponses[0].response.message));

	var request = {
		proposalResponses: proposalResponses,
		proposal: proposal
	};

	var transaction_id_string = tx_id.getTransactionID();

	await channel.sendTransaction(request);

	return new Promise((resolve, reject) => {
		let timeoutHandle = setTimeout(() => {
			event_hub.unregisterTxEvent(transaction_id_string);
			reject(new Error('Transaction timeout'));
		}, 10000);
		
		event_hub.registerTxEvent(
			transaction_id_string, 
			(tx, code) => {
				event_hub.unregisterTxEvent(transaction_id_string);
				clearTimeout(timeoutHandle);

				if (code !== 'VALID') {
					console.error('The transaction was invalid, code = ' + code);
					reject(new Error('Problem with the transaction, event status ::' + code));
				} else {
					console.log('The transaction has been committed on peer ' + event_hub.getPeerAddr());
					resolve(tx);
				}
			}, 
			(err) => {
				event_hub.unregisterTxEvent(transaction_id_string);
				reject(new Error('There was a problem with the eventhub ::'+err));
			});
	});
}

async function query(fcn, args, channel) {
	const request = {
		chaincodeId: 'umwerkchaincode',
		fcn: fcn,
		args: args
	};

	var query_responses = await channel.queryByChaincode(request);

	console.log("Query has completed, checking results");

	if (query_responses && query_responses.length == 1) {
		if (query_responses[0] instanceof Error) {
			throw new Error("error from query =", query_responses[0]);
		} else {
			// console.log("Response is", query_responses[0].toString());

			return query_responses[0].toString();
		}
	} else {
		throw new Error("No payloads were returned from query");
	}

}

(async () => {

	var fabric_client = new Fabric_Client();

	var channel = fabric_client.newChannel('mychannel');
	var peer = fabric_client.newPeer('grpc://localhost:7051');
	channel.addPeer(peer);
	var order = fabric_client.newOrderer('grpc://localhost:7050')
	channel.addOrderer(order);

	var store_path = path.join(__dirname, '../hfc-key-store');
	console.log('Store path:' + store_path);
	
	var state_store = await Fabric_Client.newDefaultKeyValueStore({ path: store_path }); 

	fabric_client.setStateStore(state_store);
	var crypto_suite = Fabric_Client.newCryptoSuite();
	var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
	crypto_suite.setCryptoKeyStore(crypto_store);
	fabric_client.setCryptoSuite(crypto_suite);

	var user_from_store = await fabric_client.getUserContext('Vojko', true);

	if (!user_from_store || !user_from_store.isEnrolled()) {
		throw new Error('Failed to get user1!');
	}

	let event_hub = channel.newChannelEventHub(peer);
	await event_hub.connect();

	
	try {
		await invoke("registerUser", [], fabric_client, channel, event_hub);

		var userDetails = await query('getUserDetails', [], channel);
		console.log("user details", userDetails);

		var services = await query('getServices', [], channel);
		console.log("services", services);

	} catch (err) {
		console.error(err);
	}

	event_hub.disconnect();

})();
