const shim = require('fabric-shim');
const util = require('util');
const crypto = require('crypto');

function getCreatorId(stub) {
  var creator = stub.getCreator().id_bytes.toString('utf8');
  return crypto.createHash('sha256').update(creator).digest('hex');
};

async function getState(name, stub) {
  let state = await stub.getState(name);
  if (!state || state.toString().length <= 0) {
    throw new Error(`${name} state does not exist!`);
  }
  console.log('state result', state.toString());
  return state;
}

class Chaincode {

  async Init(stub) {
    console.info('init');

    await stub.putState('services', Buffer.from(JSON.stringify([
      { name: 'Inception', type: 'video', price: 100, id: 0 },
      { name: 'Bad Company - Bad Company - Bad Company', type: 'music', price: 10, id: 1 },
      { name: 'VSCode', type: 'app', price: 300, id: 2 },
    ])));

    return shim.success();
  }

  async Invoke(stub) {
    let ret = stub.getFunctionAndParameters();
    console.info("function and parameters", ret);

    let method = this[ret.fcn];
    
    if (!method) {
      console.error('no function of name:' + ret.fcn + ' found');
      return shim.error(new Error('Received unknown function ' + ret.fcn + ' invocation'));
    }

    try {
      let payload = await method(stub, ret.params);
      return shim.success(payload);
    } catch (err) {
      console.log(err);
      return shim.error(err);
    }
  }

  async registerUser(stub, args) {
    await stub.putState(getCreatorId(stub), Buffer.from(JSON.stringify({tokens: 1000, purchases: []})));
  }

  async getUserDetails(stub, args) {
    return getState(getCreatorId(stub), stub);
  }

  async getServices(stub, args) {
    return getState('services', stub);
  }
};

shim.start(new Chaincode());
