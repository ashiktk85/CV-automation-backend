const mongoose = require('mongoose');


class Database {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      const mongoURI = process.env.MONGO_URI;
      
      this.connection = await mongoose.connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      console.log('MongoDB connected successfully');
      return this.connection;
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.disconnect();
        console.log('MongoDB disconnected');
      }
    } catch (error) {
      console.error('MongoDB disconnection error:', error);
      throw error;
    }
  }

  isConnected() {
    return mongoose.connection.readyState === 1;
  }
}

module.exports = Database;

