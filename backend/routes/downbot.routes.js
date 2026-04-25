import { Router } from "express";
import {
  getCompetitors,
  streamCompetitors,
  analyzeCompetitor
} from "../controllers/web/downbot.controller.js";

const router = Router();

// main routes
router.post("/competitors", getCompetitors);

router.get("/competitors", getCompetitors);
router.post("/streamCompetitors", streamCompetitors);
router.post("/analyze", analyzeCompetitor);
export default router;