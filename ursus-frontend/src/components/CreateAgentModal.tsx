import React, { useState } from 'react';
import { X, Upload, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useAgentFactory, AgentCreationParams } from '../hooks/useAgentFactory';
import apiService from '../services/api';

interface CreateAgentModalProps {
 isOpen: boolean;
 onClose: () => void;
}

interface FormData {
 name: string;
 symbol: string;
 description: string;
 instructions: string;
 category: string;
 model: string;
 avatar: string;
 image?: File;
 imageUrl?: string;
}

const CreateAgentModal: React.FC<CreateAgentModalProps> = ({ isOpen, onClose }) => {
 // Wallet and contract hooks
 const { isConnected, connectWallet, isOnCoreNetwork, switchToCore, address } = useWallet();
 const { createAgentToken } = useAgentFactory();

 const [step, setStep] = useState(1);
 const [isDeploying, setIsDeploying] = useState(false);
 const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle');
 const [deploymentError, setDeploymentError] = useState<string>('');
 const [deployedAddress, setDeployedAddress] = useState<string>('');

 const [formData, setFormData] = useState<FormData>({
 name: '',
 symbol: '',
 description: '',
 instructions: '',
 category: 'DeFi',
 model: 'llama3-8b-8192',
 avatar: ''
 });

 const categories = [
 'DeFi', 'Trading', 'Analytics', 'Social', 'Gaming', 'NFT', 'Utility', 'Education'
 ];

 const models = [
 // Groq models (Fast inference)
 { id: 'llama3-8b-8192', name: 'Llama 3 8B', description: 'Fast and efficient for general tasks (Groq)' },
 { id: 'llama3-70b-8192', name: 'Llama 3 70B', description: 'Most capable Llama model for complex reasoning (Groq)' },
 { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', description: 'Mixture of experts model with large context (Groq)' },
 { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', description: 'Latest Llama 3.1 with instant responses (Groq)' },
 { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B Versatile', description: 'Versatile Llama 3.1 for complex tasks (Groq)' },

 // Together AI models (High quality)
 { id: 'deepseek-coder-33b-instruct', name: 'DeepSeek Coder 33B', description: 'Specialized for coding and technical tasks (Together)' },
 { id: 'mistral-7b-instruct', name: 'Mistral 7B', description: 'Balanced model for instruction following (Together)' },
 { id: 'meta-llama-3-8b', name: 'Meta Llama 3 8B', description: 'Meta\'s Llama 3 model (8B) (Together)' },
 { id: 'meta-llama-3-70b', name: 'Meta Llama 3 70B', description: 'Meta\'s Llama 3 model (70B) (Together)' },
 { id: 'meta-llama-3.1-8b', name: 'Meta Llama 3.1 8B Turbo', description: 'Latest Llama 3.1 Turbo (8B) (Together)' },
 { id: 'meta-llama-3.1-70b', name: 'Meta Llama 3.1 70B Turbo', description: 'Latest Llama 3.1 Turbo (70B) (Together)' },

 // Gemini models (Google)
 { id: 'gemini-pro', name: 'Gemini Pro', description: 'Google\'s multimodal AI model (Gemini)' },
 { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Fast and efficient Gemini variant (Google)' },
 { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Most capable Gemini model (Google)' },

 // Local Ollama models (if available)
 { id: 'ollama-llama3', name: 'Ollama Llama 3', description: 'Local Llama 3 via Ollama' },
 { id: 'ollama-mistral', name: 'Ollama Mistral', description: 'Local Mistral via Ollama' },
 { id: 'ollama-codellama', name: 'Ollama Code Llama', description: 'Local Code Llama via Ollama' }
 ];

 const avatars = ['', '', '', '', '', '', '', '', '', ''];

 const handleInputChange = (field: keyof FormData, value: string) => {
 setFormData(prev => ({...prev, [field]: value }));
 };

 const validateStep = (stepNumber: number): boolean => {
 switch (stepNumber) {
 case 1:
 return formData.name.length >= 3 && formData.symbol.length >= 2 && formData.description.length >= 10;
 case 2:
 return formData.instructions.length >= 20 && formData.category!== '' && formData.model!== '';
 case 3:
 return true; // Review step
 default:
 return false;
 }
 };

 const handleNext = () => {
 if (validateStep(step)) {
 setStep(step + 1);
 }
 };

 const handleBack = () => {
 setStep(step - 1);
 };

 const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
 const file = event.target.files?.[0];
 if (file) {
 // Validate file type
 if (!file.type.startsWith('image/')) {
 alert('Please select an image file');
 return;
 }

 // Validate file size (max 5MB)
 if (file.size > 5 * 1024 * 1024) {
 alert('Image size must be less than 5MB');
 return;
 }

 try {
 // Upload image to backend
 try {
 const result = await apiService.uploadImage(file);
 setFormData(prev => ({
...prev,
 image: file,
 imageUrl: result.imageUrl?.startsWith('http')? result.imageUrl: `${(import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/api$/, '')}${result.imageUrl}`
 }));
 return;
 } catch (err) {
 console.error('upload via apiService failed, falling back', err);
 }

 const formData = new FormData();
 formData.append('image', file);

 const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/upload/image`, {
 method: 'POST',
 body: formData,
 });

 if (response.ok) {
 const result = await response.json();

 setFormData(prev => ({
...prev,
 image: file,
 imageUrl: `http://localhost:3001${result.imageUrl}`
 }));
 } else {
 const error = await response.json();
 alert(`Upload failed: ${error.error}`);
 }
 } catch (error) {
 console.error('Image upload error:', error);
 alert('Failed to upload image');
 }
 }
 };

 const handleDeploy = async () => {
 // Check wallet connection
 if (!isConnected) {
 try {
 await connectWallet();
 return;
 } catch {
 setDeploymentError('Please connect your wallet to continue');
 setDeploymentStatus('error');
 return;
 }
 }

 // Check network
 if (!isOnCoreNetwork) {
 try {
 switchToCore();
 return;
 } catch {
 setDeploymentError('Please switch to Solana devnet to deploy agents');
 setDeploymentStatus('error');
 return;
 }
 }

 setIsDeploying(true);
 setDeploymentStatus('deploying');
 setDeploymentError('');

 try {
 // Prepare agent creation parameters
 const agentParams: AgentCreationParams = {
 name: formData.name,
 symbol: formData.symbol,
 description: formData.description,
 instructions: formData.instructions,
 model: formData.model,
 category: formData.category,
 avatar: formData.avatar,
 imageUrl: formData.imageUrl,
 };

 // Deploy agent to Solana testnet
 const result = await createAgentToken(agentParams);

 console.log(' Agent deployed successfully:', result);

 // Note: Backend save is already done in createAgentToken hook
 // Just update UI state
 setDeployedAddress(result.agentAddress);
 setDeploymentStatus('success');

 // Toast with link to agent page
 try {
 const evt = new CustomEvent('ursus:toast', {
 detail: {
 type: 'success',
 title: 'Agent deployed',
 message: `${formData.name} (${formData.symbol}) is live on Solana`,
 actionLabel: 'View agent',
 actionHref: `/agent/${result.agentAddress}`,
 }
 });
 window.dispatchEvent(evt);
 } catch {}

 console.log(' Transaction submitted:', result.txId);

 // Auto-close after success
 setTimeout(() => {
 onClose();
 setStep(1);
 setDeploymentStatus('idle');
 setFormData({
 name: '',
 symbol: '',
 description: '',
 instructions: '',
 category: 'DeFi',
 model: 'gpt-4',
 avatar: ''
 });
 }, 2000);

 } catch (error) {
 console.error('Deployment error:', error);
 try {
 const evt = new CustomEvent('ursus:toast', {
 detail: {
 type: 'error',
 title: 'Deployment failed',
 message: error instanceof Error? error.message: 'Deployment failed'
 }
 });
 window.dispatchEvent(evt);
 } catch {}
 setDeploymentError(error instanceof Error? error.message: 'Deployment failed');
 setDeploymentStatus('error');
 } finally {
 setIsDeploying(false);
 }
 };

 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-surface-card border border-border rounded-xl shadow-elevated max-w-2xl w-full max-h-[90vh] overflow-y-auto">
 {/* Header */}
 <div className="flex items-center justify-between p-6 border-b border-border-subtle">
 <div>
 <h2 className="text-heading-md text-content-primary">Create AI Agent</h2>
 <p className="text-caption text-content-muted">Deploy your AI agent on Solana devnet</p>
 </div>
 <button
 onClick={onClose}
 className="text-content-muted hover:text-content-primary transition-colors duration-base"
 >
 <X size={20} />
 </button>
 </div>

 {/* Progress Steps */}
 <div className="flex items-center justify-center p-6 border-b border-border-subtle">
 {[1, 2, 3].map((stepNumber) => (
 <div key={stepNumber} className="flex items-center">
 <div className={`w-8 h-8 rounded-full flex items-center justify-center text-caption transition-colors duration-base ${
 step >= stepNumber
? 'bg-accent text-content-inverse'
: 'bg-surface-elevated text-content-muted'
 }`}>
 {stepNumber}
 </div>
 {stepNumber < 3 && (
 <div className={`w-16 h-0.5 mx-2 transition-colors duration-base ${
 step > stepNumber? 'bg-accent': 'bg-border'
 }`} />
 )}
 </div>
 ))}
 </div>

 {/* Step Content */}
 <div className="p-6">
 {step === 1 && (
 <div className="space-y-6">
 <div>
 <h3 className="text-heading-sm text-content-primary mb-4">Basic Information</h3>

 <div className="space-y-4">
 <div>
 <label className="block text-caption text-content-muted uppercase mb-2">
 Agent Name *
 </label>
 <input
 type="text"
 value={formData.name}
 onChange={(e) => handleInputChange('name', e.target.value)}
 placeholder="e.g., DeFi Analyzer Pro"
 className="w-full bg-surface-elevated border border-border focus:border-border-focus rounded-lg px-4 py-3 text-body text-content-primary placeholder:text-content-subtle focus:outline-none transition-colors duration-base"
 />
 </div>

 <div>
 <label className="block text-caption text-content-muted uppercase mb-2">
 Token Symbol *
 </label>
 <input
 type="text"
 value={formData.symbol}
 onChange={(e) => handleInputChange('symbol', e.target.value.toUpperCase())}
 placeholder="e.g., DEFI"
 maxLength={6}
 className="w-full bg-surface-elevated border border-border focus:border-border-focus rounded-lg px-4 py-3 text-body text-content-primary placeholder:text-content-subtle focus:outline-none transition-colors duration-base"
 />
 </div>

 <div>
 <label className="block text-caption text-content-muted uppercase mb-2">
 Description *
 </label>
 <textarea
 value={formData.description}
 onChange={(e) => handleInputChange('description', e.target.value)}
 placeholder="Describe what your AI agent does..."
 rows={4}
 className="w-full bg-surface-elevated border border-border focus:border-border-focus rounded-lg px-4 py-3 text-body text-content-primary placeholder:text-content-subtle focus:outline-none resize-none transition-colors duration-base"
 />
 </div>

 <div>
 <label className="block text-caption text-content-muted uppercase mb-2">
 Avatar
 </label>
 <div className="flex gap-2 flex-wrap">
 {avatars.map((avatar) => (
 <button
 key={avatar}
 onClick={() => handleInputChange('avatar', avatar)}
 className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl transition-colors duration-base ${
 formData.avatar === avatar
? 'bg-accent text-content-inverse'
: 'bg-surface-elevated border border-border hover:bg-surface-hover'
 }`}
 >
 {avatar}
 </button>
 ))}
 </div>
 </div>

 <div>
 <label className="block text-caption text-content-muted uppercase mb-2">
 Custom Image (Optional)
 </label>
 <div className="space-y-3">
 <div className="flex items-center gap-4">
 <input
 type="file"
 accept="image/*"
 onChange={handleImageUpload}
 className="hidden"
 id="image-upload"
 />
 <label
 htmlFor="image-upload"
 className="flex items-center gap-2 px-4 py-2 bg-surface-elevated border border-border rounded-lg text-body-sm text-content-secondary hover:bg-surface-hover cursor-pointer transition-colors duration-base"
 >
 <Upload size={16} />
 Choose Image
 </label>
 <span className="text-caption text-content-subtle">Max 5MB, JPG/PNG</span>
 </div>

 {formData.imageUrl && (
 <div className="flex items-center gap-3">
 <img
 src={formData.imageUrl}
 alt="Preview"
 className="w-16 h-16 rounded-lg object-cover border border-border"
 />
 <div className="flex-1">
 <p className="text-body-sm text-content-secondary">Image uploaded successfully</p>
 <button
 onClick={() => setFormData(prev => ({...prev, image: undefined, imageUrl: undefined }))}
 className="text-caption text-danger hover:text-content-primary transition-colors duration-base"
 >
 Remove
 </button>
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 </div>
 )}

 {step === 2 && (
 <div className="space-y-6">
 <div>
 <h3 className="text-heading-sm text-content-primary mb-4">AI Configuration</h3>

 <div className="space-y-4">
 <div>
 <label className="block text-caption text-content-muted uppercase mb-2">
 Instructions *
 </label>
 <textarea
 value={formData.instructions}
 onChange={(e) => handleInputChange('instructions', e.target.value)}
 placeholder="Provide detailed instructions for your AI agent's behavior and expertise..."
 rows={6}
 className="w-full bg-surface-elevated border border-border focus:border-border-focus rounded-lg px-4 py-3 text-body text-content-primary placeholder:text-content-subtle focus:outline-none resize-none transition-colors duration-base"
 />
 </div>

 <div>
 <label className="block text-caption text-content-muted uppercase mb-2">
 Category *
 </label>
 <select
 value={formData.category}
 onChange={(e) => handleInputChange('category', e.target.value)}
 className="w-full bg-surface-elevated border border-border focus:border-border-focus rounded-lg px-4 py-3 text-body text-content-primary focus:outline-none transition-colors duration-base"
 >
 {categories.map((category) => (
 <option key={category} value={category}>
 {category}
 </option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-caption text-content-muted uppercase mb-2">
 AI Model *
 </label>
 <div className="space-y-2">
 {models.map((model) => (
 <label key={model.id} className="flex items-center p-3 bg-surface-elevated border border-border rounded-lg cursor-pointer hover:bg-surface-hover transition-colors duration-base">
 <input
 type="radio"
 name="model"
 value={model.id}
 checked={formData.model === model.id}
 onChange={(e) => handleInputChange('model', e.target.value)}
 className="mr-3"
 />
 <div>
 <div className="text-body text-content-primary">{model.name}</div>
 <div className="text-caption text-content-muted">{model.description}</div>
 </div>
 </label>
 ))}
 </div>
 </div>
 </div>
 </div>
 </div>
 )}

 {step === 3 && (
 <div className="space-y-6">
 <div>
 <h3 className="text-heading-sm text-content-primary mb-4">Review & Deploy</h3>

 {deploymentStatus === 'idle' && (
 <div className="space-y-4">
 <div className="bg-surface-elevated border border-border rounded-lg p-4">
 <div className="flex items-center gap-3 mb-3">
 <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center text-xl text-content-inverse">
 {formData.avatar}
 </div>
 <div>
 <div className="text-body text-content-primary">{formData.name}</div>
 <div className="text-caption text-content-muted">{formData.symbol} • {formData.category}</div>
 </div>
 </div>
 <p className="text-body-sm text-content-secondary mb-3">{formData.description}</p>
 <div className="text-micro text-content-muted">
 <div>Model: {models.find(m => m.id === formData.model)?.name}</div>
 <div>Instructions: {formData.instructions.length} characters</div>
 </div>
 </div>

 <div className="bg-info-subtle border border-border-subtle rounded-lg p-4">
 <div className="flex items-start gap-3">
 <AlertCircle className="text-info mt-0.5" size={16} />
 <div>
 <div className="text-body-sm text-info">Ready to Deploy</div>
 <div className="text-body-sm text-content-secondary mt-1">
 Your agent will be deployed to Solana devnet. Make sure you have enough SOL tokens for transaction fees.
 </div>
 </div>
 </div>
 </div>
 </div>
 )}

 {deploymentStatus === 'deploying' && (
 <div className="text-center py-8">
 <Loader2 className="w-12 h-12 text-accent animate-spin mx-auto mb-4" />
 <div className="text-heading-sm text-content-primary mb-2">Deploying Agent...</div>
 <div className="text-body-sm text-content-muted">
 Please confirm the transaction in your wallet
 </div>
 </div>
 )}

 {deploymentStatus === 'success' && (
 <div className="text-center py-8">
 <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
 <div className="text-heading-sm text-content-primary mb-2">Agent Deployed Successfully!</div>
 <div className="text-body-sm text-content-muted mb-4">
 Contract Address: {deployedAddress}
 </div>
 <div className="text-body-sm text-success">
 Your agent is now live on Solana devnet
 </div>
 </div>
 )}

 {deploymentStatus === 'error' && (
 <div className="text-center py-8">
 <AlertCircle className="w-12 h-12 text-danger mx-auto mb-4" />
 <div className="text-heading-sm text-content-primary mb-2">Deployment Failed</div>
 <div className="text-body-sm text-danger">
 {deploymentError}
 </div>
 </div>
 )}
 </div>
 </div>
 )}
 </div>

 {/* Footer */}
 <div className="flex items-center justify-between p-6 border-t border-border-subtle">
 <div>
 {step > 1 && deploymentStatus === 'idle' && (
 <button
 onClick={handleBack}
 className="px-4 py-2 text-body-sm text-content-muted hover:text-content-primary transition-colors duration-base"
 >
 Back
 </button>
 )}
 </div>

 <div className="flex gap-3">
 {step < 3 && (
 <button
 onClick={handleNext}
 disabled={!validateStep(step)}
 className="bg-accent hover:bg-accent-hover text-content-inverse px-6 py-2 rounded-lg text-body-sm transition-colors duration-base disabled:opacity-50 disabled:cursor-not-allowed"
 >
 Next
 </button>
 )}

 {step === 3 && deploymentStatus === 'idle' && (
 <button
 onClick={handleDeploy}
 disabled={isDeploying}
 className="bg-accent hover:bg-accent-hover text-content-inverse px-6 py-2 rounded-lg text-body-sm transition-colors duration-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
 >
 {isDeploying && <Loader2 size={16} className="animate-spin" />}
 {!isConnected? 'Connect Wallet & Deploy': 'Deploy Agent'}
 </button>
 )}

 {(deploymentStatus === 'success' || deploymentStatus === 'error') && (
 <button
 onClick={onClose}
 className="bg-accent hover:bg-accent-hover text-content-inverse px-6 py-2 rounded-lg text-body-sm transition-colors duration-base"
 >
 Close
 </button>
 )}
 </div>
 </div>
 </div>
 </div>
 );
};

export default CreateAgentModal;
