#![cfg(test)]

use crate::{EscrowContract, EscrowContractClient, InvoiceStatus};
use soroban_sdk::{testutils::Address as _, token, Address, Env, String};

fn create_test_token(env: &Env, admin: &Address) -> (Address, token::Client, token::StellarAssetClient) {
    let contract_id = env.register_stellar_asset_contract(admin.clone());
    let client = token::Client::new(env, &contract_id);
    let admin_client = token::StellarAssetClient::new(env, &contract_id);
    (contract_id, client, admin_client)
}

#[test]
fn test_full_invoice_lifecycle() {
    let env = Env::default();
    env.mock_all_auths();

    // Setup
    let contract_id = env.register_contract(None, EscrowContract);
    let client = EscrowContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let freelancer = Address::generate(&env);
    let payer = Address::generate(&env);

    let (token_id, token_client, token_admin) = create_test_token(&env, &admin);
    token_admin.mint(&payer, &1000);

    // 1. Create invoice
    let invoice_id = client.create_invoice(
        &freelancer,
        &payer,
        &token_id,
        &500,
        &String::from_str(&env, "Website Design - 5 pages"),
    );
    assert_eq!(invoice_id, 1);
    assert_eq!(client.get_invoice_count(), 1);

    let invoice = client.get_invoice(&invoice_id);
    assert_eq!(invoice.status, InvoiceStatus::Pending);
    assert_eq!(invoice.amount, 500);

    // 2. Client pays invoice
    client.pay_invoice(&invoice_id, &payer);
    assert_eq!(token_client.balance(&payer), 500);
    assert_eq!(token_client.balance(&contract_id), 500);

    let invoice = client.get_invoice(&invoice_id);
    assert_eq!(invoice.status, InvoiceStatus::Funded);

    // 3. Freelancer releases payment
    client.release_payment(&invoice_id, &freelancer);
    assert_eq!(token_client.balance(&freelancer), 500);
    assert_eq!(token_client.balance(&contract_id), 0);

    let invoice = client.get_invoice(&invoice_id);
    assert_eq!(invoice.status, InvoiceStatus::Released);
}

#[test]
fn test_cancel_pending_invoice() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EscrowContract);
    let client = EscrowContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let freelancer = Address::generate(&env);
    let payer = Address::generate(&env);
    let (token_id, _, _) = create_test_token(&env, &admin);

    let invoice_id = client.create_invoice(
        &freelancer,
        &payer,
        &token_id,
        &200,
        &String::from_str(&env, "Logo Design"),
    );

    // Cancel before payment
    client.cancel_invoice(&invoice_id, &freelancer);
    let invoice = client.get_invoice(&invoice_id);
    assert_eq!(invoice.status, InvoiceStatus::Cancelled);
}

#[test]
fn test_freelancer_invoices_list() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EscrowContract);
    let client = EscrowContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let freelancer = Address::generate(&env);
    let payer = Address::generate(&env);
    let (token_id, _, _) = create_test_token(&env, &admin);

    // Create 3 invoices for the same freelancer
    client.create_invoice(&freelancer, &payer, &token_id, &100, &String::from_str(&env, "Invoice 1"));
    client.create_invoice(&freelancer, &payer, &token_id, &200, &String::from_str(&env, "Invoice 2"));
    client.create_invoice(&freelancer, &payer, &token_id, &300, &String::from_str(&env, "Invoice 3"));

    let ids = client.get_freelancer_invoices(&freelancer);
    assert_eq!(ids.len(), 3);
    assert_eq!(client.get_invoice_count(), 3);
}
