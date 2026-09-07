const express = require('express');
const { getConversations, postConversation } = require('../controllers/chatController');

const router = express.Router();

router.get('/conversations', getConversations);
router.post('/conversations', postConversation);

module.exports = router;
