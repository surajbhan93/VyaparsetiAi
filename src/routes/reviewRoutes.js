import express from "express";
import rateLimit from "express-rate-limit";
import validateRequest from "../middlewares/validateRequest.js";
import { replyToReview } from "../controllers/reviewController.js";

const router = express.Router();

const limiter = rateLimit({ windowMs: 60 * 1000, max: 10 });

router.post("/", limiter, validateRequest, replyToReview);

export default router;
