const Feedback = require('../models/feedbackModel');
const logger = require('../utils/logger');

/**
 * Service to handle feedback operations
 */
class FeedbackService {
  /**
   * Save feedback to the database
   * @param {Object} feedbackData - The feedback data
   * @returns {Promise<Object>} - The saved feedback document
   */
  static async saveFeedback(feedbackData) {
    try {
      const feedback = new Feedback(feedbackData);
      return await feedback.save();
    } catch (error) {
      logger.error('Error saving feedback:', error);
      throw new Error('Failed to save feedback data');
    }
  }

  /**
   * Get all feedback entries
   * @returns {Promise<Array>} - Array of feedback documents
   */
  static async getAllFeedback() {
    return await Feedback.find().sort({ createdAt: -1 });
  }

  /**
   * Get feedback by ID
   * @param {string} id - Feedback ID
   * @returns {Promise<Object>} - Feedback document
   */
  static async getFeedbackById(id) {
    return await Feedback.findById(id);
  }
}

module.exports = FeedbackService;