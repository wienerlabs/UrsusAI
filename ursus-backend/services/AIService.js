const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIService {
  constructor() {
    // Initialize only the providers you want
    this.anthropic = process.env.ANTHROPIC_API_KEY
      ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      : null;

    this.googleAI = process.env.GOOGLE_AI_API_KEY
      ? new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)
      : null;

    this.huggingFaceApiKey = process.env.HUGGINGFACE_API_KEY || null;

    // HuggingFace model routing — maps model IDs to provider endpoints
    this.hfModels = {
      'llama-3.1-8b': {
        url: 'https://router.huggingface.co/novita/v3/openai/chat/completions',
        model: 'meta-llama/llama-3.1-8b-instruct',
      },
      'llama-3.3-70b': {
        url: 'https://router.huggingface.co/together/v1/chat/completions',
        model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      },
      'qwen-2.5-7b': {
        url: 'https://router.huggingface.co/together/v1/chat/completions',
        model: 'Qwen/Qwen2.5-7B-Instruct-Turbo',
      },
      'deepseek-v3': {
        url: 'https://router.huggingface.co/together/v1/chat/completions',
        model: 'deepseek-ai/DeepSeek-V3',
      },
      'sambanova-llama-8b': {
        url: 'https://router.huggingface.co/sambanova/v1/chat/completions',
        model: 'Meta-Llama-3.1-8B-Instruct',
      },
      'novita-qwen-7b': {
        url: 'https://router.huggingface.co/novita/v3/openai/chat/completions',
        model: 'qwen/qwen2.5-7b-instruct',
      },
    };
  }

  async validateModel(model) {
    try {
      switch (model) {
        // OpenAI modelleri devre dışı
        case 'gpt-4':
        case 'gpt-3.5-turbo':
          return false;

        case 'claude-3':
        case 'claude-3-sonnet-20240229':
          return !!this.anthropic;

        case 'gemini-pro':
          return !!this.googleAI;

        default:
          return false;
      }
    } catch (error) {
      console.error('Error validating model:', error);
      return false;
    }
  }

  async generateResponse(model, instructions, userMessage, userAddress = null) {
    try {
      const systemPrompt = this.buildSystemPrompt(instructions, userAddress);

      // Check if model is a known HuggingFace model
      const isHfModel = !!this.hfModels[model];

      // Route to provider
      if (isHfModel && this.huggingFaceApiKey) {
        return await this.generateHuggingFaceResponse(systemPrompt, userMessage, model);
      } else if ((model === 'claude-3' || model === 'claude-3-sonnet-20240229') && this.anthropic) {
        return await this.generateAnthropicResponse(systemPrompt, userMessage);
      } else if (model === 'gemini-pro' && this.googleAI) {
        return await this.generateGoogleAIResponse(systemPrompt, userMessage);
      } else if (this.huggingFaceApiKey) {
        // Fallback to default HF model
        return await this.generateHuggingFaceResponse(systemPrompt, userMessage, 'llama-3.1-8b');
      } else if (this.googleAI) {
        return await this.generateGoogleAIResponse(systemPrompt, userMessage);
      } else if (this.anthropic) {
        return await this.generateAnthropicResponse(systemPrompt, userMessage);
      } else {
        throw new Error('No AI provider configured');
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  // Tek bir buildSystemPrompt bırak (dosyanda iki tane vardı, çakışıyordu)
  buildSystemPrompt(instructions, userAddress = null, agentData = null) {
    let systemPrompt = `${instructions}\n\nYou are an AI agent on the Solana blockchain. You should:
- Be helpful and informative
- Stay in character based on your instructions
- Provide accurate information about blockchain and DeFi
- Be engaging and conversational
- If asked about trading or financial advice, remind users to do their own research
- Keep responses concise but informative (max 500 words)
- You can reference your token's performance and metrics when relevant`;

    if (agentData) {
      systemPrompt += `\n\nYour token information:
- Name: ${agentData.name}
- Symbol: ${agentData.symbol}
- Current Price: ${agentData.currentPrice} CORE
- Market Cap: ${agentData.marketCap} CORE
- Holders: ${agentData.holders}
- You can mention these stats when relevant to the conversation`;
    }

    if (userAddress) {
      systemPrompt += `\n\nUser wallet address: ${userAddress}`;
    }

    systemPrompt += `\n\nCurrent timestamp: ${new Date().toISOString()}`;
    return systemPrompt;
  }

  async generateAnthropicResponse(systemPrompt, userMessage) {
    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 500,
        temperature: 0.7,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }]
      });
      return response.content[0].text;
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw new Error('Failed to generate response with Claude');
    }
  }

  async generateGoogleAIResponse(systemPrompt, userMessage) {
    try {
      // Use gemini-1.5-flash instead of deprecated gemini-pro
      const model = this.googleAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `${systemPrompt}\n\nUser: ${userMessage}\n\nAssistant:`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Google AI API error:', error);
      throw new Error('Failed to generate response with Gemini');
    }
  }

  async generateHuggingFaceResponse(systemPrompt, userMessage, modelId = 'llama-3.1-8b') {
    try {
      const config = this.hfModels[modelId] || this.hfModels['llama-3.1-8b'];

      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.huggingFaceApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage || '' }
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HuggingFace API error ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      if (result.choices?.[0]?.message?.content) {
        return result.choices[0].message.content.trim();
      }

      throw new Error('Unexpected HuggingFace response format');
    } catch (error) {
      console.error('HuggingFace API error:', error);
      throw new Error('Failed to generate response with HuggingFace');
    }
  }

  generateAgentPersonality(category, instructions) {
    const personalities = {
      DeFi: "You are a DeFi expert who loves explaining complex financial concepts in simple terms. You're enthusiastic about yield farming, liquidity pools, and decentralized finance innovations.",
      Trading: "You are a seasoned trader with deep market knowledge. You provide insights on market trends, technical analysis, and trading strategies while emphasizing risk management.",
      Analytics: 'You are a data-driven analyst who excels at interpreting blockchain data, market metrics, and providing actionable insights based on quantitative analysis.',
      Gaming: "You are a gaming enthusiast who understands blockchain gaming, NFTs, and play-to-earn mechanics. You're excited about the future of decentralized gaming.",
      Social: 'You are a community-focused agent who helps with social interactions, DAO governance, and building connections in the Web3 space.',
      Utility: 'You are a practical problem-solver who focuses on real-world applications of blockchain technology and helping users accomplish their goals efficiently.',
      Entertainment: 'You are a creative and fun agent who brings joy and entertainment while still being helpful and informative about blockchain topics.',
      Education: 'You are a patient teacher who excels at breaking down complex blockchain concepts into easy-to-understand lessons for learners of all levels.',
      General: 'You are a well-rounded AI assistant with broad knowledge across all aspects of blockchain, DeFi, and the Solana ecosystem.'
    };
    return personalities[category] || personalities.General;
  }

  sanitizeInput(input) {
    if (typeof input !== 'string') throw new Error('Input must be a string');
    const sanitized = input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
    if (!sanitized.length) throw new Error('Input cannot be empty');
    if (sanitized.length > 2000) throw new Error('Input too long (max 2000 characters)');
    return sanitized;
  }

  async checkRateLimit() { return true; }

  getModelInfo(model) {
    const modelInfo = {
      'claude-3': {
        name: 'Claude 3 Sonnet',
        provider: 'Anthropic',
        maxTokens: 4096,
        costPer1kTokens: 0.015,
        responseTime: 'Medium'
      },
      'gemini-pro': {
        name: 'Gemini Pro',
        provider: 'Google',
        maxTokens: 2048,
        costPer1kTokens: 0.001,
        responseTime: 'Fast'
      }
    };
    return modelInfo[model] || null;
  }

  async generateContextualResponse(model, instructions, userMessage, conversationHistory = [], agentData = null, userAddress = null) {
    try {
      const systemPrompt = this.buildSystemPrompt(instructions, userAddress, agentData);
      let contextualPrompt = systemPrompt;

      if (conversationHistory.length > 0) {
        contextualPrompt += '\n\nConversation history (last 5 messages):';
        conversationHistory.slice(-5).forEach(msg => {
          contextualPrompt += `\n${msg.role}: ${msg.content}`;
        });
      }

      contextualPrompt += `\n\nUser: ${userMessage}\n\nAssistant:`;

      // Check if model is a known HuggingFace model
      const isHfModel = !!this.hfModels[model];

      if (isHfModel && this.huggingFaceApiKey) {
        return await this.generateHuggingFaceResponse(systemPrompt, userMessage, model);
      } else if ((model === 'claude-3' || model === 'claude-3-sonnet-20240229') && this.anthropic) {
        return await this.generateAnthropicResponse(systemPrompt, userMessage);
      } else if (model === 'gemini-pro' && this.googleAI) {
        return await this.generateGoogleAIResponse(contextualPrompt, '');
      } else if (this.huggingFaceApiKey) {
        return await this.generateHuggingFaceResponse(contextualPrompt, userMessage, 'llama-3.1-8b');
      } else if (this.googleAI) {
        return await this.generateGoogleAIResponse(contextualPrompt, '');
      } else if (this.anthropic) {
        return await this.generateAnthropicResponse(systemPrompt, userMessage);
      } else {
        throw new Error('No AI provider configured');
      }
    } catch (error) {
      console.error('Error generating contextual response:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  cleanupRateLimit() {
    if (!this.rateLimitCache) return;
    const now = Date.now();
    for (const [key, value] of this.rateLimitCache.entries()) {
      if (now > value.resetTime) this.rateLimitCache.delete(key);
    }
  }
}

module.exports = new AIService();
