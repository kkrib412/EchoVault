import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Lazy initialized GoogleGenAI client singleton to prevent module import startup failures
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("WARNING: GEMINI_API_KEY is not defined in the environment. AI-powered features will fail until configured.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key || "temporary_missing_key",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

/**
 * Robust wrapper for Gemini generateContent that handles 503/UNAVAILABLE errors
 * by falling back to the highly available 'gemini-3.1-flash-lite' model,
 * and performing exponential backoff retries for transient failures.
 */
async function generateContentWithRetry(params: any, maxRetries = 2) {
  let attempt = 0;
  let delay = 1000; // Start with 1 second delay
  const mainModel = params.model || "gemini-3.5-flash";
  const fallbackModel = "gemini-3.1-flash-lite";

  while (true) {
    try {
      return await getAiClient().models.generateContent(params);
    } catch (err: any) {
      attempt++;
      const errorMessage = err?.message || String(err);
      const isUnavailable = errorMessage.includes("503") || 
                            errorMessage.includes("UNAVAILABLE") || 
                            errorMessage.includes("high demand") ||
                            err?.status === 503;

      console.error(`Gemini API error (attempt ${attempt}/${maxRetries + 1}) on model ${params.model}:`, errorMessage);

      // If it's a 503 / unavailable error and we're not already on the fallback model, swap immediately
      if (isUnavailable && params.model !== fallbackModel) {
        console.warn(`Model ${params.model} is experiencing high demand / unavailable. Automatically falling back to highly available ${fallbackModel}...`);
        params.model = fallbackModel;
        // Quick short delay for fallback trial
        delay = 500;
        continue;
      }

      // If we've exhausted all retries, throw the error
      if (attempt > maxRetries) {
        throw err;
      }

      // Exponential backoff wait
      console.log(`Waiting ${delay}ms before retrying...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}

// Create storage directory if not exists
const DATA_DIR = path.join(process.cwd(), "data");
const STORAGE_FILE = path.join(DATA_DIR, "storage.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// Initial Database Schema
const fallbackData = {
  botConfig: {
    businessName: "EcoSprout Organics",
    industry: "Retail & E-commerce",
    tone: "Empathetic",
    leadCaptureActive: true,
    onboardingCompleted: true,
    faqs: [
      { id: "1", question: "What are your shipping rates?", answer: "We offer free shipping on organic produce orders over $50! For orders under $50, standard shipping is $5.99." },
      { id: "2", question: "Where do you source your products?", answer: "All of our products are sourced directly from certified organic family farms in North America, ensuring the highest standards of quality and fair trade." },
      { id: "3", question: "Do you have a physical store?", answer: "We are an online-first delivery service, but we have a boutique Farm Stall open every Saturday in Portland, Oregon at 405 Greenway Dr." }
    ]
  },
  capturedLeads: [
    { id: "lead-1", name: "David Miller", email: "david.m@gmail.com", capturedAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(), sourceBot: "EcoSprout Organics", initialMessage: "Hi, I'm interested in ordering a weekly organic basket subscription." },
    { id: "lead-2", name: "Sarah Jenkins", email: "sarah.j89@outlook.com", capturedAt: new Date(Date.now() - 25 * 3600 * 1000).toISOString(), sourceBot: "EcoSprout Organics", initialMessage: "Do you ship organic produce to Seattle?" }
  ],
  auditReports: [
    {
      id: "report-1",
      url: "https://www.ecoorganicproduce.comp",
      scannedAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      scores: { pageSpeed: 82, mobileResponsiveness: 94, seoRank: 78, complianceScore: 85 },
      checks: { pageSpeedSeconds: 1.8, metaTagsPresent: true, brokenLinksCount: 3, contactFormPresent: true, googleBusinessSchema: false, hasProperSitemap: true },
      aiRecommendation: "Excellent UX, but lacking local SEO structural optimizations.",
      aiDetailedAdvice: "### High-Priority Optimization Steps\n\n1. **Inject Google Business Schema Markup**\n   Your site lacks local company structured schema. Adding structured JSON-LD company meta elements in your header will boost physical listings by up to 40%.\n\n2. **Optimize Organic Produce Detail Images**\n   Although mobile responsiveness is high, product listing hero templates host heavy, uncompressed PNG files. Compress these to modern WebP format to shave off 0.8 seconds in page-load times.\n\n3. **Address Broken Navigation Anchors**\n   Detected 3 broken links inside the footer directory referencing historical recipe collections. Revise or redirect these paths."
    }
  ],
  consultationLeads: [
    { id: "consult-1", name: "Marc Sterling", email: "marc@sterlingdesigns.co", website: "https://www.sterlingdesigns.co", notes: "Please run a deeper audit on our checkout funnel speed.", requestedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(), status: "new" }
  ]
};

function readDb() {
  try {
    if (!fs.existsSync(STORAGE_FILE)) {
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(fallbackData, null, 2));
      return fallbackData;
    }
    const raw = fs.readFileSync(STORAGE_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading database file, returning memory fallback:", err);
    return fallbackData;
  }
}

function writeDb(data: any) {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error writing database file:", err);
  }
}

// Middlewares
app.use(express.json());

// API Endpoints

// 1. Get entire database state
app.get("/api/db", (req, res) => {
  const db = readDb();
  res.json(db);
});

// 2. Update Bot Config
app.post("/api/bot/config", (req, res) => {
  const db = readDb();
  const newConfig = req.body;
  
  db.botConfig = {
    ...db.botConfig,
    ...newConfig,
    onboardingCompleted: true
  };
  
  writeDb(db);
  res.json({ success: true, botConfig: db.botConfig });
});

// 3. Update FAQs directly
app.post("/api/bot/faqs", (req, res) => {
  const db = readDb();
  const { faqs } = req.body;
  
  if (Array.isArray(faqs)) {
    db.botConfig.faqs = faqs;
    writeDb(db);
    res.json({ success: true, faqs: db.botConfig.faqs });
  } else {
    res.status(400).json({ error: "faqs must be an array" });
  }
});

// 4. Chat with Custom Bot (incorporates FAQs and captures lead info dynamically)
app.post("/api/bot/chat", async (req, res) => {
  const db = readDb();
  const { message, chatHistory } = req.body;
  const config = db.botConfig;
  
  if (!message) {
    return res.status(400).json({ error: "message is required" });
  }

  try {
    // Format FAQ string for Gemini context
    const faqContext = config.faqs.map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n");
    
    // Construct system instructions
    let leadCaptureInstruction = "";
    if (config.leadCaptureActive) {
      leadCaptureInstruction = `
LEAD CAPTURE MODE IS ACTIVE:
- If the visitor shows interest, asks for a consultation, pricing, or wants to connect, politely ask them for their name or email address.
- Ask in a natural, friendly, non-pushy way.
- Always check if they provide their contact details. If they introduce themselves or name themselves, capture that. If they provide an email, capture that.
- Very Important: If they provide their information, return it in the specific JSON schema fields "capturedName" and "capturedEmail".`;
    }

    const systemInstruction = `You are a helpful, professional, and smart AI Chatbot representative for "${config.businessName}" (Industry: ${config.industry}).
Your speaking tone is purely "${config.tone}". Match this tone throughout your conversation.

Below is your company FAQ guide. Use this knowledge strictly to answer customer questions. If the answer is not in the FAQs, answer politely using general industry logic while staying true to the company profile:
${faqContext}

${leadCaptureInstruction}

Format the response strictly as valid JSON with three keys:
1. "reply": Your AI response text that is shown directly to the user (keep it conversational, concise, and helpful, under 3-4 sentences).
2. "capturedName": The visitor's name if they JUST explicitly stated it in this current message (otherwise null or empty).
3. "capturedEmail": The visitor's email address if they JUST explicitly typed or provided it in this current message (otherwise null or empty).

Answer strictly in this JSON format. Never output markdown format for the outer JSON. Only return JSON.`;

    // Map frontend chatHistory to Gemini format
    // Format history for context
    const historyPrompt = chatHistory && chatHistory.length > 0 
      ? chatHistory.map((ch: any) => `${ch.sender === 'user' ? 'Visitor' : 'Chatbot'}: ${ch.text}`).join("\n") + `\nVisitor: ${message}`
      : `Visitor: ${message}`;

    const response = await generateContentWithRetry({
      model: "gemini-3.5-flash",
      contents: [
        { role: 'user', parts: [{ text: historyPrompt }] }
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING, description: "The message response to the visitor" },
            capturedName: { type: Type.STRING, description: "Captured brand new visitor name if provided, else null" },
            capturedEmail: { type: Type.STRING, description: "Captured brand new visitor email if provided, else null" }
          },
          required: ["reply", "capturedName", "capturedEmail"]
        }
      }
    });

    const bodyText = response.text || "{}";
    let parsedResult;
    try {
      parsedResult = JSON.parse(bodyText.trim());
    } catch (e) {
      // Fallback on parser error
      parsedResult = {
        reply: "Thank you for that. How can I help you today?",
        capturedName: null,
        capturedEmail: null
      };
    }

    // Process lead capture if details were returned and valid
    let savedLead = null;
    if (config.leadCaptureActive && (parsedResult.capturedName || parsedResult.capturedEmail)) {
      const name = parsedResult.capturedName || "Unknown Visitor";
      const email = parsedResult.capturedEmail || "";
      
      if (email || parsedResult.capturedName) {
        // Create new lead entry
        const newLead = {
          id: `lead-${Date.now()}`,
          name: name,
          email: email,
          capturedAt: new Date().toISOString(),
          sourceBot: config.businessName,
          initialMessage: message
        };
        
        db.capturedLeads.unshift(newLead);
        writeDb(db);
        savedLead = newLead;
      }
    }

    res.json({
      reply: parsedResult.reply,
      leadCaptured: savedLead
    });

  } catch (err: any) {
    console.error("Gemini chatbot error:", err);
    res.status(500).json({ error: "Failed to generate AI response. Please ensure your Gemini key is loaded.", message: err.message });
  }
});

// 5. Run automated website Audit
app.post("/api/audit/run", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    const cleanUrl = url.replace(/^(https?:\/\/)?(www\.)?/, "");
    const domainPrefix = cleanUrl.split("/")[0].split(".")[0] || "Target Website";
    const beautifiedName = domainPrefix.charAt(0).toUpperCase() + domainPrefix.slice(1);

    const systemPrompt = `You are a world-class digital conversion rate and SEO auditor at professional agency AI Forge.
Evaluate the website URL "${url}" theoretically but with hyper-realistic technical detail.
Identify specific UX bottlenecks, SEO shortcomings, speed suggestions, schema omissions, mobile layout challenges, and brand recommendations.

Produce a professional plain-English audit report formatted strictly as JSON matching this schema:
{
  "scores": {
    "pageSpeed": 40-100 (integer representing realistic speed rating),
    "mobileResponsiveness": 40-100 (integer),
    "seoRank": 40-100 (integer),
    "complianceScore": 40-100 (integer)
  },
  "checks": {
    "pageSpeedSeconds": 0.5-6.0 (decimal),
    "metaTagsPresent": boolean,
    "brokenLinksCount": 0-20 (integer),
    "contactFormPresent": boolean,
    "googleBusinessSchema": boolean,
    "hasProperSitemap": boolean
  },
  "aiRecommendation": "Give a 1-2 sentence high-level executive strategic summary tailored specifically to ${beautifiedName}.",
  "aiDetailedAdvice": "Provide a complete list in clean markdown. Structure:
  ### 🚀 SEO & Metadata Improvements
  (Specific bullet points)
  ### ⚡ Performance & Core Web Vitals
  (Specific speed points)
  ### 📱 Mobile UX & Accessibility
  (Specific UX/UI layouts to refine)
  ### 💡 AI Forge Marketing Strategy
  (A customized growth tip for this company)"
}

Keep all advice custom-tailored to the domain and business type of ${beautifiedName}. Ensure it reads like a 5-star custom audit, not automated template text.`;

    const response = await generateContentWithRetry({
      model: "gemini-3.5-flash",
      contents: "Generate a custom audit report for: " + url,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scores: {
              type: Type.OBJECT,
              properties: {
                pageSpeed: { type: Type.INTEGER },
                mobileResponsiveness: { type: Type.INTEGER },
                seoRank: { type: Type.INTEGER },
                complianceScore: { type: Type.INTEGER }
              },
              required: ["pageSpeed", "mobileResponsiveness", "seoRank", "complianceScore"]
            },
            checks: {
              type: Type.OBJECT,
              properties: {
                pageSpeedSeconds: { type: Type.NUMBER },
                metaTagsPresent: { type: Type.BOOLEAN },
                brokenLinksCount: { type: Type.INTEGER },
                contactFormPresent: { type: Type.BOOLEAN },
                googleBusinessSchema: { type: Type.BOOLEAN },
                hasProperSitemap: { type: Type.BOOLEAN }
              },
              required: ["pageSpeedSeconds", "metaTagsPresent", "brokenLinksCount", "contactFormPresent", "googleBusinessSchema", "hasProperSitemap"]
            },
            aiRecommendation: { type: Type.STRING },
            aiDetailedAdvice: { type: Type.STRING }
          },
          required: ["scores", "checks", "aiRecommendation", "aiDetailedAdvice"]
        }
      }
    });

    const text = response.text || "{}";
    const auditData = JSON.parse(text.trim());

    // Create report entry
    const newReport = {
      id: `report-${Date.now()}`,
      url: url,
      scannedAt: new Date().toISOString(),
      ...auditData
    };

    const db = readDb();
    db.auditReports.unshift(newReport);
    writeDb(db);

    res.json(newReport);

  } catch (err: any) {
    console.error("Audit generation error:", err);
    res.status(500).json({ error: "Failed to generate website audit report. Make sure your Gemini API key is valid.", message: err.message });
  }
});

// 6. Submit a consultation Request (Feeds AI Forge Leads)
app.post("/api/leads/consult", (req, res) => {
  const db = readDb();
  const { name, email, website, notes } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: "Name and Email are required" });
  }

  const newConsult = {
    id: `consult-${Date.now()}`,
    name,
    email,
    website: website || "",
    notes: notes || "",
    requestedAt: new Date().toISOString(),
    status: "new" as const
  };

  db.consultationLeads.unshift(newConsult);
  writeDb(db);

  res.json({ success: true, lead: newConsult });
});

// 7. Delete Lead (Dashboard utility)
app.delete("/api/leads/:id", (req, res) => {
  const db = readDb();
  const { id } = req.params;

  db.capturedLeads = db.capturedLeads.filter((l: any) => l.id !== id);
  db.consultationLeads = db.consultationLeads.filter((c: any) => c.id !== id);
  
  writeDb(db);
  res.json({ success: true });
});

// 8. Serving embeddable script
app.get("/widget.js", (req, res) => {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.headers["x-forwarded-host"] || req.get("host") || `localhost:${PORT}`;
  const hostUrl = process.env.APP_URL || `${protocol}://${host}`;
  
  const widgetScript = `
(function() {
  // Styles for the floating chat window
  const style = document.createElement('style');
  style.innerHTML = \`
    .aiforge-chat-bubble {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #1e293b, #0f172a);
      box-shadow: 0 4px 20px rgba(0,0,0,0.25);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border: 1px solid rgba(255,255,255,0.1);
    }
    .aiforge-chat-bubble:hover {
      transform: scale(1.08) translateY(-2px);
      box-shadow: 0 6px 24px rgba(0,0,0,0.35);
    }
    .aiforge-chat-bubble svg {
      width: 28px;
      height: 28px;
      color: #38bdf8;
    }
    .aiforge-chat-container {
      position: fixed;
      bottom: 96px;
      right: 24px;
      width: 380px;
      height: 540px;
      border-radius: 16px;
      background: #0f172a;
      box-shadow: 0 8px 30px rgba(0,0,0,0.4);
      border: 1px solid rgba(56, 189, 248, 0.2);
      display: none;
      flex-direction: column;
      overflow: hidden;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .aiforge-chat-header {
      background: #1e293b;
      padding: 16px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .aiforge-chat-title {
      font-weight: 600;
      color: #f8fafc;
      font-size: 15px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .aiforge-chat-status {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
    }
    .aiforge-chat-close {
      color: #94a3b8;
      cursor: pointer;
      font-size: 18px;
      background: none;
      border: none;
    }
    .aiforge-chat-messages {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #090d16;
    }
    .aiforge-msg {
      max-width: 80%;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 13px;
      line-height: 1.5;
    }
    .aiforge-msg-bot {
      background: #1e293b;
      color: #f1f5f9;
      align-self: flex-start;
      border-bottom-left-radius: 2px;
    }
    .aiforge-msg-user {
      background: #0284c7;
      color: #ffffff;
      align-self: flex-end;
      border-bottom-right-radius: 2px;
    }
    .aiforge-chat-input-area {
      padding: 14px;
      background: #1e293b;
      border-top: 1px solid rgba(255,255,255,0.08);
      display: flex;
      gap: 8px;
    }
    .aiforge-chat-input {
      flex: 1;
      background: #0f172a;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      padding: 8px 12px;
      color: #f8fafc;
      font-size: 13px;
      outline: none;
    }
    .aiforge-chat-input::placeholder {
      color: #64748b;
    }
    .aiforge-chat-input:focus {
      border-color: #38bdf8;
    }
    .aiforge-chat-send {
      background: #0284c7;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
    }
    .aiforge-chat-send:hover {
      background: #0369a1;
    }
    @media (max-width: 480px) {
      .aiforge-chat-container {
        width: calc(100% - 32px);
        height: 480px;
        right: 16px;
        bottom: 84px;
      }
    }
  \`;
  document.head.appendChild(style);

  // Read config from target script tags
  const currentScript = document.currentScript;
  const botId = currentScript ? currentScript.getAttribute('data-bot-id') : 'default';

  // Create & mount chat bubble
  const bubble = document.createElement('div');
  bubble.className = 'aiforge-chat-bubble';
  bubble.innerHTML = \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>\`;
  document.body.appendChild(bubble);

  // Create & mount chat window
  const container = document.createElement('div');
  container.className = 'aiforge-chat-container';
  container.innerHTML = \`
    <div class="aiforge-chat-header">
      <div class="aiforge-chat-title">
        <span class="aiforge-chat-status"></span>
        <span id="aiforge-company-title">Assistant</span>
      </div>
      <button class="aiforge-chat-close">&times;</button>
    </div>
    <div class="aiforge-chat-messages" id="aiforge-msg-container">
      <div class="aiforge-msg aiforge-msg-bot">Hello! How can I assist you today?</div>
    </div>
    <div class="aiforge-chat-input-area">
      <input type="text" class="aiforge-chat-input" placeholder="Type your message..." id="aiforge-msg-input" />
      <button class="aiforge-chat-send" id="aiforge-msg-send">Send</button>
    </div>
  \`;
  document.body.appendChild(container);

  // Chat logic
  const msgContainer = container.querySelector('#aiforge-msg-container');
  const msgInput = container.querySelector('#aiforge-msg-input');
  const msgSend = container.querySelector('#aiforge-msg-send');
  const closeBtn = container.querySelector('.aiforge-chat-close');
  const titleSpan = container.querySelector('#aiforge-company-title');
  const history = [];

  // Toggle visible states
  bubble.addEventListener('click', function() {
    if (container.style.display === 'none' || !container.style.display) {
      container.style.display = 'flex';
      msgInput.focus();
    } else {
      container.style.display = 'none';
    }
  });

  closeBtn.addEventListener('click', function() {
    container.style.display = 'none';
  });

  // Load correct branding name from endpoint
  fetch('${hostUrl}/api/db')
    .then(r => r.json())
    .then(data => {
      if (data && data.botConfig && data.botConfig.businessName) {
        titleSpan.textContent = data.botConfig.businessName;
      }
    })
    .catch(() => {});

  function addMessage(text, sender) {
    const msg = document.createElement('div');
    msg.className = 'aiforge-msg aiforge-msg-' + sender;
    msg.textContent = text;
    msgContainer.appendChild(msg);
    msgContainer.scrollTop = msgContainer.scrollHeight;
    history.push({ sender, text });
  }

  function handleSend() {
    const text = msgInput.value.trim();
    if (!text) return;

    addMessage(text, 'user');
    msgInput.value = '';

    // Typing simulated indicator
    const typing = document.createElement('div');
    typing.className = 'aiforge-msg aiforge-msg-bot';
    typing.textContent = 'Typing...';
    msgContainer.appendChild(typing);
    msgContainer.scrollTop = msgContainer.scrollHeight;

    fetch('${hostUrl}/api/bot/chat', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, chatHistory: history.slice(0, -1) })
    })
    .then(res => res.json())
    .then(resData => {
      typing.remove();
      if (resData.reply) {
        addMessage(resData.reply, 'bot');
      } else {
        addMessage('Sorry, I encountered an issue connecting to the core node.', 'bot');
      }
    })
    .catch(() => {
      typing.remove();
      addMessage('Network connection error.', 'bot');
    });
  }

  msgSend.addEventListener('click', handleSend);
  msgInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') handleSend();
  });
})();
  `;
  
  res.setHeader("Content-Type", "application/javascript");
  res.send(widgetScript);
});


// Production or Development Serve Logic
const initApp = async () => {
  if (process.env.NODE_ENV !== "production") {
    // In development mode, mount Vite dev server as middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite middleware mounted.");
  } else {
    // Standard static build serve
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Forge Server listening on port ${PORT}`);
  });
};

initApp().catch((err) => {
  console.error("Failed to bootstrap fullstack server:", err);
});
