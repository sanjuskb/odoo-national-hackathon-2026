const express = require('express');
const router = express.Router();

// GET /api/v1/health
router.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
    message: 'OK',
    errors: null,
  });
});

module.exports = router;
