const bannerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    image: { type: Buffer, required: true },
    starting_date: { type: Date, required: true },
    ending_date: { type: Date, required: true }
  });
  
  module.exports = mongoose.model('Banner', bannerSchema);