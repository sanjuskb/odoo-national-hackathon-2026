const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { env } = require('./config/env');
const requestLogger = require('./middleware/requestLogger');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const apiRoutes = require('./routes');

const app = express();

// ---------------------------------------------------------------------------
// Security & Foundation Middleware
// ---------------------------------------------------------------------------
app.use(helmet());

app.use(
  cors({
    origin: env.CORS_ORIGIN || 'http://localhost:5173',
  })
);

app.use(express.json({ limit: '100kb' }));

app.use(requestLogger);

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------
app.use('/api/v1', apiRoutes);

// ---------------------------------------------------------------------------
// Fallback 404 & Global Error Handling
// ---------------------------------------------------------------------------
app.use(notFound);
app.use(errorHandler);

module.exports = app;
