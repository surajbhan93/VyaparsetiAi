import { execFile } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import axios from "axios";
import PQueue from "p-queue";

// 🔥 Queue (IMPORTANT)
const queue = new PQueue({
  concurrency: 2, // max 2 python at a time
  timeout: 180000, // 3 min
  throwOnTimeout: true
});
// ──────────────────────────────────────────────
// Config
// ──────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.join(process.cwd(), "python", "competitors.py");

const PYTHON_BIN = process.env.PYTHON_BIN || "python3";
const PROC_TIMEOUT = 240_000;        // 2 min — selenium + clicks need time
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const CACHE_MAX_KEYS = 200;

// ──────────────────────────────────────────────
// In-memory Cache
// ──────────────────────────────────────────────
const _cache = new Map();

function cacheKey(...parts) {
  return crypto
    .createHash("md5")
    .update(parts.join("|").toLowerCase())
    .digest("hex");
}

function cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    _cache.delete(key);
    return null;
  }
  return entry.data;
}

function cacheSet(key, data) {
  if (_cache.size >= CACHE_MAX_KEYS) {
    // evict oldest
    const oldest = _cache.keys().next().value;
    _cache.delete(oldest);
  }
  _cache.set(key, { data, expiry: Date.now() + CACHE_TTL_MS });
}

// ──────────────────────────────────────────────
// Input Validation
// ──────────────────────────────────────────────

