'use strict';

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const { synthesizeSpeech, listVoices, dryRunTwilioCall } = require('../services/aiVoice.service');
const { sendSuccess } = require('../utils/response');

// GET /api/v1/voice/voices - List Murf voices
router.get('/voices', authenticate, async (req, res, next) => {
  try {
    const voices = await listVoices();
    return sendSuccess(res, { voices }, 'Murf voices retrieved successfully');
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/voice/synthesize - Text to speech via live Murf
router.post('/synthesize', authenticate, async (req, res, next) => {
  try {
    const { text, voice_id } = req.body;
    const result = await synthesizeSpeech(text, voice_id);
    return sendSuccess(res, result, 'Voice audio generated successfully', 201);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/voice/call/dry-run - Safe Twilio verification test
router.post('/call/dry-run', authenticate, requireRole(['admin', 'staff']), (req, res) => {
  const { phone_number, message } = req.body;
  const result = dryRunTwilioCall(phone_number, message);
  return sendSuccess(res, result, 'Telephony dry-run executed successfully');
});

module.exports = router;

