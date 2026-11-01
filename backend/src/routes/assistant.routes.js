'use strict';

const express = require('express');
const router = express.Router();
const assistantController = require('../controllers/assistant.controller');

// POST /api/v1/assistant/chat (Public or Authenticated)
router.post('/chat', assistantController.handleChat);

module.exports = router;

