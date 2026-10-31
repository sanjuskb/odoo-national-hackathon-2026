const express = require('express');
const cors = require('cors');

const app = express();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(express.json());

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  })
);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Health check — GET /api/v1/health
app.get('/api/v1/health', (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
    message: 'OK',
    errors: null,
  });
});

// ---------------------------------------------------------------------------
// Fallback 404
// ---------------------------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    data: null,
    message: 'Resource not found',
    errors: null,
  });
});

module.exports = app;
