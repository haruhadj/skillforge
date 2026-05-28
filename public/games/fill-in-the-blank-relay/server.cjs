var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_http = __toESM(require("http"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json());
var aiClient = null;
function getGeminiClient() {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new import_genai.GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      console.log("Gemini AI Client initialized successfully.");
    } catch (e) {
      console.error("Failed to initialize Gemini Client:", e);
    }
  }
  return aiClient;
}
async function checkExternalWordNet() {
  return new Promise((resolve) => {
    const req = import_http.default.get("http://127.0.0.1:8788/api/vocab/health", (res) => {
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(500, () => {
      req.destroy();
      resolve(false);
    });
  });
}
async function proxyToWordNet(pathStr, res) {
  const url = `http://127.0.0.1:8788${pathStr}`;
  const req = import_http.default.get(url, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(res);
  });
  req.on("error", (err) => {
    res.status(502).json({ error: "Proxy failed", message: err.message });
  });
  req.setTimeout(2e3, () => {
    req.destroy();
    res.status(504).json({ error: "Proxy timeout" });
  });
}
var FALLBACK_WORDS = [
  {
    word: "ephemeral",
    definition: "lasting for a very short time; transient or fleeting",
    difficulty: "hard",
    category: "vocabulary",
    synonyms: ["transitory", "fleeting", "temporary", "evanescent"],
    antonyms: ["eternal", "perpetual", "lasting", "permanent"],
    example: "The beauty of the cherry blossoms is ephemeral, lasting only a few precious days before they fall."
  },
  {
    word: "cacophony",
    definition: "a harsh, discordant mixture of sounds",
    difficulty: "medium",
    category: "vocabulary",
    synonyms: ["din", "racket", "uproar", "clamor"],
    antonyms: ["harmony", "euphony", "silence", "peace"],
    example: "A cacophony of car horns and shouting construction workers filled the busy city street."
  },
  {
    word: "ameliorate",
    definition: "make something bad or unsatisfactory better",
    difficulty: "hard",
    category: "vocabulary",
    synonyms: ["improve", "better", "enhance", "alleviate"],
    antonyms: ["worsen", "exacerbate", "aggravate"],
    example: "The governor proposed several reform programs to ameliorate the crowded housing conditions."
  },
  {
    word: "ubiquitous",
    definition: "present, appearing, or found everywhere",
    difficulty: "medium",
    category: "vocabulary",
    synonyms: ["omnipresent", "pervasive", "everywhere", "rife"],
    antonyms: ["rare", "scarce", "infrequent", "isolated"],
    example: "Mobile phones have become ubiquitous in modern society, carried by almost every individual."
  },
  {
    word: "loquacious",
    definition: "tending to talk a great deal; extremely talkative",
    difficulty: "hard",
    category: "vocabulary",
    synonyms: ["talkative", "garrulous", "chatty", "verbose"],
    antonyms: ["taciturn", "silent", "reserved", "quiet"],
    example: "Normally taciturn, the wine made the professor unusually loquacious and storytelling."
  },
  {
    word: "superfluous",
    definition: "unnecessary, especially through being more than enough",
    difficulty: "medium",
    category: "vocabulary",
    synonyms: ["redundant", "excess", "spare", "extra"],
    antonyms: ["essential", "necessary", "required", "scarce"],
    example: "Avoid writing superfluous details in your summary to keep it clean and scannable."
  },
  {
    word: "mitigate",
    definition: "make less severe, serious, or painful",
    difficulty: "light",
    category: "vocabulary",
    synonyms: ["allay", "alleviate", "soften", "moderate"],
    antonyms: ["increase", "intensify", "aggravate", "provoke"],
    example: "We took several detours along the way to mitigate the heavy commuter traffic."
  },
  {
    word: "resilient",
    definition: "able to withstand or recover quickly from difficult conditions",
    difficulty: "light",
    category: "vocabulary",
    synonyms: ["hardy", "tough", "strong", "flexible"],
    antonyms: ["frail", "delicate", "sensitive", "vulnerable"],
    example: "The local economy proved surprisingly resilient, bouncing back stronger following the recession."
  },
  {
    word: "fastidious",
    definition: "very attentive to and concerned about accuracy and detail",
    difficulty: "medium",
    category: "vocabulary",
    synonyms: ["scrupulous", "meticulous", "painstaking", "fussy"],
    antonyms: ["sloppy", "careless", "negligent", "easygoing"],
    example: "The dental hygienist was fastidious about sanitizing the instrument trays."
  },
  {
    word: "sagacious",
    definition: "having or showing keen mental discernment and good judgment; shrewd",
    difficulty: "devilish",
    category: "vocabulary",
    synonyms: ["wise", "shrewd", "clever", "astute"],
    antonyms: ["foolish", "daft", "dim-witted", "unwise"],
    example: "His sagacious business choices over thirty years produced a vast economic reserve."
  }
];
app.get("/api/vocab/health", async (req, res) => {
  const externalOk = await checkExternalWordNet();
  res.json({
    ok: true,
    service: "vocab-relay-bridge",
    timestamp: Date.now(),
    externalWordNetConnection: externalOk ? "connected" : "simulation-fallback-active",
    geminiStatus: getGeminiClient() ? "configured" : "not-configured"
  });
});
app.get("/api/vocab/random", async (req, res) => {
  const externalOk = await checkExternalWordNet();
  if (externalOk) {
    return proxyToWordNet(req.originalUrl, res);
  }
  const difficulty = req.query.difficulty || "medium";
  const filterWords = FALLBACK_WORDS.filter((w) => w.difficulty === difficulty);
  const selection = filterWords.length > 0 ? filterWords : FALLBACK_WORDS;
  const word = selection[Math.floor(Math.random() * selection.length)];
  res.json({
    ok: true,
    source: "simulation",
    word: {
      word: word.word,
      definition: word.definition,
      difficulty: word.difficulty,
      synonyms: word.synonyms,
      antonyms: word.antonyms,
      example: word.example
    }
  });
});
app.get("/api/vocab/details", async (req, res) => {
  const externalOk = await checkExternalWordNet();
  if (externalOk) {
    return proxyToWordNet(req.originalUrl, res);
  }
  const queryWord = (req.query.word || "").toLowerCase().trim();
  const match = FALLBACK_WORDS.find((w) => w.word === queryWord);
  if (match) {
    return res.json({
      ok: true,
      word: match
    });
  }
  const ai = getGeminiClient();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Analyze the english word "${queryWord}" and provide its definition, difficulty ('light' | 'medium' | 'hard' | 'devilish'), typical academic synonyms, antonyms, and a clear example sentence. Output as a JSON block matching the response schema.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.OBJECT,
            properties: {
              word: { type: import_genai.Type.STRING },
              definition: { type: import_genai.Type.STRING },
              difficulty: { type: import_genai.Type.STRING, description: "Must be light, medium, hard, or devilish" },
              synonyms: { type: import_genai.Type.ARRAY, items: { type: import_genai.Type.STRING } },
              antonyms: { type: import_genai.Type.ARRAY, items: { type: import_genai.Type.STRING } },
              example: { type: import_genai.Type.STRING }
            },
            required: ["word", "definition", "difficulty", "synonyms", "antonyms", "example"]
          }
        }
      });
      const parsed = JSON.parse(response.text?.trim() || "{}");
      return res.json({
        ok: true,
        word: parsed
      });
    } catch (err) {
      console.error("Gemini word details lookup failed:", err);
    }
  }
  res.status(404).json({
    ok: false,
    message: "Word not found in core dictionary."
  });
});
app.get("/api/vocab/validate", async (req, res) => {
  const externalOk = await checkExternalWordNet();
  if (externalOk) {
    return proxyToWordNet(req.originalUrl, res);
  }
  const queryWord = (req.query.word || "").toLowerCase().trim();
  const exists = FALLBACK_WORDS.some((w) => w.word === queryWord);
  if (exists) {
    return res.json({ ok: true, exists: true });
  }
  const ai = getGeminiClient();
  if (ai) {
    try {
      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Is the string "${queryWord}" a valid English vocabulary dictionary word? Respond only with true or false in a JSON object.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.OBJECT,
            properties: {
              valid: { type: import_genai.Type.BOOLEAN }
            },
            required: ["valid"]
          }
        }
      });
      const parsed = JSON.parse(result.text?.trim() || "{}");
      return res.json({ ok: true, exists: !!parsed.valid });
    } catch (e) {
    }
  }
  res.json({ ok: true, exists: queryWord.length > 2 });
});
app.get("/api/vocab/generate", async (req, res) => {
  const count = parseInt(req.query.count) || 3;
  const difficulty = req.query.difficulty || "medium";
  const category = req.query.category || "vocabulary";
  const ai = getGeminiClient();
  if (ai) {
    try {
      const prompt = `Generate exactly ${count} educational "Fill-in-the-Blank" multiple choice questions.
      The difficulty should be equivalent to "${difficulty}".
      The topic/category should be related to "${category}".
      Each question must have:
      - sentence: A high-quality context sentence with a blank '_______' indicating the missing word.
      - choices: Exactly 4 choices.
      - correctAnswer: The single correct choice which is a fitting dictionary word.
      - explanation: A concise explanation of why it is correct and what the word means.
      - difficulty: "${difficulty}"
      - category: "${category}"
      
      Output strictly as a valid JSON array of question objects. Ensure spelling and grammar are impeccable.`;
      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.ARRAY,
            items: {
              type: import_genai.Type.OBJECT,
              properties: {
                sentence: { type: import_genai.Type.STRING },
                choices: { type: import_genai.Type.ARRAY, items: { type: import_genai.Type.STRING } },
                correctAnswer: { type: import_genai.Type.STRING },
                explanation: { type: import_genai.Type.STRING },
                difficulty: { type: import_genai.Type.STRING },
                category: { type: import_genai.Type.STRING }
              },
              required: ["sentence", "choices", "correctAnswer", "explanation", "difficulty", "category"]
            }
          }
        }
      });
      const parsed = JSON.parse(result.text?.trim() || "[]");
      if (Array.isArray(parsed) && parsed.length > 0) {
        return res.json({
          ok: true,
          questions: parsed
        });
      }
    } catch (err) {
      console.error("Gemini question generation error:", err);
    }
  }
  const selectFallback = FALLBACK_WORDS.map((w) => {
    const blankSentence = w.example.replace(new RegExp(`\\b${w.word}\\b`, "gi"), "_______");
    const distractors = FALLBACK_WORDS.filter((x) => x.word !== w.word).map((x) => x.word);
    const shuffledDistractors = distractors.sort(() => 0.5 - Math.random()).slice(0, 3);
    const choices = [w.word, ...shuffledDistractors].sort(() => 0.5 - Math.random());
    return {
      sentence: blankSentence,
      choices,
      correctAnswer: w.word,
      explanation: `"${w.word}" means: ${w.definition}.`,
      difficulty,
      category
    };
  });
  res.json({
    ok: true,
    questions: selectFallback.slice(0, count)
  });
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware configured.");
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
    console.log("Serving production static assets.");
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server is up and listening on port ${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
