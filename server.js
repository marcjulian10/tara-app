import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// ─── Anthropic Claude Client ───
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─── Tara System Prompt ───
const TARA_SYSTEM_PROMPT = `You are Tara, a warm and encouraging financial partner AI built for couples and partners who want to save smarter and grow together.

Your personality:
- Warm, honest, and never judgmental about money habits
- Encouraging without being fake — you celebrate real progress
- You speak in a calm, conversational tone — like a trusted friend who happens to know finance
- You use "you two" or "you both" naturally when referring to the couple
- You avoid jargon unless the user wants detail; always offer to explain further
- You are playful but focused — never lecture, always guide

You are NOT a licensed financial advisor. Always clarify this when giving specific financial suggestions, and recommend professional consultation for major decisions.

You can help couples with:
1. SHARED GOALS — Help them create, name, and track savings goals together. Each goal has a target amount, deadline, and contribution split between partners.
2. PARTNER MONITORING — Show each partner's contributions, streaks, and progress toward shared and individual goals. Celebrate milestones warmly.
3. SAVINGS INSIGHTS — Analyze spending patterns, suggest savings rates, and recommend strategies based on their combined income and expenses.
4. GOAL ADJUSTMENTS — If partners fall behind, suggest realistic re-plans with adjusted timelines or split contributions, without guilt.
5. FINANCIAL EDUCATION — Explain savings strategies (e.g., 50/30/20 rule, sinking funds, high-yield savings accounts) in a simple, relatable way.
6. CURRENCY CONVERSION — Help couples who earn in different currencies or plan to save in a foreign currency for a goal abroad.
7. MOTIVATION CHECK-INS — Send encouraging check-in messages and celebrate anniversaries of goal creation or milestones hit.

Conversation Rules:
- Always address both partners when discussing shared goals
- Never assign blame to one partner for missed contributions — always frame it as a team challenge
- If a goal seems financially unrealistic, say so gently with a suggested alternative timeline
- When a partner hasn't contributed in a while, use curiosity not shame
- Prioritize privacy: never reveal one partner's private notes or individual savings to the other unless goals are "shared visibility"
- Format money values clearly: always show currency symbol, use comma separators (e.g., ₱12,500.00)
- Keep responses concise for mobile users unless detail is requested
- When responding, use markdown formatting for better readability. Use **bold** for key amounts, bullet points for lists, and emojis sparingly for warmth.`;

// ─── Chat Endpoint (Anthropic Claude) ───
app.post('/api/chat', async (req, res) => {
  try {
    const { message, context, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured. Please add it to your .env file.' });
    }

    // Build context block to inject
    let contextBlock = '';
    if (context) {
      contextBlock = `\n\nCurrent session context:
- Partner A: ${context.partnerA || 'Not set'}, joined ${context.partnerAJoined || 'N/A'}
- Partner B: ${context.partnerB || 'Not set'}, joined ${context.partnerBJoined || 'N/A'}
- Active goals: ${JSON.stringify(context.goals || [])}
- Combined monthly income: ${context.combinedIncome || 'Not set'} ${context.currency || 'PHP'}
- Agreed savings rate: ${context.savingsRate || 20}%
- Today's date: ${new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
- App locale: en-PH

Always use the currency and locale above when formatting money values.
Refer to goals by their names, not IDs.`;
    }

    // Build messages array from history
    const messages = [];
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }
    messages.push({ role: 'user', content: message });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: TARA_SYSTEM_PROMPT + contextBlock,
      messages: messages,
    });

    const reply = response.content[0].text;
    res.json({ reply });

  } catch (error) {
    console.error('Chat error:', error.message);
    res.status(500).json({ error: 'Failed to get response from Tara. Check your API key.' });
  }
});

// ─── Exchange Rate Endpoint ───
app.get('/api/exchange-rate', async (req, res) => {
  try {
    const { base, target } = req.query;
    const baseCurrency = base || 'PHP';
    const targetCurrency = target || 'USD';

    const apiKey = process.env.EXCHANGERATE_API_KEY;
    let url;
    if (apiKey) {
      url = `https://v6.exchangerate-api.com/v6/${apiKey}/pair/${baseCurrency}/${targetCurrency}`;
    } else {
      url = `https://open.er-api.com/v6/latest/${baseCurrency}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (apiKey && data.result === 'success') {
      res.json({
        base: baseCurrency,
        target: targetCurrency,
        rate: data.conversion_rate,
        updated: data.time_last_update_utc,
      });
    } else if (!apiKey && data.result === 'success') {
      res.json({
        base: baseCurrency,
        target: targetCurrency,
        rate: data.rates[targetCurrency],
        updated: data.time_last_update_utc,
      });
    } else {
      res.status(500).json({ error: 'Failed to fetch exchange rate' });
    }
  } catch (error) {
    console.error('Exchange rate error:', error.message);
    res.status(500).json({ error: 'Exchange rate service unavailable' });
  }
});

// ─── Pexels Image Endpoint ───
app.get('/api/pexels', async (req, res) => {
  try {
    const { query } = req.query;

    if (!process.env.PEXELS_API_KEY) {
      return res.status(500).json({ error: 'PEXELS_API_KEY is not configured.' });
    }

    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      {
        headers: { Authorization: process.env.PEXELS_API_KEY },
      }
    );

    const data = await response.json();

    if (data.photos && data.photos.length > 0) {
      res.json({
        url: data.photos[0].src.landscape,
        alt: data.photos[0].alt || query,
        photographer: data.photos[0].photographer,
      });
    } else {
      res.json({ url: null, alt: query });
    }
  } catch (error) {
    console.error('Pexels error:', error.message);
    res.status(500).json({ error: 'Image search failed' });
  }
});

// ─── Fallback: serve index.html ───
app.get(/.*/, (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`✨ Tara is running at http://localhost:${port}`);
});
