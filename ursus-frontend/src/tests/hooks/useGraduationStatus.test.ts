import { renderHook, waitFor } from '@testing-library/react';
import { useGraduationStatus } from '../../hooks/useGraduationStatus';

// Mock the API service
jest.mock('../../services/api', () => ({
  apiService: {
    get: jest.fn(),
  },
}));

import { apiService } from '../../services/api';
const mockGet = apiService.get as jest.MockedFunction<typeof apiService.get>;

describe('useGraduationStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return loading state initially', () => {
    mockGet.mockResolvedValue({ data: { success: true, data: {} } });

    const { result } = renderHook(() =>
      useGraduationStatus('Hf37zaq9y5okWMxU3sW8Djhv3gd6iTy7mrSMfJcYxwQS')
    );

    expect(result.current.loading).toBe(true);
  });

  it('should fetch graduation data from API', async () => {
    mockGet.mockResolvedValue({
      data: {
        success: true,
        data: {
          currentPrice: '0.005',
          marketCap: '100000',
          isGraduated: false,
          reserveSol: '15000',
          totalSupply: '1000000000',
          circulatingSupply: '20000000',
          mintAddress: 'CCxYQHRhg8powaDqWdp1PdcHM2PAJHBUsTaHx1uyDecJ',
          metrics: { holders: 150 },
        },
      },
    });

    const { result } = renderHook(() =>
      useGraduationStatus('Hf37zaq9y5okWMxU3sW8Djhv3gd6iTy7mrSMfJcYxwQS')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isGraduated).toBe(false);
    expect(mockGet).toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useGraduationStatus('Hf37zaq9y5okWMxU3sW8Djhv3gd6iTy7mrSMfJcYxwQS')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });
});
