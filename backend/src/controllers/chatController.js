const conversationService = require('../services/conversationService');
const aiService = require('../services/aiService');

const MAX_QUESTION_LENGTH = 65535;

async function getConversations(req, res) {
  try {
    const conversations = await conversationService.getConversationHistory();
    return res.status(200).json({
      success: true,
      message: 'Conversations fetched successfully.',
      data: { conversations },
    });
  } catch (err) {
    console.error('getConversations error:', err);
    return res.status(500).json({
      status: false,
      message: 'Something went wrong try again later',
    });
  }
}

async function postConversation(req, res) {
  const { question } = req.body || {};

  // --- Validation ---
  if (question === undefined || question === null || typeof question !== 'string') {
    return res.status(400).json({ status: false, message: 'question is required' });
  }

  const trimmedQuestion = question.trim();

  if (trimmedQuestion.length === 0) {
    return res.status(400).json({ status: false, message: 'question is required' });
  }

  if (trimmedQuestion.length > MAX_QUESTION_LENGTH) {
    return res.status(400).json({ status: false, message: 'question is too long' });
  }

  let userConversation;

  try {
    // 1. Load prior history (latest 5, chronological) for AI context, BEFORE inserting
    //    the new question, per the documented service flow.
    const history = await conversationService.getRecentHistoryForAi();

    // 2. Save the user's question.
    userConversation = await conversationService.insertMessage({
      role: 'user',
      content: trimmedQuestion,
      tokenCount: 0,
    });

    // 3. Ask the AI provider for an answer, using the history + new question.
    const { answer, tokenCount } = await aiService.getAssistantResponse(history, trimmedQuestion);

    if (!answer) {
      return res.status(500).json({
        status: false,
        message: 'The model returned an empty answer',
      });
    }

    // 4. Save the assistant's answer.
    const assistantConversation = await conversationService.insertMessage({
      role: 'assistant',
      content: answer,
      tokenCount: tokenCount || 0,
    });

    // 5. Return both saved rows.
    return res.status(201).json({
      success: true,
      message: 'Conversation posted successfully.',
      data: { userConversation, assistantConversation },
    });
  } catch (err) {
    console.error('postConversation error:', err);

    // If the AI call failed after the user's question was already saved,
    // clean it up so we don't leave an orphaned message with no reply.
    if (userConversation?.id) {
      try {
        await conversationService.deleteMessage(userConversation.id);
      } catch (cleanupErr) {
        console.error('Failed to clean up orphaned user message:', cleanupErr);
      }
    }

    if (err.code === 'AI_NOT_CONFIGURED') {
      return res.status(500).json({
        status: false,
        message: 'AI provider API key is not configured.',
      });
    }

    if (err.code === 'AI_REQUEST_FAILED' && (err.status === 503 || err.status === 429)) {
      return res.status(503).json({
        status: false,
        message: 'The AI is experiencing high demand right now. Please try again in a moment.',
      });
    }

    if (err.code === 'AI_NETWORK_ERROR') {
      return res.status(502).json({
        status: false,
        message: 'Could not reach the AI provider. Please try again.',
      });
    }

    return res.status(500).json({
      status: false,
      message: 'Something went wrong try again later',
    });
  }
}

module.exports = { getConversations, postConversation };