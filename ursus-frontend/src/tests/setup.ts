import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { TextEncoder, TextDecoder } from 'util';

// Configure testing library
configure({ testIdAttribute: 'data-testid' });

// Polyfills for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

Object.defineProperty(window, 'scrollTo', {
  value: jest.fn(),
  writable: true
});

const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

global.fetch = jest.fn();

global.WebSocket = jest.fn().mockImplementation(() => ({
  close: jest.fn(),
  send: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
}));

Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'test-uuid-123'),
    getRandomValues: jest.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
  },
});

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockResolvedValue(undefined),
    readText: jest.fn().mockResolvedValue(''),
  },
  writable: true,
});

// Mock window.solana (Phantom wallet)
Object.defineProperty(window, 'solana', {
  value: {
    isPhantom: true,
    connect: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn(),
    publicKey: { toBase58: () => 'Hf37zaq9y5okWMxU3sW8Djhv3gd6iTy7mrSMfJcYxwQS' },
  },
  writable: true,
});

// Mock environment variables (Vite-style)
process.env.VITE_API_URL = 'http://localhost:3001';
process.env.VITE_WS_URL = 'ws://localhost:3001';
process.env.VITE_SOLANA_NETWORK = 'devnet';

// Global test utilities
global.testUtils = {
  // Mock agent data
  createMockAgent: (overrides = {}) => ({
    id: 'test-agent-1',
    name: 'Test Agent',
    symbol: 'TEST',
    description: 'A test agent for unit testing',
    currentPrice: 0.001,
    marketCap: 1000000,
    volume24h: 50000,
    priceChange24h: 0.05,
    holders: 150,
    contractAddress: 'Hf37zaq9y5okWMxU3sW8Djhv3gd6iTy7mrSMfJcYxwQS',
    creator: 'CCxYQHRhg8powaDqWdp1PdcHM2PAJHBUsTaHx1uyDecJ',
    createdAt: '2024-01-01T00:00:00.000Z',
    imageUrl: 'https://example.com/test-agent.jpg',
    isVerified: true,
    ...overrides,
  }),

  // Mock user data
  createMockUser: (overrides = {}) => ({
    address: 'Hf37zaq9y5okWMxU3sW8Djhv3gd6iTy7mrSMfJcYxwQS',
    username: 'testuser',
    email: 'test@example.com',
    isVerified: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  }),

  // Mock trade data
  createMockTrade: (overrides = {}) => ({
    id: 'trade-123',
    agentAddress: 'Hf37zaq9y5okWMxU3sW8Djhv3gd6iTy7mrSMfJcYxwQS',
    userAddress: 'CCxYQHRhg8powaDqWdp1PdcHM2PAJHBUsTaHx1uyDecJ',
    type: 'buy',
    amount: '1000',
    price: '0.001',
    total: '1',
    timestamp: Date.now(),
    txHash: '5UfDuX7sVAEPoFnRBXjzKMqFSCFAceDc3y68GjRtZVoT4GzRfJKmnPzMVdj1HYCh',
    status: 'completed',
    ...overrides,
  }),

  // Mock WebSocket message
  createMockWSMessage: (overrides = {}) => ({
    type: 'priceUpdate',
    data: {
      agentAddress: 'Hf37zaq9y5okWMxU3sW8Djhv3gd6iTy7mrSMfJcYxwQS',
      price: '0.001',
      marketCap: '1000000',
      volume24h: '50000',
      timestamp: Date.now(),
    },
    ...overrides,
  }),

  // Wait for async operations
  wait: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),

  // Mock API responses
  mockApiResponse: (data, success = true) => ({
    success,
    data,
    timestamp: new Date().toISOString(),
  }),

  // Mock error response
  mockErrorResponse: (error = 'Test error', code = 400) => ({
    success: false,
    error,
    code,
    timestamp: new Date().toISOString(),
  }),

  // Generate random Solana-like address (base58)
  generateAddress: () => {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let address = '';
    for (let i = 0; i < 44; i++) {
      address += chars[Math.floor(Math.random() * chars.length)];
    }
    return address;
  },

  // Format number for display
  formatNumber: (num, decimals = 2) => {
    if (num >= 1e9) return (num / 1e9).toFixed(decimals) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(decimals) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(decimals) + 'K';
    return num.toFixed(decimals);
  },
};

// Mock React Router
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useParams: () => ({ id: 'test-agent-1' }),
  useLocation: () => ({ pathname: '/test', search: '', hash: '', state: null }),
}));

// Mock Solana Wallet Adapter hooks
jest.mock('@solana/wallet-adapter-react', () => ({
  useWallet: jest.fn(() => ({
    publicKey: { toBase58: () => 'Hf37zaq9y5okWMxU3sW8Djhv3gd6iTy7mrSMfJcYxwQS' },
    connected: true,
    connecting: false,
    disconnect: jest.fn(),
    select: jest.fn(),
    wallets: [],
    signTransaction: jest.fn(),
    signAllTransactions: jest.fn(),
  })),
  useConnection: jest.fn(() => ({
    connection: {
      getBalance: jest.fn().mockResolvedValue(1_500_000_000),
      getAccountInfo: jest.fn().mockResolvedValue(null),
      confirmTransaction: jest.fn().mockResolvedValue({ value: { err: null } }),
    },
  })),
}));

// Mock TanStack Query
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: jest.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  })),
  useMutation: jest.fn(() => ({
    mutate: jest.fn(),
    isLoading: false,
    error: null,
    data: null,
  })),
  useQueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
    getQueryData: jest.fn(),
  })),
}));

// Mock lightweight-charts
jest.mock('lightweight-charts', () => ({
  createChart: jest.fn(() => ({
    addCandlestickSeries: jest.fn(() => ({
      setData: jest.fn(),
      update: jest.fn(),
    })),
    addLineSeries: jest.fn(() => ({
      setData: jest.fn(),
      update: jest.fn(),
    })),
    addHistogramSeries: jest.fn(() => ({
      setData: jest.fn(),
      update: jest.fn(),
    })),
    timeScale: jest.fn(() => ({
      fitContent: jest.fn(),
    })),
    priceScale: jest.fn(() => ({
      applyOptions: jest.fn(),
    })),
    applyOptions: jest.fn(),
    remove: jest.fn(),
  })),
  ColorType: {
    Solid: 'solid',
    VerticalGradient: 'verticalGradient',
  },
}));

// Suppress console warnings during tests
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeEach(() => {
  // Reset mocks
  jest.clearAllMocks();
  
  // Reset localStorage and sessionStorage
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  
  sessionStorageMock.getItem.mockClear();
  sessionStorageMock.setItem.mockClear();
  sessionStorageMock.removeItem.mockClear();
  sessionStorageMock.clear.mockClear();

  // Suppress console warnings unless explicitly needed
  if (!process.env.VERBOSE_TESTS) {
    console.warn = jest.fn();
    console.error = jest.fn();
  }
});

afterEach(() => {
  // Restore console
  if (!process.env.VERBOSE_TESTS) {
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Increase timeout for async operations
jest.setTimeout(10000);
