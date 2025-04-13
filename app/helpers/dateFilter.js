// helpers/dateFilter.js

/**
 * Determines the start and end dates based on the query parameters.
 * When `defaultDaily` is true (for PDF/Excel exports), a default daily range is set if none is provided.
 *
 * @param {object} query - The request query parameters.
 * @param {boolean} defaultDaily - Whether to default to daily range if no range is provided.
 * @returns {object|null} An object with start and end Date values, or null if no range was provided.
 */
function determineDateRange(query, defaultDaily = false) {
    const { startDate, endDate, reportType } = query;
    const today = new Date();
    let dateRange = null;
  
    if (reportType) {
      if (reportType === 'daily') {
        dateRange = {
          start: new Date(today.setHours(0, 0, 0, 0)),
          end: new Date(new Date().setHours(23, 59, 59, 999))
        };
      } else if (reportType === 'weekly') {
        // Reset today's time to avoid shifting if subtracting days
        const now = new Date();
        dateRange = {
          start: new Date(new Date().setDate(now.getDate() - 7)),
          end: now
        };
      } else if (reportType === 'yearly') {
        const now = new Date();
        dateRange = {
          start: new Date(now.getFullYear(), 0, 1),
          end: new Date(now.getFullYear(), 11, 31)
        };
      } else if (reportType === 'custom') {
        if (startDate && endDate) {
          dateRange = { start: new Date(startDate), end: new Date(endDate) };
        } else if (defaultDaily) {
          // For exports, require both start and end dates for a custom report.
          throw new Error("Please provide startDate and endDate for custom report");
        }
      } else {
        // If reportType is provided but not one of the expected values,
        // use startDate and endDate if provided or default to daily when needed.
        if (startDate && endDate) {
          dateRange = { start: new Date(startDate), end: new Date(endDate) };
        } else if (defaultDaily) {
          dateRange = {
            start: new Date(new Date().setHours(0, 0, 0, 0)),
            end: new Date(new Date().setHours(23, 59, 59, 999))
          };
        }
      }
    } else if (startDate && endDate) {
      dateRange = { start: new Date(startDate), end: new Date(endDate) };
    } else if (defaultDaily) {
      dateRange = {
        start: new Date(new Date().setHours(0, 0, 0, 0)),
        end: new Date(new Date().setHours(23, 59, 59, 999))
      };
    }
  
    return dateRange;
  }
  
  /**
   * Builds the filter object for the MongoDB query using the given dateRange.
   *
   * @param {object|null} dateRange - Object with start and end Date, or null.
   * @param {object} additional - Any additional filtering to be merged.
   * @returns {object} The filter object.
   */
  function buildFilter(dateRange, additional = {}) {
    let filter = { ...additional };
    if (dateRange) {
      filter.timestamp = { $gte: dateRange.start, $lte: dateRange.end };
    }
    return filter;
  }
  
  module.exports = { determineDateRange, buildFilter };
  