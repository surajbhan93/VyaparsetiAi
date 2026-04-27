import express from "express";
import rateLimit from "express-rate-limit";
import validateRequest from "../middlewares/validateRequest.js";
import validateGenerateRequest from "../middlewares/validateGenerateRequest.js";
import { replyToReview } from "../controllers/reviewController.js";
import { generateReviewsHandler } from "../controllers/reviewGeneratorController.js";

const router = express.Router();

// Rate limiter for reply endpoint (10 req/min)
const replyLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });

// Rate limiter for generate endpoint (5 req/min — AI generation is heavier)
const generateLimiter = rateLimit({ windowMs: 60 * 1000, max: 5 });

router.post("/reply", replyLimiter, validateRequest, replyToReview);
router.post("/generate", generateLimiter, validateGenerateRequest, generateReviewsHandler);

export default router;
