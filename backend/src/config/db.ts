import mongoose from 'mongoose';
import { config } from './env.js';

function redactMongoUri(uri: string) {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
}

export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  console.log(`Connecting to MongoDB at ${redactMongoUri(config.mongodbUri)}...`);

  const options: mongoose.ConnectOptions = {
    serverSelectionTimeoutMS: 15000,
  };

  if (config.mongodbUser && config.mongodbPassword) {
    options.user = config.mongodbUser;
    options.pass = config.mongodbPassword;
    options.authSource = 'admin';
  }

  await mongoose.connect(config.mongodbUri, options);
  console.log('Connected to MongoDB.');
}

export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}
