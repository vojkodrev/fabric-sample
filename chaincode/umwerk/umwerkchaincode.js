const shim = require('fabric-shim');
const util = require('util');

let Chaincode = class {

  async Init(stub) {
    console.info('init');

    await stub.putState('name', Buffer.from('Umwerk'));
    
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

  async getName(stub, args) {
    let name = await stub.getState("name");
    if (!name || name.toString().length <= 0) {
      throw new Error(name + ' does not exist: ');
    }
    console.log("name is", name.toString());
    return name;
  }

  async setName(stub, args) {
    console.log("set name", args);
    await stub.putState('name', args[0]);
  }
};

shim.start(new Chaincode());
