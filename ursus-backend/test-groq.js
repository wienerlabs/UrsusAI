require('dotenv').config();
const Groq = require('groq-sdk');

async function testGroq() {
 console.log(' Testing Groq API...\n');

 const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

 try {
 console.log(' Sending request to Groq...');

 const completion = await groq.chat.completions.create({
 messages: [
 { role: 'system', content: 'You are a professional crypto market analyst.' },
 {
 role: 'user',
 content: 'Provide a brief market analysis for Bitcoin (BTC). Include current trend and a short-term outlook.'
 }
 ],
 model: 'llama3-8b-8192',
 temperature: 0.7,
 max_tokens: 500,
 });

 const response = completion.choices[0]?.message?.content;

 console.log('\n Groq API Response:\n');
 console.log('─'.repeat(80));
 console.log(response);
 console.log('─'.repeat(80));
 console.log('\n Test successful! Groq API is working perfectly! \n');

 } catch (error) {
 console.error('\n Groq API Error:', error.message);
 console.error('\nFull error:', error);
 process.exit(1);
 }
}

testGroq();

