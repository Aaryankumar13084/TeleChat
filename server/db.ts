import mongoose from 'mongoose';
import { log } from './vite';

// MongoDB connection URL from environment variable
const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
  log('No MongoDB URI provided. Using in-memory storage instead.', 'database');
}

// Connect to MongoDB
export const connectToMongoDB = async (): Promise<void> => {
  if (!MONGODB_URI) {
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI);
    log('Connected to MongoDB successfully', 'database');
  } catch (error) {
    log(`Error connecting to MongoDB: ${error}`, 'database');
    throw error;
  }
};

// Close MongoDB connection
export const closeMongoDB = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    log('MongoDB connection closed', 'database');
  }
};

// Check if MongoDB is connected
export const isMongoDBConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};