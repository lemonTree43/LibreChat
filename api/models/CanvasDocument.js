const { CanvasDocument } = require('~/db/models');

/**
 * Create a new canvas document
 * @param {Object} documentData - The document data
 * @returns {Promise<Object>} The created document
 */
async function createCanvasDocument(documentData) {
  try {
    return await CanvasDocument.create(documentData);
  } catch (error) {
    throw new Error(`Error creating canvas document: ${error.message}`);
  }
}

/**
 * Get a canvas document by ID
 * @param {string} id - The document ID
 * @param {string} userId - The user's ObjectId
 * @returns {Promise<Object|null>} The document or null if not found
 */
async function getCanvasDocumentById(id, userId) {
  try {
    return await CanvasDocument.findOne({ _id: id, user: userId }).lean();
  } catch (error) {
    throw new Error(`Error fetching canvas document: ${error.message}`);
  }
}

/**
 * Get canvas documents by conversation ID and user
 * @param {string} conversationId - The conversation ID
 * @param {string} userId - The user's ObjectId
 * @returns {Promise<Array>} Array of document objects
 */
async function getCanvasDocumentsByConvo(conversationId, userId) {
  try {
    return await CanvasDocument.find({ conversationId, user: userId })
      .sort({ createdAt: -1 })
      .lean();
  } catch (error) {
    throw new Error(`Error fetching canvas documents: ${error.message}`);
  }
}

/**
 * Get canvas documents by message ID and user
 * @param {string} messageId - The message ID
 * @param {string} userId - The user's ObjectId
 * @returns {Promise<Array>} Array of document objects
 */
async function getCanvasDocumentsByMessage(messageId, userId) {
  try {
    return await CanvasDocument.find({ messageId, user: userId }).lean();
  } catch (error) {
    throw new Error(`Error fetching canvas documents: ${error.message}`);
  }
}

/**
 * Update a canvas document
 * @param {string} id - The document ID
 * @param {string} userId - The user's ObjectId
 * @param {Object} updateData - The data to update
 * @returns {Promise<Object|null>} The updated document or null if not found
 */
async function updateCanvasDocument(id, userId, updateData) {
  try {
    return await CanvasDocument.findOneAndUpdate(
      { _id: id, user: userId },
      updateData,
      { new: true },
    ).lean();
  } catch (error) {
    throw new Error(`Error updating canvas document: ${error.message}`);
  }
}

/**
 * Delete canvas documents
 * @param {string} userId - The user's ObjectId
 * @param {string} [conversationId] - The conversation ID (optional)
 * @returns {Promise<Object>} The delete result
 */
async function deleteCanvasDocuments(userId, conversationId) {
  try {
    const query = { user: userId };
    if (conversationId) {
      query.conversationId = conversationId;
    }
    return await CanvasDocument.deleteMany(query);
  } catch (error) {
    throw new Error(`Error deleting canvas documents: ${error.message}`);
  }
}

/**
 * Delete a single canvas document by ID
 * @param {string} id - The document ID
 * @param {string} userId - The user's ObjectId
 * @returns {Promise<Object|null>} The deleted document or null if not found
 */
async function deleteCanvasDocumentById(id, userId) {
  try {
    return await CanvasDocument.findOneAndDelete({ _id: id, user: userId }).lean();
  } catch (error) {
    throw new Error(`Error deleting canvas document: ${error.message}`);
  }
}

module.exports = {
  createCanvasDocument,
  getCanvasDocumentById,
  getCanvasDocumentsByConvo,
  getCanvasDocumentsByMessage,
  updateCanvasDocument,
  deleteCanvasDocuments,
  deleteCanvasDocumentById,
};
