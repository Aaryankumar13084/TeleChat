import mongoose from 'mongoose';
import { log } from './vite';

// MongoDB connection URI from environment variables
const MONGODB_URI = process.env.MONGODB_URI;

/**
 * Connect to MongoDB
 */
export const connectToMongoDB = async (): Promise<void> => {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }
  
  try {
    await mongoose.connect(MONGODB_URI);
    log('Connected to MongoDB', 'database');
  } catch (error) {
    log(`MongoDB connection error: ${error}`, 'database');
    throw error;
  }
};

/**
 * Close MongoDB connection
 */
export const closeMongoDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    log('Disconnected from MongoDB', 'database');
  } catch (error) {
    log(`MongoDB disconnection error: ${error}`, 'database');
  }
};

/**
 * Check if MongoDB is connected
 */
export const isMongoDBConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};