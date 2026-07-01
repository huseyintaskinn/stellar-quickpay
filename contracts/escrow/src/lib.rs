#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, token, Address, Env, String, Symbol, Vec,
};

// ─── Data Structures ───────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, PartialEq, Debug)]
pub enum InvoiceStatus {
    Pending,   // Created, awaiting payment
    Funded,    // Client has paid, funds locked in escrow
    Released,  // Freelancer released, payment transferred
    Cancelled, // Cancelled, funds returned to client
}

#[contracttype]
#[derive(Clone)]
pub struct Invoice {
    pub id: u64,
    pub freelancer: Address,
    pub client: Address,
    pub token: Address,
    pub amount: i128,
    pub description: String,
    pub status: InvoiceStatus,
    pub created_at: u64,
}

#[contracttype]
pub enum DataKey {
    Invoice(u64),
    InvoiceCount,
    FreelancerInvoices(Address),
}

// ─── Contract ──────────────────────────────────────────────────────────────

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    /// Freelancer creates an invoice for a specific client
    pub fn create_invoice(
        env: Env,
        freelancer: Address,
        client: Address,
        token: Address,
        amount: i128,
        description: String,
    ) -> u64 {
        freelancer.require_auth();
        assert!(amount > 0, "Amount must be positive");

        // Get and increment the global invoice counter
        let id: u64 = env.storage().instance().get(&DataKey::InvoiceCount).unwrap_or(0) + 1;
        env.storage().instance().set(&DataKey::InvoiceCount, &id);

        let invoice = Invoice {
            id,
            freelancer: freelancer.clone(),
            client,
            token,
            amount,
            description,
            status: InvoiceStatus::Pending,
            created_at: env.ledger().timestamp(),
        };

        env.storage().persistent().set(&DataKey::Invoice(id), &invoice);

        // Track invoices per freelancer
        let mut invoices: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::FreelancerInvoices(freelancer.clone()))
            .unwrap_or(Vec::new(&env));
        invoices.push_back(id);
        env.storage()
            .persistent()
            .set(&DataKey::FreelancerInvoices(freelancer.clone()), &invoices);

        // Emit event
        env.events().publish(
            (Symbol::new(&env, "invoice_created"), freelancer),
            (id, amount),
        );

        id
    }

    /// Client pays an invoice — funds are locked in this contract
    pub fn pay_invoice(env: Env, invoice_id: u64, client: Address) {
        client.require_auth();

        let mut invoice: Invoice = env
            .storage()
            .persistent()
            .get(&DataKey::Invoice(invoice_id))
            .expect("Invoice not found");

        assert!(invoice.client == client, "You are not the designated client for this invoice");
        assert!(invoice.status == InvoiceStatus::Pending, "Invoice is not in Pending state");

        // Inter-contract communication: transfer tokens from client to escrow contract
        let token_client = token::Client::new(&env, &invoice.token);
        token_client.transfer(
            &client,
            &env.current_contract_address(),
            &invoice.amount,
        );

        invoice.status = InvoiceStatus::Funded;
        env.storage().persistent().set(&DataKey::Invoice(invoice_id), &invoice);

        // Emit event
        env.events().publish(
            (Symbol::new(&env, "invoice_paid"), client),
            (invoice_id, invoice.amount),
        );
    }

    /// Freelancer releases the payment — funds transferred from escrow to freelancer
    pub fn release_payment(env: Env, invoice_id: u64, freelancer: Address) {
        freelancer.require_auth();

        let mut invoice: Invoice = env
            .storage()
            .persistent()
            .get(&DataKey::Invoice(invoice_id))
            .expect("Invoice not found");

        assert!(invoice.freelancer == freelancer, "You are not the freelancer for this invoice");
        assert!(invoice.status == InvoiceStatus::Funded, "Invoice has not been funded yet");

        // Inter-contract communication: transfer tokens from escrow to freelancer
        let token_client = token::Client::new(&env, &invoice.token);
        token_client.transfer(
            &env.current_contract_address(),
            &freelancer,
            &invoice.amount,
        );

        invoice.status = InvoiceStatus::Released;
        env.storage().persistent().set(&DataKey::Invoice(invoice_id), &invoice);

        // Emit event
        env.events().publish(
            (Symbol::new(&env, "payment_released"), freelancer),
            (invoice_id, invoice.amount),
        );
    }

    /// Cancel invoice — only works if still Pending (not yet funded)
    pub fn cancel_invoice(env: Env, invoice_id: u64, caller: Address) {
        caller.require_auth();

        let mut invoice: Invoice = env
            .storage()
            .persistent()
            .get(&DataKey::Invoice(invoice_id))
            .expect("Invoice not found");

        assert!(
            invoice.freelancer == caller || invoice.client == caller,
            "Only freelancer or client can cancel"
        );
        assert!(invoice.status == InvoiceStatus::Pending, "Can only cancel Pending invoices");

        invoice.status = InvoiceStatus::Cancelled;
        env.storage().persistent().set(&DataKey::Invoice(invoice_id), &invoice);

        env.events().publish(
            (Symbol::new(&env, "invoice_cancelled"), caller),
            invoice_id,
        );
    }

    /// Read-only: Get a single invoice by ID
    pub fn get_invoice(env: Env, invoice_id: u64) -> Invoice {
        env.storage()
            .persistent()
            .get(&DataKey::Invoice(invoice_id))
            .expect("Invoice not found")
    }

    /// Read-only: Get all invoice IDs for a freelancer
    pub fn get_freelancer_invoices(env: Env, freelancer: Address) -> Vec<u64> {
        env.storage()
            .persistent()
            .get(&DataKey::FreelancerInvoices(freelancer))
            .unwrap_or(Vec::new(&env))
    }

    /// Read-only: Get total invoice count
    pub fn get_invoice_count(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::InvoiceCount).unwrap_or(0)
    }
}

mod test;
