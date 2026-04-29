import express from 'express';
import { handleInput } from '../controllers/businessController.js';

const router = express.Router();

router.post('/input', handleInput);

export default router;