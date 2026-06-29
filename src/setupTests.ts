import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('@stellar/freighter-api', () => ({
  default: {
    isConnected: vi.fn(),
    getAddress: vi.fn(),
    signTransaction: vi.fn(),
  },
  isConnected: vi.fn(),
  getAddress: vi.fn(),
  signTransaction: vi.fn(),
}));

vi.mock('@creit.tech/stellar-wallets-kit', () => {
  return {
    StellarWalletsKit: {
      init: vi.fn(),
      getAddress: vi.fn().mockResolvedValue({ address: null }),
      authModal: vi.fn(),
      disconnect: vi.fn(),
      signTransaction: vi.fn(),
    },
    Networks: { TESTNET: 'TESTNET', PUBLIC: 'PUBLIC' }
  };
});

vi.mock('@creit.tech/stellar-wallets-kit/modules/freighter', () => ({
  FreighterModule: vi.fn(),
}));

vi.mock('@creit.tech/stellar-wallets-kit/modules/albedo', () => ({
  AlbedoModule: vi.fn(),
}));

vi.mock('@creit.tech/stellar-wallets-kit/modules/xbull', () => ({
  xBullModule: vi.fn(),
}));
