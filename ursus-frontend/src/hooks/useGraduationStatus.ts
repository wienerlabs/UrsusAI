import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { BONDING_CURVE_CONFIG } from '../config/solana';

// Module-level cache instead of polluting window global
const graduationCache = new Map<string, { graduated: boolean; timestamp: number }>();

export interface ProfessionalGraduationMetrics {
 reserveRatio: number;
 graduationVelocity: number;
 estimatedDaysToGraduation: number | null;
 riskLevel: 'low' | 'medium' | 'high';
 performanceScore: number;
 liquidityScore: number;
 priceStability: 'stable' | 'volatile' | 'unknown';
 tokenBalance: number;
 isInitialized: boolean;
}

export interface GraduationStatus {
 isGraduated: boolean;
 currentReserve: number;
 graduationThreshold: number;
 progressPercentage: number;
 remainingToGraduation: number;
 marketCap: number;
 currentPrice: number;
 holders: number;
 loading: boolean;
 error: string | null;
 lastUpdate: Date | null;
 mintAddress: string;
 agentAddress: string;
 creatorAddress: string;
 totalSupply: number;
 circulatingSupply: number;
}

interface ApiResponse {
 data?: {
 currentPrice?: string;
 reserveSol?: string;
 marketCap?: string;
 totalSupply?: string;
 circulatingSupply?: string;
 isGraduated?: boolean;
 creatorAddress?: string;
 mintAddress?: string;
 contractAddress?: string;
 };
 currentPrice?: string;
 reserveSol?: string;
 marketCap?: string;
 totalSupply?: string;
 circulatingSupply?: string;
 isGraduated?: boolean;
 creatorAddress?: string;
 mintAddress?: string;
 contractAddress?: string;
}

const calculateProfessionalMetrics = (status: GraduationStatus): ProfessionalGraduationMetrics => {
 const {
 isGraduated,
 currentReserve,
 graduationThreshold,
 progressPercentage,
 marketCap,
 currentPrice,
 totalSupply,
 circulatingSupply
 } = status;

 const reserveRatio = graduationThreshold > 0? (currentReserve / graduationThreshold): 0;
 const graduationVelocity = progressPercentage > 0? (progressPercentage / 100): 0;

 const estimatedDaysToGraduation = isGraduated? null:
 progressPercentage > 0? Math.ceil((100 - progressPercentage) / Math.max(progressPercentage / 30, 0.1)): null;

 const riskLevel: 'low' | 'medium' | 'high' = isGraduated? 'low':
 progressPercentage > 80? 'low':
 progressPercentage > 50? 'medium': 'high';

 const performanceScore = isGraduated? 100: Math.min(progressPercentage + (marketCap > 100000? 10: 0), 100);
 const liquidityScore = Math.min((currentReserve / 10000) * 100, 100);
 const priceStability: 'stable' | 'volatile' | 'unknown' = currentPrice > 0? 'stable': 'unknown';

 const tokenBalance = totalSupply - circulatingSupply;
 const isInitialized = circulatingSupply > 0;

 return {
 reserveRatio,
 graduationVelocity,
 estimatedDaysToGraduation,
 riskLevel,
 performanceScore,
 liquidityScore,
 priceStability,
 tokenBalance,
 isInitialized
 };
};

