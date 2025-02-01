const mongoose = require('mongoose');
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, required: true},
  createdAt: {type: Date, default: Date.now},
  isBlocked: { type: Boolean, default: false },
});

module.exports = mongoose.model("Category", categorySchema);
