const express = require('express');
const { logger } = require('@librechat/data-schemas');
const {
  createCanvasDocument,
  getCanvasDocumentById,
  getCanvasDocumentsByConvo,
  updateCanvasDocument,
  deleteCanvasDocumentById,
  deleteCanvasDocuments,
} = require('~/models/CanvasDocument');
const { requireJwtAuth } = require('~/server/middleware');

const router = express.Router();

router.use(requireJwtAuth);

/**
 * GET /conversation/:conversationId
 * Retrieves all canvas documents for a conversation
 */
router.get('/conversation/:conversationId', async (req, res) => {
  try {
    const documents = await getCanvasDocumentsByConvo(
      req.params.conversationId,
      req.user.id,
    );
    res.status(200).json({ documents });
  } catch (error) {
    logger.error('Error getting canvas documents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /:id
 * Retrieves a single canvas document by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const document = await getCanvasDocumentById(req.params.id, req.user.id);
    if (document) {
      res.status(200).json(document);
    } else {
      res.status(404).json({ error: 'Document not found' });
    }
  } catch (error) {
    logger.error('Error getting canvas document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /
 * Creates a new canvas document
 */
router.post('/', async (req, res) => {
  try {
    const { title, content, conversationId, messageId } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const document = await createCanvasDocument({
      title,
      content,
      conversationId: conversationId || '',
      messageId: messageId || '',
      user: req.user.id,
    });

    res.status(201).json(document);
  } catch (error) {
    logger.error('Error creating canvas document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /:id
 * Updates an existing canvas document
 */
router.put('/:id', async (req, res) => {
  try {
    const { title, content } = req.body;

    const updateData = {};
    if (title !== undefined) {
      updateData.title = title;
    }
    if (content !== undefined) {
      updateData.content = content;
    }

    const document = await updateCanvasDocument(
      req.params.id,
      req.user.id,
      updateData,
    );

    if (document) {
      res.status(200).json(document);
    } else {
      res.status(404).json({ error: 'Document not found' });
    }
  } catch (error) {
    logger.error('Error updating canvas document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /:id
 * Deletes a single canvas document
 */
router.delete('/:id', async (req, res) => {
  try {
    const document = await deleteCanvasDocumentById(req.params.id, req.user.id);
    if (document) {
      res.status(200).json({ message: 'Document deleted successfully' });
    } else {
      res.status(404).json({ error: 'Document not found' });
    }
  } catch (error) {
    logger.error('Error deleting canvas document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /conversation/:conversationId
 * Deletes all canvas documents for a conversation
 */
router.delete('/conversation/:conversationId', async (req, res) => {
  try {
    const result = await deleteCanvasDocuments(
      req.user.id,
      req.params.conversationId,
    );
    res.status(200).json({
      message: 'Documents deleted successfully',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    logger.error('Error deleting canvas documents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
