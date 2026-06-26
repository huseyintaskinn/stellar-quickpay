import { rpc, Operation, TransactionBuilder, Networks, Address, xdr, Account } from '@stellar/stellar-sdk';

const rpcServer = new rpc.Server('https://soroban-testnet.stellar.org');
const contractId = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

async function main() {
  console.log('Testing connection to Soroban RPC...');
  try {
    const dummySource = 'GBMXYR5FRWAWD4CMECCIMCBK2RTPTDQSIILHPQ6ZPK6UXLNX3ZLX2BVG';
    
    const horizonUrl = 'https://horizon-testnet.stellar.org';
    const res = await fetch(`${horizonUrl}/accounts/${dummySource}`);
    
    let sequence = '1';
    if (res.ok) {
      const data = await res.json();
      sequence = data.sequence;
    }
    
    const sourceAccount = new Account(dummySource, sequence);
    
    const tx = new TransactionBuilder(sourceAccount, {
      fee: '100',
      networkPassphrase: Networks.TESTNET
    })
      .addOperation(
        Operation.invokeContractFunction({
          contract: contractId,
          function: 'symbol',
          args: []
        })
      )
      .setTimeout(30)
      .build();

    console.log('Simulating transaction...');
    const result = await rpcServer.simulateTransaction(tx);
    
    console.log('Full Result:', JSON.stringify(result, null, 2));
    
  } catch (err) {
    console.error('Failed to query contract:', err);
  }
}

main();
