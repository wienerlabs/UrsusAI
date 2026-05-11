import React, { useState } from 'react';
import { dispatchToast } from '../utils/toast';

import { ChevronRight, Home, ArrowLeft, Check, Zap, Brain, Clock, Sparkles, Database, Languages, Upload, Coins, TrendingUp, DollarSign, Wallet, AlertCircle, ExternalLink, Edit3, BarChart3, Search, Share2, Code2, Globe, Gauge } from 'lucide-react';
import StepIndicator from './StepIndicator';
import TemplateCard from './TemplateCard';
import { useWallet } from '../hooks/useWallet';
import { useAgentFactory, AgentCreationParams } from '../hooks/useAgentFactory';
import apiService from '../services/api';

interface AgentCreationProps {
 onBack: () => void;
}

const AgentCreation: React.FC<AgentCreationProps> = ({ onBack }) => {
 // Wallet and contract hooks
 const { isConnected, connectWallet, address } = useWallet();
 const { createAgentToken, creationFee } = useAgentFactory();

 // Form state
 const [currentStep, setCurrentStep] = useState(1);
 const [instructions, setInstructions] = useState('');
 const [charCount, setCharCount] = useState(0);
 const [selectedModel, setSelectedModel] = useState('llama-3.1-8b');
 const [responseTime, setResponseTime] = useState(50);
 const [creativity, setCreativity] = useState(50);
 const [memoryRetention, setMemoryRetention] = useState(true);
 const [multiLanguage, setMultiLanguage] = useState(false);
 const [tokenName, setTokenName] = useState('');
 const [tokenSymbol, setTokenSymbol] = useState('');
 const [tokenDescription, setTokenDescription] = useState('');
 const [tokenCategory, setTokenCategory] = useState('');
 const [initialSupply, setInitialSupply] = useState(100000000);
 const [tokenLogo, setTokenLogo] = useState<File | null>(null);
 const [isDeploying, setIsDeploying] = useState(false);
 const [imageUrl, setImageUrl] = useState<string>('');
 const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api') as string;
 const backendRoot = apiBase.replace(/\/api$/, '');

 const [deployProgress, setDeployProgress] = useState(0);
 const [isDeploySuccess, setIsDeploySuccess] = useState(false);
 const [deployTxSignature, setDeployTxSignature] = useState('');

 const steps = [
 'Instructions',
 'Model & Settings',
 'Token Configuration',
 'Deploy & Launch'
 ];

 const templates = [
 {
 title: 'DeFi Analyzer',
 icon: TrendingUp,
 description: 'You are a DeFi research assistant that analyzes yield farming opportunities across Solana protocols. Monitor liquidity pools, calculate APY rates, and provide risk assessments for various DeFi strategies.'
 },
 {
 title: 'Content Creator',
 icon: Edit3,
 description: 'You are a creative content generator that produces engaging social media posts, blog articles, and marketing copy. Focus on viral content patterns, SEO optimization, and audience engagement strategies.'
 },
 {
 title: 'Trading Bot',
 icon: BarChart3,
 description: 'You are a cryptocurrency trading analyst that provides real-time market analysis and trading signals. Use technical indicators, sentiment analysis, and on-chain data to generate actionable trading insights.'
 },
 {
 title: 'Research Assistant',
 icon: Search,
 description: 'You are a comprehensive research assistant that analyzes market trends, compiles reports, and provides data-driven insights. Synthesize information from multiple sources and present clear, actionable findings.'
 },
 {
 title: 'Social Media Manager',
 icon: Share2,
 description: 'You are a social media management expert that creates content calendars, analyzes engagement metrics, and optimizes posting strategies across multiple platforms to maximize reach and engagement.'
 },
 {
 title: 'Code Reviewer',
 icon: Code2,
 description: 'You are a smart contract auditor and code reviewer that identifies vulnerabilities, suggests optimizations, and ensures best practices in blockchain development. Focus on security and gas efficiency.'
 }
 ];

 const models = [
 {
 id: 'llama-3.1-8b',
 name: 'Llama 3.1 8B',
 icon: Zap,
 capabilities: 'Fast, general tasks',
 pricing: 'free',
 performance: 'fast',
 description: 'Meta Llama 3.1 8B via Novita'
 },
 {
 id: 'llama-3.3-70b',
 name: 'Llama 3.3 70B',
 icon: Sparkles,
 capabilities: 'Advanced reasoning, high quality',
 pricing: 'free',
 performance: 'great',
 description: 'Meta Llama 3.3 70B via Together AI'
 },
 {
 id: 'deepseek-v3',
 name: 'DeepSeek V3',
 icon: Brain,
 capabilities: 'Strong reasoning, coding',
 pricing: 'free',
 performance: 'great',
 description: 'DeepSeek V3 via Together AI'
 },
 {
 id: 'qwen-2.5-7b',
 name: 'Qwen 2.5 7B',
 icon: Globe,
 capabilities: 'Multilingual, fast',
 pricing: 'free',
 performance: 'fast',
 description: 'Alibaba Qwen 2.5 7B via Together AI'
 },
 {
 id: 'novita-qwen-7b',
 name: 'Qwen 2.5 7B (Novita)',
 icon: Languages,
 capabilities: 'Multilingual, alternative provider',
 pricing: 'free',
 performance: 'fast',
 description: 'Alibaba Qwen 2.5 7B via Novita'
 },
 {
 id: 'sambanova-llama-8b',
 name: 'Llama 3.1 8B (SambaNova)',
 icon: Gauge,
 capabilities: 'Ultra-fast inference',
 pricing: 'free',
 performance: 'fastest',
 description: 'Meta Llama 3.1 8B via SambaNova'
 }
 ];

 const handleInstructionsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
 const value = e.target.value;
 if (value.length <= 2000) {
 setInstructions(value);
 setCharCount(value.length);
 }
 };

 const handleTemplateSelect = (templateDescription: string) => {
 setInstructions(templateDescription);
 setCharCount(templateDescription.length);
 };

 const handleNext = () => {
 if (currentStep < steps.length) {
 setCurrentStep(currentStep + 1);
 }
 };

 const handleTokenLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0] || null;
 if (!file) return;

 // Basic validation
 if (!file.type.startsWith('image/')) {
 alert('Please select an image file');
 return;
 }
 if (file.size > 5 * 1024 * 1024) {
 alert('Image size must be less than 5MB');
 return;
 }

 try {
 // Upload to backend and store normalized URL
 const result = await apiService.uploadImage(file);
 const normalizedUrl = result.imageUrl?.startsWith('http')
? result.imageUrl
: `${backendRoot}${result.imageUrl}`;
 setImageUrl(normalizedUrl);
 setTokenLogo(file);
 } catch (err) {
 console.error('Image upload failed:', err);
 alert('Failed to upload image');
 }
 };

 const handlePrevious = () => {
 if (currentStep > 1) {
 setCurrentStep(currentStep - 1);
 }
 };

 const handleDeploy = async () => {
 // Check wallet connection
 if (!isConnected ||!address) {
 try {
 console.log(' Wallet not connected, attempting to connect...');
 await connectWallet();
 // Wait a bit for connection to establish
 await new Promise(resolve => setTimeout(resolve, 1000));

 // Check again after connection attempt
 if (!isConnected ||!address) {
 throw new Error('Wallet connection failed');
 }
 console.log(' Wallet connected successfully:', address);
 } catch (error) {
 console.error(' Wallet connection error:', error);
 const errorMessage = `Wallet connection failed. Please:

1. Make sure MetaMask is installed and unlocked
2. Click the MetaMask extension icon
3. Connect this site to your wallet
4. Refresh the page and try again

Error: ${error instanceof Error? error.message: 'Unknown error'}`;
 alert(errorMessage);
 return;
 }
 }

 // Network check removed - Solana wallet adapter handles network automatically

 // Validate form data
 if (!tokenName ||!tokenSymbol ||!instructions ||!selectedModel ||!tokenDescription ||!tokenCategory) {
 alert('Please fill in all required fields');
 return;
 }

 // Validate token description length
 if (tokenDescription.length < 10) {
 alert('Token description must be at least 10 characters long');
 return;
 }

 if (tokenDescription.length > 1000) {
 alert('Token description must be less than 1000 characters');
 return;
 }

 setIsDeploying(true);
 setDeployProgress(0);

 try {
 // Prepare agent creation parameters
 const agentParams: AgentCreationParams = {
 name: tokenName,
 symbol: tokenSymbol,
 description: tokenDescription || `AI Agent: ${tokenName}`,
 instructions: instructions,
 model: selectedModel,
 category: tokenCategory || 'General',
 avatar: '',
 imageUrl: imageUrl || undefined,
 };

 setDeployProgress(25);

 // Create agent token on blockchain
 try {
 await createAgentToken(agentParams, async (agentAddress, txSignature) => {
 console.log('Agent created:', agentAddress, 'TX:', txSignature);
 setDeployProgress(75);

 let finalAgentAddress = agentAddress;
 const finalTxSignature = txSignature || agentAddress;

 // Legacy check for old EVM format — skip for Solana
 const isTxHash = false;
 if (isTxHash) {
 try {
 console.log('Getting agent address from transaction hash...');
 const { data: addrResp } = await apiService.getAgentAddressFromTransaction(agentAddressOrTxHash);
 if (addrResp?.agentAddress) {
 finalAgentAddress = addrResp.agentAddress;
 console.log(' Got agent address:', finalAgentAddress);
 } else {
 try {
 const evt = new CustomEvent('ursus:toast', {
 detail: { type: 'warning', title: 'Awaiting index', message: 'Waiting for agent address indexing...' }
 });
 window.dispatchEvent(evt);
 } catch {}
 console.error(' Failed to get agent address from backend response');
 }
 } catch (error) {
 console.error(' Error getting agent address:', error);
 if (error instanceof Error && error.message === 'TOKEN_NOT_FOUND') {
 dispatchToast({ type: 'error', title: 'Token not found', message: 'Backend has not indexed the agent yet.' });
 } else {
 dispatchToast({ type: 'warning', title: 'Awaiting index', message: 'Waiting for agent address indexing...' });
 }
 // Continue with transaction hash as fallback
 }
 }

 setTimeout(() => {
 setDeployProgress(100);
 setIsDeploySuccess(true);
 setDeployTxSignature(finalTxSignature);
 localStorage.setItem('ursus_agent_created', 'true');

 // Auto-redirect to agent page after 20 seconds
 setTimeout(() => {
 if (finalAgentAddress && finalAgentAddress.length >= 32 && finalAgentAddress.length <= 44) {
 window.location.href = `/agent/${finalAgentAddress}`;
 } else {
 onBack();
 }
 }, 20000);
 }, 1000);
 }, (step, progress) => {
 setDeployProgress(progress);
 });
 console.log('Agent deployed successfully');
 } catch (txError) {
 console.error('Transaction error:', txError);
 throw new Error(`Transaction failed: ${txError instanceof Error? txError.message: 'Unknown error'}`);
 }
 } catch (error) {
 console.error('Deployment failed:', error);
 alert(`Deployment failed: ${error instanceof Error? error.message: 'Unknown error'}`);
 } finally {
 setIsDeploying(false);
 }
 };

 return (
 <div className="min-h-screen bg-surface ml-[200px]">
 <div className="p-8">
 {/* Header Section */}
 <div className="mb-8">
 {/* Back Button */}
 <button
 onClick={onBack}
 className="flex items-center gap-2 text-content-muted hover:text-content-primary mb-6 transition-colors duration-base"
 >
 <ArrowLeft size={16} />
 <span className="text-body-sm">Back to Home</span>
 </button>

 {/* Breadcrumb */}
 <div className="flex items-center gap-2 text-caption text-content-muted mb-4">
 <Home size={14} />
 <span>Home</span>
 <ChevronRight size={14} />
 <span className="text-accent">Agent Creation</span>
 </div>

 {/* Title */}
 <h1 className="text-content-primary text-display-xs font-semibold mb-3">
 Create Your AI Agent
 </h1>
 <p className="text-content-secondary text-body-lg">
 Deploy an AI agent with its own token in minutes
 </p>
 </div>

 {/* Step Indicator */}
 <StepIndicator currentStep={currentStep} steps={steps} />

 {/* Step 1: Instructions Panel */}
 {currentStep === 1 && (
 <div className="max-w-4xl mx-auto">
 <div className="bg-surface-card border border-border rounded-xl p-10 shadow-card">
 {/* Section Title */}
 <div className="text-center mb-8">
 <h2 className="text-content-primary text-heading-lg font-semibold mb-3">
 Describe Your AI Agent
 </h2>
 <p className="text-content-muted text-body">
 Tell your agent what to do and how to behave
 </p>
 </div>

 {/* Main Text Area */}
 <div className="mb-8">
 <label className="block text-caption text-content-muted uppercase mb-2">Instructions</label>
 <div className="relative">
 <textarea
 value={instructions}
 onChange={handleInstructionsChange}
 placeholder="Tell your agent what to do. Example: 'You are a DeFi research assistant that analyzes yield farming opportunities across Solana protocols...'"
 className="w-full h-48 bg-surface-elevated border border-border focus:border-border-focus text-content-primary placeholder:text-content-subtle rounded-md p-6 resize-none focus:outline-none transition-colors duration-base text-body leading-relaxed"
 />

 {/* Character Counter */}
 <div className="absolute bottom-4 right-4 text-caption text-content-subtle">
 {charCount}/2000
 </div>
 </div>
 </div>

 {/* Template Gallery */}
 <div className="mb-8">
 <h3 className="text-content-primary text-heading-sm font-semibold mb-6 text-center">
 Quick Start Templates
 </h3>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {templates.map((template, index) => (
 <TemplateCard
 key={index}
 title={template.title}
 description={template.description}
 icon={template.icon}
 onSelect={handleTemplateSelect}
 />
 ))}
 </div>
 </div>

 {/* Navigation */}
 <div className="flex justify-end pt-6 border-t border-border">
 <button
 onClick={handleNext}
 disabled={!instructions.trim()}
 className="bg-accent hover:bg-accent-hover text-content-inverse px-8 py-3 rounded-md font-semibold text-body-sm transition-colors duration-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
 >
 Next: Model Selection
 <ChevronRight size={18} />
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Step 2: Model & Settings Panel */}
 {currentStep === 2 && (
 <div className="max-w-5xl mx-auto">
 <div className="bg-surface-card border border-border rounded-xl p-10 shadow-card">
 {/* Section Title */}
 <div className="text-center mb-10">
 <h2 className="text-content-primary text-heading-lg font-semibold mb-3">
 Choose AI Model & Configure Settings
 </h2>
 <p className="text-content-muted text-body">
 Select the AI engine and customize your agent's behavior
 </p>
 </div>

 {/* AI Model Selection */}
 <div className="mb-12">
 <h3 className="text-content-primary text-heading-sm font-semibold mb-6 flex items-center gap-3">
 <div className="p-2 bg-accent-subtle border border-accent-muted rounded-md">
 <Brain size={20} className="text-accent" />
 </div>
 AI Model Selection
 </h3>

 <div className="grid grid-cols-2 gap-6">
 {models.map((model) => (
 <button
 key={model.id}
 onClick={() => setSelectedModel(model.id)}
 className={`relative p-6 border rounded-lg text-left transition-colors duration-base ${
 selectedModel === model.id
? 'border-accent bg-accent-subtle'
: 'bg-surface-card border-border hover:bg-surface-hover'
 }`}
 >
 {/* Selection Indicator */}
 <div className={`absolute top-4 right-4 w-6 h-6 rounded-full border flex items-center justify-center transition-colors duration-base ${
 selectedModel === model.id
? 'border-accent bg-accent'
: 'border-border-strong'
 }`}>
 {selectedModel === model.id && (
 <Check size={14} className="text-content-inverse" />
 )}
 </div>

 {/* Model Info */}
 <div className="flex items-start gap-4 mb-4">
 <div className={`w-12 h-12 rounded-md flex items-center justify-center border transition-colors duration-base ${
 selectedModel === model.id
 ? 'bg-accent-subtle border-accent-muted'
 : 'bg-surface-elevated border-border'
 }`}>
 <model.icon size={22} strokeWidth={1.75} className={selectedModel === model.id ? 'text-accent' : 'text-content-secondary'} />
 </div>
 <div className="flex-1">
 <h4 className={`text-heading-sm font-semibold mb-1 ${
 selectedModel === model.id? 'text-accent': 'text-content-primary'
 }`}>
 {model.name}
 </h4>
 <p className="text-content-muted text-body-sm">
 {model.description}
 </p>
 </div>
 </div>

 {/* Capabilities */}
 <div className="mb-4">
 <div className="text-content-secondary text-body-sm mb-2">
 <strong className="text-content-primary">Capabilities:</strong> {model.capabilities}
 </div>
 <div className="flex justify-between text-caption">
 <span className="text-success">{model.pricing}</span>
 <span className="text-content-muted">Performance: <span className="text-accent">{model.performance}</span></span>
 </div>
 </div>
 </button>
 ))}
 </div>
 </div>

 {/* Agent Settings */}
 <div className="mb-8">
 <h3 className="text-content-primary text-heading-sm font-semibold mb-6 flex items-center gap-3">
 <div className="p-2 bg-accent-subtle border border-accent-muted rounded-md">
 <Zap size={20} className="text-accent" />
 </div>
 Agent Settings
 </h3>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 {/* Response Time Slider */}
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Clock size={18} className="text-accent" />
 <span className="text-content-primary text-body-sm font-medium">Response Time</span>
 </div>
 <span className="text-content-muted text-caption">
 {responseTime < 30? 'Fast': responseTime < 70? 'Balanced': 'Thoughtful'}
 </span>
 </div>
 <div className="relative">
 <input
 type="range"
 min="0"
 max="100"
 value={responseTime}
 onChange={(e) => setResponseTime(Number(e.target.value))}
 className="w-full h-2 rounded-md appearance-none cursor-pointer slider"
 style={{
 background: `linear-gradient(to right, rgb(var(--accent) / 1) 0%, rgb(var(--accent) / 1) ${responseTime}%, rgb(var(--surface-elevated) / 1) ${responseTime}%, rgb(var(--surface-elevated) / 1) 100%)`
 }}
 />
 </div>
 </div>

 {/* Creativity Level Slider */}
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Sparkles size={18} className="text-accent" />
 <span className="text-content-primary text-body-sm font-medium">Creativity Level</span>
 </div>
 <span className="text-content-muted text-caption">
 {creativity < 30? 'Precise': creativity < 70? 'Balanced': 'Creative'}
 </span>
 </div>
 <div className="relative">
 <input
 type="range"
 min="0"
 max="100"
 value={creativity}
 onChange={(e) => setCreativity(Number(e.target.value))}
 className="w-full h-2 rounded-md appearance-none cursor-pointer slider"
 style={{
 background: `linear-gradient(to right, rgb(var(--accent) / 1) 0%, rgb(var(--accent) / 1) ${creativity}%, rgb(var(--surface-elevated) / 1) ${creativity}%, rgb(var(--surface-elevated) / 1) 100%)`
 }}
 />
 </div>
 </div>

 {/* Memory Retention Toggle */}
 <div className="flex items-center justify-between p-4 bg-surface-elevated border border-border rounded-md">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-accent-subtle border border-accent-muted rounded-md">
 <Database size={16} className="text-accent" />
 </div>
 <div>
 <span className="text-content-primary text-body-sm font-medium">Memory Retention</span>
 <p className="text-content-muted text-caption">Remember conversation context</p>
 </div>
 </div>
 <button
 onClick={() => setMemoryRetention(!memoryRetention)}
 className={`relative w-12 h-6 rounded-full transition-colors duration-base ${
 memoryRetention? 'bg-accent': 'bg-surface-hover border border-border'
 }`}
 >
 <div className={`absolute top-1 w-4 h-4 bg-content-inverse rounded-full transition-transform duration-base ${
 memoryRetention? 'translate-x-7': 'translate-x-1'
 }`} />
 </button>
 </div>

 {/* Multi-language Support Toggle */}
 <div className="flex items-center justify-between p-4 bg-surface-elevated border border-border rounded-md">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-accent-subtle border border-accent-muted rounded-md">
 <Languages size={16} className="text-accent" />
 </div>
 <div>
 <span className="text-content-primary text-body-sm font-medium">Multi-language Support</span>
 <p className="text-content-muted text-caption">Respond in multiple languages</p>
 </div>
 </div>
 <button
 onClick={() => setMultiLanguage(!multiLanguage)}
 className={`relative w-12 h-6 rounded-full transition-colors duration-base ${
 multiLanguage? 'bg-accent': 'bg-surface-hover border border-border'
 }`}
 >
 <div className={`absolute top-1 w-4 h-4 bg-content-inverse rounded-full transition-transform duration-base ${
 multiLanguage? 'translate-x-7': 'translate-x-1'
 }`} />
 </button>
 </div>
 </div>
 </div>

 {/* Navigation */}
 <div className="flex justify-between pt-6 border-t border-border">
 <button
 onClick={handlePrevious}
 className="bg-surface-elevated border border-border text-content-secondary hover:bg-surface-hover px-6 py-3 rounded-md font-semibold text-body-sm transition-colors duration-base flex items-center gap-2"
 >
 <ArrowLeft size={18} />
 Previous
 </button>
 <button
 onClick={handleNext}
 disabled={!selectedModel}
 className="bg-accent hover:bg-accent-hover text-content-inverse px-6 py-3 rounded-md font-semibold text-body-sm transition-colors duration-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
 >
 Next: Token Configuration
 <ChevronRight size={18} />
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Step 3: Token Configuration Panel */}
 {currentStep === 3 && (
 <div className="max-w-6xl mx-auto">
 <div className="bg-surface-card border border-border rounded-xl p-10 shadow-card">
 {/* Section Title */}
 <div className="text-center mb-10">
 <h2 className="text-content-primary text-heading-lg font-semibold mb-3">
 Configure Your Token
 </h2>
 <p className="text-content-muted text-body">
 Set up your agent's token economics and branding
 </p>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
 {/* Left Column - Token Details */}
 <div className="space-y-6">
 <h3 className="text-content-primary text-heading-sm font-semibold mb-6 flex items-center gap-3">
 <div className="p-2 bg-accent-subtle border border-accent-muted rounded-md">
 <Coins size={20} className="text-accent" />
 </div>
 Token Details
 </h3>

 {/* Token Name Input */}
 <div className="space-y-2">
 <label className="block text-caption text-content-muted uppercase mb-2">Token Name</label>
 <input
 type="text"
 value={tokenName}
 onChange={(e) => setTokenName(e.target.value)}
 placeholder="Enter token name (e.g., DeFi Analyzer Token)"
 className="w-full bg-surface-elevated border border-border focus:border-border-focus text-content-primary placeholder:text-content-subtle rounded-md p-4 focus:outline-none transition-colors duration-base"
 />
 </div>

 {/* Token Symbol Input */}
 <div className="space-y-2">
 <label className="block text-caption text-content-muted uppercase mb-2">Token Symbol</label>
 <div className="relative">
 <input
 type="text"
 value={tokenSymbol}
 onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
 placeholder="DAT"
 maxLength={5}
 className="w-full bg-surface-elevated border border-border focus:border-border-focus text-content-primary placeholder:text-content-subtle rounded-md p-4 focus:outline-none transition-colors duration-base uppercase"
 />
 <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-content-subtle text-caption">
 Auto-generated
 </div>
 </div>
 </div>

 {/* Token Description */}
 <div className="space-y-2">
 <label className="block text-caption text-content-muted uppercase mb-2">Token Description</label>
 <div className="relative">
 <textarea
 value={tokenDescription}
 onChange={(e) => setTokenDescription(e.target.value)}
 placeholder="Describe your AI agent and its capabilities..."
 rows={3}
 maxLength={1000}
 className={`w-full bg-surface-elevated border text-content-primary placeholder:text-content-subtle rounded-md p-4 focus:outline-none transition-colors duration-base resize-none ${
 tokenDescription.length < 10
? 'border-danger-muted focus:border-danger'
: tokenDescription.length > 950
? 'border-warning-muted focus:border-warning'
: 'border-border focus:border-border-focus'
 }`}
 />

 {/* Character Counter */}
 <div className="absolute bottom-2 right-3 text-caption">
 <span className={`${
 tokenDescription.length < 10
? 'text-danger'
: tokenDescription.length > 950
? 'text-warning'
: 'text-content-subtle'
 }`}>
 {tokenDescription.length}/1000
 </span>
 </div>
 </div>

 {/* Validation Messages */}
 {tokenDescription.length > 0 && tokenDescription.length < 10 && (
 <p className="text-danger text-caption flex items-center gap-1">
 Minimum 10 characters required ({10 - tokenDescription.length} more needed)
 </p>
 )}
 {tokenDescription.length > 950 && (
 <p className="text-warning text-caption flex items-center gap-1">
 Approaching character limit ({1000 - tokenDescription.length} characters remaining)
 </p>
 )}
 </div>

 {/* Token Category */}
 <div className="space-y-2">
 <label className="block text-caption text-content-muted uppercase mb-2">Category</label>
 <select
 value={tokenCategory}
 onChange={(e) => setTokenCategory(e.target.value)}
 className="w-full bg-surface-elevated border border-border focus:border-border-focus text-content-primary rounded-md p-4 focus:outline-none transition-colors duration-base"
 >
 <option value="">Select a category</option>
 <option value="DeFi">DeFi</option>
 <option value="Trading">Trading</option>
 <option value="Analytics">Analytics</option>
 <option value="Gaming">Gaming</option>
 <option value="Social">Social</option>
 <option value="Utility">Utility</option>
 <option value="Entertainment">Entertainment</option>
 <option value="Education">Education</option>
 <option value="General">General</option>
 </select>
 </div>

 {/* Initial Supply Slider */}
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <label className="text-caption text-content-muted uppercase">Initial Supply</label>
 <span className="text-content-secondary text-caption">
 {initialSupply.toLocaleString()} tokens
 </span>
 </div>
 <div className="relative">
 <input
 type="range"
 min="1000000"
 max="1000000000"
 step="1000000"
 value={initialSupply}
 onChange={(e) => setInitialSupply(Number(e.target.value))}
 className="w-full h-2 rounded-md appearance-none cursor-pointer slider"
 style={{
 background: `linear-gradient(to right, rgb(var(--accent) / 1) 0%, rgb(var(--accent) / 1) ${((initialSupply - 1000000) / (1000000000 - 1000000)) * 100}%, rgb(var(--surface-elevated) / 1) ${((initialSupply - 1000000) / (1000000000 - 1000000)) * 100}%, rgb(var(--surface-elevated) / 1) 100%)`
 }}
 />
 </div>
 <div className="flex justify-between text-micro text-content-subtle">
 <span>1M</span>
 <span>100M</span>
 <span>1B</span>
 </div>
 </div>

 {/* Token Logo Upload */}
 <div className="space-y-2">
 <label className="block text-caption text-content-muted uppercase mb-2">Token Logo</label>
 <div className="border border-dashed border-border rounded-md p-8 text-center hover:border-border-focus transition-colors duration-base cursor-pointer bg-surface-elevated">
 <input
 type="file"
 accept="image/*"
 onChange={handleTokenLogoChange}
 className="hidden"
 id="token-logo-upload"
 />
 <label htmlFor="token-logo-upload" className="cursor-pointer">
 <Upload size={32} className="text-content-muted mx-auto mb-3" />
 <p className="text-content-secondary text-body-sm mb-2">
 {tokenLogo? tokenLogo.name: 'Click to upload logo'}
 </p>
 <p className="text-content-subtle text-caption">PNG, JPG up to 2MB</p>
 </label>
 </div>
 </div>
 </div>

 {/* Right Column - Economics */}
 <div className="space-y-6">
 <h3 className="text-content-primary text-heading-sm font-semibold mb-6 flex items-center gap-3">
 <div className="p-2 bg-accent-subtle border border-accent-muted rounded-md">
 <TrendingUp size={20} className="text-accent" />
 </div>
 Token Economics
 </h3>

 {/* Bonding Curve Visualization */}
 <div className="bg-surface-elevated border border-border rounded-lg p-6">
 <h4 className="text-caption uppercase text-content-muted mb-4">Bonding Curve</h4>
 <div className="h-32 bg-surface rounded-md border border-border-subtle relative overflow-hidden">
 <div className="absolute bottom-0 left-0 w-full h-1 bg-accent"></div>
 </div>
 <p className="text-content-muted text-body-sm mt-2">
 Price increases with each token purchase
 </p>
 </div>

 {/* Initial Price Calculation */}
 <div className="bg-surface-elevated border border-border rounded-lg p-6">
 <h4 className="text-caption uppercase text-content-muted mb-2">Initial Price</h4>
 <div className="text-heading-md font-semibold text-content-primary mb-2">
 ~0.000028 SOL
 </div>
 <p className="text-content-muted text-body-sm">
 Starting price per token
 </p>
 </div>

 {/* Market Cap Estimation */}
 <div className="bg-surface-elevated border border-border rounded-lg p-6">
 <h4 className="text-caption uppercase text-content-muted mb-2">Market Cap</h4>
 <div className="text-heading-md font-semibold text-content-primary mb-2">
 ${(initialSupply * 0.001).toLocaleString()}
 </div>
 <p className="text-content-muted text-body-sm">
 Estimated initial market cap
 </p>
 </div>

 {/* Trading Fee Structure */}
 <div className="bg-surface-elevated border border-border rounded-lg p-6">
 <h4 className="text-caption uppercase text-content-muted mb-4">Trading Fee Structure</h4>
 <div className="space-y-2">
 <div className="flex justify-between text-body-sm">
 <span className="text-content-muted">Platform Fee</span>
 <span className="text-content-primary font-medium">2.5%</span>
 </div>
 <div className="flex justify-between text-body-sm">
 <span className="text-content-muted">Creator Royalty</span>
 <span className="text-content-primary font-medium">5%</span>
 </div>
 <div className="flex justify-between text-body-sm">
 <span className="text-content-muted">Liquidity Pool</span>
 <span className="text-content-primary font-medium">92.5%</span>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Navigation */}
 <div className="flex justify-between pt-6 border-t border-border mt-8">
 <button
 onClick={handlePrevious}
 className="bg-surface-elevated border border-border text-content-secondary hover:bg-surface-hover px-6 py-3 rounded-md font-semibold text-body-sm transition-colors duration-base flex items-center gap-2"
 >
 <ArrowLeft size={18} />
 Previous
 </button>
 <button
 onClick={handleNext}
 disabled={!tokenName.trim() ||!tokenSymbol.trim() ||!tokenDescription.trim() ||!tokenCategory}
 className="bg-accent hover:bg-accent-hover text-content-inverse px-6 py-3 rounded-md font-semibold text-body-sm transition-colors duration-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
 >
 Next: Deploy & Launch
 <ChevronRight size={18} />
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Step 4: Deploy & Launch Panel */}
 {currentStep === 4 && (
 <div className="max-w-4xl mx-auto">
 <div className="bg-surface-card border border-border rounded-xl p-10 shadow-card">
 {/* Section Title */}
 <div className="text-center mb-10">
 <h2 className="text-content-primary text-heading-lg font-semibold mb-3">
 Deploy & Launch
 </h2>
 <p className="text-content-muted text-body">
 Review costs and deploy your AI agent with token
 </p>
 </div>

 {/* Cost Breakdown */}
 <div className="mb-8">
 <h3 className="text-content-primary text-heading-sm font-semibold mb-6 flex items-center gap-3">
 <div className="p-2 bg-accent-subtle border border-accent-muted rounded-md">
 <DollarSign size={20} className="text-accent" />
 </div>
 Cost Breakdown
 </h3>

 <div className="bg-surface-elevated border border-border rounded-lg p-6 space-y-4">
 <div className="flex justify-between items-center">
 <span className="text-content-muted text-body-sm">Agent Deployment</span>
 <span className="text-success text-body-sm font-semibold">Free</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-content-muted text-body-sm">Platform Fee</span>
 <span className="text-content-primary text-body-sm font-semibold">{creationFee} SOL</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-content-muted text-body-sm">Transaction Fee</span>
 <span className="text-content-primary text-body-sm font-semibold">~0.00001 SOL</span>
 </div>
 <div className="border-t border-border-subtle pt-4">
 <div className="flex justify-between items-center">
 <span className="text-content-primary text-heading-sm font-semibold">Total Cost</span>
 <span className="text-accent text-heading-sm font-semibold">{creationFee} SOL</span>
 </div>
 </div>
 </div>
 </div>

 {/* Agent Summary */}
 <div className="mb-8">
 <h3 className="text-content-primary text-heading-sm font-semibold mb-6">Agent Summary</h3>
 <div className="bg-surface-elevated border border-border rounded-lg p-6 space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <span className="text-caption uppercase text-content-muted">Agent Type</span>
 <p className="text-content-primary text-body-sm font-medium mt-1">{instructions.substring(0, 50)}...</p>
 </div>
 <div>
 <span className="text-caption uppercase text-content-muted">AI Model</span>
 <p className="text-content-primary text-body-sm font-medium mt-1">{models.find(m => m.id === selectedModel)?.name || 'Not selected'}</p>
 </div>
 <div>
 <span className="text-caption uppercase text-content-muted">Token Name</span>
 <p className="text-content-primary text-body-sm font-medium mt-1">{tokenName || 'Not set'}</p>
 </div>
 <div>
 <span className="text-caption uppercase text-content-muted">Token Symbol</span>
 <p className="text-content-primary text-body-sm font-medium mt-1">{tokenSymbol || 'Not set'}</p>
 </div>
 </div>
 </div>
 </div>

 {/* Wallet Status */}
 {!isConnected && (
 <div className="bg-warning-subtle border border-warning-muted rounded-md p-4 mb-4">
 <div className="flex items-center gap-2 text-warning">
 <AlertCircle size={16} />
 <span className="text-body-sm">Please connect your wallet to deploy</span>
 </div>
 </div>
 )}

 {/* Network warning removed - Solana wallet adapter handles network */}

 {/* Deploy Button */}
 <div className="space-y-4">
 {!isDeploySuccess? (
 <button
 onClick={handleDeploy}
 disabled={isDeploying}
 className="w-full h-[60px] bg-accent hover:bg-accent-hover text-content-inverse font-semibold text-body rounded-md transition-colors duration-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
 >
 {isDeploying? (
 <>
 <div className="w-6 h-6 border-2 border-content-inverse border-t-transparent rounded-full animate-spin"></div>
 Deploying... {deployProgress}%
 </>
 ):!isConnected? (
 <>
 <Wallet size={20} />
 Connect Wallet to Deploy
 </>
 ): (
 <>
 <Zap size={20} />
 Deploy Agent & Launch Token
 </>
 )}
 </button>
 ): (
 <div className="space-y-4">
 <div className="w-full h-[60px] bg-success-subtle border border-success-muted text-success font-semibold text-body rounded-md flex items-center justify-center gap-3">
 <Check size={20} />
 Deployment Successful!
 </div>

 {deployTxSignature && (
 <div className="bg-surface-elevated border border-border rounded-md p-4 space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-caption uppercase text-content-muted">Transaction</span>
 <a
 href={`https://explorer.solana.com/tx/${deployTxSignature}?cluster=devnet`}
 target="_blank"
 rel="noopener noreferrer"
 className="text-accent hover:text-content-primary text-body-sm flex items-center gap-1 transition-colors duration-base"
 >
 {deployTxSignature.slice(0, 8)}...{deployTxSignature.slice(-8)}
 <ExternalLink size={14} />
 </a>
 </div>
 <div className="text-content-subtle text-caption">
 Redirecting to agent page in 20 seconds...
 </div>
 </div>
 )}
 </div>
 )}

 {/* Progress Bar */}
 {isDeploying && (
 <div className="w-full bg-surface-elevated border border-border-subtle rounded-full h-2 overflow-hidden">
 <div
 className="bg-accent h-full rounded-full transition-all duration-500"
 style={{ width: `${deployProgress}%` }}
 ></div>
 </div>
 )}
 </div>

 {/* Navigation */}
 <div className="flex justify-between pt-6 border-t border-border mt-8">
 <button
 onClick={handlePrevious}
 className="bg-surface-elevated border border-border text-content-secondary hover:bg-surface-hover px-6 py-3 rounded-md font-semibold text-body-sm transition-colors duration-base flex items-center gap-2"
 >
 <ArrowLeft size={18} />
 Previous
 </button>
 {isDeploySuccess && (
 <button
 onClick={onBack}
 className="bg-accent hover:bg-accent-hover text-content-inverse px-6 py-3 rounded-md font-semibold text-body-sm transition-colors duration-base flex items-center gap-2"
 >
 Back to Home
 <ChevronRight size={18} />
 </button>
 )}
 </div>
 </div>
 </div>
 )}
 </div>
 </div>
 );
};

export default AgentCreation;
