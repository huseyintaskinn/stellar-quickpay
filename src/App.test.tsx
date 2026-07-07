import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('StellarPay dApp', () => {
  it('should render the application title correctly', () => {
    render(<App />);
    const title = screen.getByText(/StellarPay - Cross-Border Freelancer Payments/i);
    expect(title).toBeInTheDocument();
  });

  it('should display the Connect Wallet section when no wallet is connected', () => {
    render(<App />);
    const connectHeading = screen.getByRole('heading', { name: /Connect Your Wallet/i });
    expect(connectHeading).toBeInTheDocument();
    
    const connectButtons = screen.getAllByRole('button', { name: /Connect Wallet/i });
    expect(connectButtons.length).toBeGreaterThan(0);
  });

  it('should show the correct network indicator as Testnet', () => {
    render(<App />);
    const networkBadges = screen.getAllByText(/Stellar Testnet/i);
    expect(networkBadges.length).toBeGreaterThan(0);
    expect(networkBadges[0]).toBeInTheDocument();
  });
});
