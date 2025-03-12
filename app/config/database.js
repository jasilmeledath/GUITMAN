const mongoose = require('mongoose');
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const timestamp = new Date().toISOString();
    console.log('\n\x1b[36m%s\x1b[0m', '--------------------------------------------------');
    console.log(`  🗃️  DATABASE CONNECTION`);
    console.log('\x1b[36m%s\x1b[0m', '--------------------------------------------------');
    console.log(`  📅 Timestamp: \x1b[33m${timestamp}\x1b[0m`);
    console.log(`  ✅ Status:    \x1b[32mConnected successfully\x1b[0m`);
    console.log(`  🔌 Host:      \x1b[33m${process.env.DB_HOST || 'localhost:27017'}\x1b[0m`);
    console.log(`  💾 Database:  \x1b[33m${process.env.DB_NAME || 'guitman_db'}\x1b[0m`);
    console.log('\x1b[36m%s\x1b[0m', '--------------------------------------------------\n');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};
module.exports = connectDB;