// Allow letters (Latin + Devanagari), digits, spaces, and basic punctuation
const SAFE_STRING = /^[a-zA-Z0-9\u0900-\u097F\s,.\-'&()]+$/u;

function validateInput(value, fieldName) {
  if (!value || typeof value !== "string") {
    return `${fieldName} is required`;
  }
  const v = value.trim();
  if (!v) return `${fieldName} cannot be empty`;
  if (v.length > 100) return `${fieldName} is too long (max 100 chars)`;
  if (!SAFE_STRING.test(v)) return `${fieldName} contains invalid characters`;
  return null;
}

// ──────────────────────────────────────────────
// Python Runner
// ──────────────────────────────────────────────
function runPython(args) {
  return new Promise((resolve, reject) => {
    const proc = execFile(PYTHON_BIN, [SCRIPT_PATH, ...args], {
      timeout: PROC_TIMEOUT,
      maxBuffer: 10 * 1024 * 1024,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d) => (stdout += d));
    proc.stderr.on("data", (d) => (stderr += d));

    proc.on("close", (code, signal) => {
      // 🔥 handle null code
      if (code !== 0) {
        return reject(
          new Error(
            `Python failed | code: ${code} | signal: ${signal} | stderr: ${stderr.slice(0, 300)}`
          )
        );
      }

      // 🔥 empty output check
      if (!stdout.trim()) {
        return reject(new Error("Python returned empty output"));
      }

      resolve(stdout.trim());
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to start Python: ${err.message}`));
    });
  });
}

// ──────────────────────────────────────────────
// Parse Python Output
// ──────────────────────────────────────────────
function parsePythonOutput(stdout) {
  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new Error("Python returned non-JSON output");
  }

  // Python script may return { success, competitors } or a plain array
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.competitors)) return parsed.competitors;
  if (parsed && parsed.error) throw new Error(`Script error: ${parsed.error}`);

  throw new Error("Unexpected output format from Python script");
}

// ──────────────────────────────────────────────
// Enrich / Normalize each competitor record
// ──────────────────────────────────────────────
function normalizeCompetitor(raw) {
  return {
    name:         (raw.name || "").trim() || null,
    rating:       raw.rating ?? null,
    review_count: raw.review_count ?? null,
    category:     (raw.category || "").trim() || null,
    address:      (raw.address || "").trim() || null,
    phone:        raw.phone ?? null,
    website:      raw.website ?? null,
    hours:        raw.hours ?? null,
    maps_url:     raw.maps_url ?? null,
    source:       raw.source || "google_maps",
  };
}

// ──────────────────────────────────────────────
// MAIN CONTROLLER
// ──────────────────────────────────────────────
export const getCompetitors = async (req, res) => {
  const start = Date.now();

  const raw = req.method === "GET" ? req.query : req.body;

  const city    = (raw.city    || "").trim();
  const keyword = (raw.keyword || "").trim();

  // Validate
  const err1 = validateInput(city,    "city");
  const err2 = validateInput(keyword, "keyword");

  if (err1 || err2) {
    return res.status(400).json({
      success: false,
      errors: [err1, err2].filter(Boolean),
    });
  }

  // Cache hit
  const ck     = cacheKey(city, keyword);
  const cached = cacheGet(ck);

  if (cached) {
    return res.json({
      success: true,
      cached:  true,
      count:   cached.length,
      competitors: cached,
      meta: { city, keyword },
    });
  }

  // Run Python
let stdout;

try {
  stdout = await queue.add(() => runPython([city, keyword]));
} catch (err) {
  console.error("[Queue] Python error:", err.message);

  return res.json({
    success: false,
    queued: true,
    error: "Server busy, try again",
  });
}

  // Parse output
  let competitors;
  try {
    const raw_list = parsePythonOutput(stdout);
    competitors    = raw_list.map(normalizeCompetitor).filter((c) => c.name);
  } catch (err) {
    console.error("[competitors] Parse error:", err.message, "\nRaw:", stdout.slice(0, 300));
    return res.status(500).json({
      success: false,
      error:  "Failed to parse scraper output",
      detail: err.message,
    });
  }

  // Store in cache
  cacheSet(ck, competitors);

  return res.json({
    success:     true,
    cached:      false,
    count:       competitors.length,
    competitors,
    meta: {
      city,
      keyword,
      duration_ms: Date.now() - start,
    },
  });
};

export const streamCompetitors = async (req, res) => {
  const { city, keyword } = req.query;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const proc = execFile(PYTHON_BIN, [SCRIPT_PATH, city, keyword]);

    proc.stdout.on("data", (chunk) => {
      const text = chunk.toString();

      // 🔥 assume each line = 1 competitor JSON
      text.split("\n").forEach(line => {
        if (line.trim()) {
          res.write(`data: ${line}\n\n`);
        }
      });
    });

    proc.on("close", () => {
      res.write("event: end\ndata: done\n\n");
      res.end();
    });

  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
};

// controllers/downbot.controller.js
// import axios from "axios";
// import axios from "axios";

export const analyzeCompetitor = async (req, res) => {
  try {
    const { competitor } = req.body;

    if (!competitor) {
      return res.status(400).json({
        success: false,
        message: "Competitor data required"
      });
    }

    const { name = "", rating = 0, review_count = 0 } = competitor;

    const reviews = parseInt(review_count || 0);
    const ratingNum = parseFloat(rating || 0);

    // 🔑 KEYWORDS
    const keywords = name
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .split(" ")
      .filter((word) => word.length > 3);

    // ⭐ STRENGTH
    let strength = [];
    if (ratingNum >= 4.5) strength.push("high rating");
    if (reviews >= 20) strength.push("good reviews");
    if (keywords.includes("home")) strength.push("strong keyword targeting");

    // ❌ WEAKNESS
    let weakness = [];
    if (reviews < 10) weakness.push("low trust");
    if (ratingNum < 4.0) weakness.push("low rating");
    if (!keywords.includes("prayagraj")) weakness.push("missing location keyword");

    // 📊 SCORE
    let score = 0;
    score += Math.min(ratingNum * 20, 100);
    score += Math.min(reviews * 2, 40);
    if (keywords.includes("home")) score += 10;
    score = Math.min(score, 100);

    // 🤖 AI ANALYSIS
    let aiInsights = null;

    try {
      const prompt = `
Analyze this competitor and return STRICT JSON only.

Name: ${name}
Rating: ${ratingNum}
Reviews: ${reviews}

Return:
{
  "weaknesses": ["..."],
  "strategies": ["..."],
  "positioning": "..."
}
`;

      const response = await axios.post(
        "http://localhost:3001/v1/chat/completions",
        {
          model: "auto",
          messages: [{ role: "user", content: prompt }]
        },
        {
          headers: {
            "Authorization": "freellmapi-3f0aad7ff20b34bee97aefcd7b05fe1e275e93b763d02a53",
            "Content-Type": "application/json"
          }
        }
      );

      const raw = response.data.choices[0].message.content;

      const match = raw.match(/\{[\s\S]*\}/);

      if (match) {
        aiInsights = JSON.parse(match[0]);
      }

    } catch (err) {
      console.log("AI failed:", err.message);
    }

    return res.json({
      success: true,
      data: {
        name,
        rating: ratingNum,
        reviews,
        keywords,
        strength,
        weakness,
        score,
        ai: aiInsights || {
          note: "AI unavailable",
          suggestion: "Increase reviews and improve SEO"
        }
      }
    });

  } catch (error) {
    console.error("Analyze Error:", error);
    res.status(500).json({
      success: false,
      message: "Analysis failed"
    });
  }
};