export const useGraduationStatus = (agentAddress: string, autoRefresh = false) => {

 const [status, setStatus] = useState<GraduationStatus>({
 isGraduated: false,
 currentReserve: 0,
 graduationThreshold: 30000,
 progressPercentage: 0,
 remainingToGraduation: 30000,
 marketCap: 0,
 currentPrice: 0,
 holders: 0,
 loading: true,
 error: null,
 lastUpdate: null,
 mintAddress: '',
 agentAddress: agentAddress,
 creatorAddress: '',
 totalSupply: 0,
 circulatingSupply: 0
 });

 const fetchGraduationStatus = useCallback(async () => {
 if (!agentAddress) return;

 try {
 console.log(` Fetching graduation status for Solana agent: ${agentAddress}`);

 let creatorAddress = '';
 let totalSupply = 0;
 let mintAddress = '';
 let currentReserve = 0;
 let realCurrentPrice = 0;
 let marketCap = 0;
 let circulatingSupply = 0;
 let backendGraduated = false;
 let holders = 0;

 try {
 const agentResponse = await apiService.get(`/agents/${agentAddress}`) as { data: ApiResponse };
 const agent = agentResponse.data?.data || agentResponse.data;

 realCurrentPrice = parseFloat(agent?.currentPrice || '0');
 marketCap = parseFloat((agent as any)?.bondingCurveInfo?.marketCap || agent?.marketCap || '0');
 circulatingSupply = parseFloat(agent?.circulatingSupply || '0');
 totalSupply = parseFloat(agent?.totalSupply || '1000000000');
 backendGraduated = agent?.isGraduated || false;
 creatorAddress = agent?.creatorAddress || '';
 mintAddress = agent?.mintAddress || agent?.contractAddress || '';
 holders = parseInt((agent as any)?.metrics?.holders || (agent as any)?.holders || '0');

 // Read reserve from bondingCurveInfo.reserve (API format) or reserveSol (legacy)
 const reserveValue = (agent as any)?.bondingCurveInfo?.reserve || agent?.reserveSol;
 if (reserveValue) {
 currentReserve = parseFloat(reserveValue);
 }

 console.log(` Backend data: price=${realCurrentPrice}, marketCap=${marketCap}, holders=${holders}, graduated=${backendGraduated}`);
 } catch (priceError) {
 console.warn('Could not fetch backend data:', priceError);
 // No hardcoded fallbacks — values stay at 0 from initialization above
 }

 const graduationThreshold = BONDING_CURVE_CONFIG.GRADUATION_THRESHOLD;
 const progressPercentage = Math.min((currentReserve / graduationThreshold) * 100, 100);
 const remainingToGraduation = Math.max(graduationThreshold - currentReserve, 0);

 // Final graduation status
 let isGraduatedFinal = backendGraduated || currentReserve >= graduationThreshold;

 const cacheKey = `grad-check:${agentAddress}`;
 const cachedResult = graduationCache.get(cacheKey);
 const now = Date.now();
 const ttlMs = 5 * 60 * 1000;

 if (!cachedResult || (now - cachedResult.timestamp) > ttlMs) {
 graduationCache.set(cacheKey, {
 graduated: isGraduatedFinal,
 timestamp: now
 });
 } else {
 isGraduatedFinal = isGraduatedFinal || cachedResult.graduated;
 }

 const newStatus: GraduationStatus = {
 isGraduated: isGraduatedFinal,
 currentReserve,
 graduationThreshold,
 progressPercentage,
 remainingToGraduation,
 marketCap,
 currentPrice: realCurrentPrice,
 holders,
 loading: false,
 error: null,
 lastUpdate: new Date(),
 mintAddress,
 agentAddress,
 creatorAddress,
 totalSupply,
 circulatingSupply
 };

 console.log(` Professional graduation status [final=${isGraduatedFinal}]:`, newStatus);
 setStatus(newStatus);

 } catch (error: unknown) {
 console.error(' Critical error in graduation status detection:', error);

 let fallbackPrice = 0.000028;
 let fallbackReserve = 0;
 let fallbackMarketCap = 28000;
 let fallbackCreator = '';
 let fallbackMint = '';
 let fallbackHolders = 0;

 try {
 const agentResponse = await apiService.get(`/agents/${agentAddress}`) as { data: ApiResponse };
 const agent = agentResponse.data?.data || agentResponse.data;

 fallbackPrice = parseFloat(agent?.currentPrice || '0') || fallbackPrice;
 fallbackReserve = parseFloat((agent as any)?.bondingCurveInfo?.reserve || agent?.reserveSol || '0') || fallbackReserve;
 fallbackMarketCap = parseFloat((agent as any)?.bondingCurveInfo?.marketCap || agent?.marketCap || '0') || fallbackMarketCap;
 fallbackCreator = agent?.creatorAddress || '';
 fallbackMint = agent?.mintAddress || agent?.contractAddress || '';
 fallbackHolders = parseInt((agent as any)?.metrics?.holders || (agent as any)?.holders || '0');

 console.log(` Using fallback data from backend`);
 } catch (backendError) {
 console.warn(' Could not fetch fallback data, using defaults');
 }

 const threshold = BONDING_CURVE_CONFIG.GRADUATION_THRESHOLD;
 const fallbackStatus: GraduationStatus = {
 isGraduated: fallbackReserve >= threshold,
 currentReserve: fallbackReserve,
 graduationThreshold: threshold,
 progressPercentage: threshold > 0? Math.min((fallbackReserve / threshold) * 100, 100): 0,
 remainingToGraduation: Math.max(threshold - fallbackReserve, 0),
 marketCap: fallbackMarketCap,
 currentPrice: fallbackPrice,
 holders: fallbackHolders,
 loading: false,
 error: `Service unavailable: ${error instanceof Error? error.message: 'Unknown error'}`,
 lastUpdate: new Date(),
 mintAddress: fallbackMint,
 agentAddress,
 creatorAddress: fallbackCreator,
 totalSupply: BONDING_CURVE_CONFIG.TOTAL_SUPPLY,
 circulatingSupply: BONDING_CURVE_CONFIG.BONDING_CURVE_SUPPLY
 };

 setStatus(fallbackStatus);
 }
 }, [agentAddress]);

 useEffect(() => {
 let cancelled = false;
 if (agentAddress) {
 fetchGraduationStatus().catch(() => {
 // Error already handled inside fetchGraduationStatus
 });
 }
 return () => { cancelled = true; };
 }, [fetchGraduationStatus, agentAddress]);

 useEffect(() => {
 if (!autoRefresh ||!agentAddress) return;

 const interval = setInterval(() => {
 fetchGraduationStatus();
 }, 180000);

 return () => clearInterval(interval);
 }, [autoRefresh, fetchGraduationStatus, agentAddress]);

 const professionalMetrics = calculateProfessionalMetrics(status);

 return {
...status,
 refetch: fetchGraduationStatus,
 professionalMetrics
 };
};