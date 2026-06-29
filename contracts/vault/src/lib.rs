#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env, Symbol};

#[contracttype]
pub enum DataKey {
    Balance(Address),
}

#[contract]
pub struct VaultContract;

#[contractimpl]
impl VaultContract {
    /// Deposit tokens into the vault
    pub fn deposit(env: Env, token_id: Address, user: Address, amount: i128) {
        user.require_auth();
        assert!(amount > 0, "Amount must be positive");

        // Transfer tokens from user to this contract (Inter-contract communication)
        let client = token::Client::new(&env, &token_id);
        client.transfer(&user, &env.current_contract_address(), &amount);

        // Update vault balance state
        let key = DataKey::Balance(user.clone());
        let mut balance: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        balance += amount;
        env.storage().persistent().set(&key, &balance);

        // Emit an event (Event streaming)
        env.events().publish((Symbol::new(&env, "deposit"), user), amount);
    }

    /// Withdraw tokens from the vault
    pub fn withdraw(env: Env, token_id: Address, user: Address, amount: i128) {
        user.require_auth();
        assert!(amount > 0, "Amount must be positive");

        let key = DataKey::Balance(user.clone());
        let mut balance: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        assert!(balance >= amount, "Insufficient vault balance");

        // Update balance
        balance -= amount;
        env.storage().persistent().set(&key, &balance);

        // Transfer tokens back to user from contract (Inter-contract communication)
        let client = token::Client::new(&env, &token_id);
        client.transfer(&env.current_contract_address(), &user, &amount);

        // Emit an event
        env.events().publish((Symbol::new(&env, "withdraw"), user), amount);
    }

    /// Get user's vault balance
    pub fn get_balance(env: Env, user: Address) -> i128 {
        let key = DataKey::Balance(user);
        env.storage().persistent().get(&key).unwrap_or(0)
    }
}

mod test;
