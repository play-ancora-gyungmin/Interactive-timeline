import express from 'express';

export const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({ ok: true });
});

export default router;
