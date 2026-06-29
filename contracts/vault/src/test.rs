#![cfg(test)]

use crate::{VaultContract, VaultContractClient};
use soroban_sdk::{testutils::Address as _, token, Address, Env};

#[test]
fn test_vault_deposit_and_withdraw() {
    let env = Env::default();
    env.mock_all_auths();

    // Register vault contract
    let contract_id = env.register_contract(None, VaultContract);
    let client = VaultContractClient::new(&env, &contract_id);

    // Create a mock token contract (representing SAC)
    let admin = Address::generate(&env);
    let token_contract_id = env.register_stellar_asset_contract(admin.clone());
    let token_client = token::Client::new(&env, &token_contract_id);
    let token_admin_client = token::StellarAssetClient::new(&env, &token_contract_id);

    // Create user and mint initial tokens
    let user = Address::generate(&env);
    token_admin_client.mint(&user, &1000);
    assert_eq!(token_client.balance(&user), 1000);

    // User deposits 500 XLM into Vault
    client.deposit(&token_contract_id, &user, &500);
    
    // Verify states after deposit
    assert_eq!(client.get_balance(&user), 500);
    assert_eq!(token_client.balance(&user), 500);
    assert_eq!(token_client.balance(&contract_id), 500);

    // User withdraws 200 XLM from Vault
    client.withdraw(&token_contract_id, &user, &200);
    
    // Verify states after withdraw
    assert_eq!(client.get_balance(&user), 300);
    assert_eq!(token_client.balance(&user), 700);
    assert_eq!(token_client.balance(&contract_id), 300);
}
