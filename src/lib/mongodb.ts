import { MongoClient, MongoClientOptions } from "mongodb";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const uri = process.env.MONGODB_URI!;

// Optimized connection options for better performance
const options: MongoClientOptions = {
  // Connection pool settings
  maxPoolSize: 10, // Maximum number of connections in the pool
  minPoolSize: 2, // Keep minimum connections open
  maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity

  // Performance settings
  compressors: ["snappy", "zlib"], // Enable compression to reduce network overhead

  // Timeout settings
  serverSelectionTimeoutMS: 5000, // Fail fast if server is unavailable
  socketTimeoutMS: 45000, // Socket timeout
  connectTimeoutMS: 10000, // Connection timeout

  // Retry settings
  retryWrites: true, // Retry failed writes
  retryReads: true, // Retry failed reads
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!process.env.MONGODB_URI) {
  console.error("MongoDB URI is missing from environment variables");
  throw new Error("Please add your Mongo URI to .env.local");
}

if (process.env.NODE_ENV === "development") {
  // In development, use a global variable to preserve connection across HMR
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect().catch((error) => {
      console.error("MongoDB connection error (development):", error);
      throw error;
    });
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production, create a new client for each deployment
  client = new MongoClient(uri, options);
  clientPromise = client.connect().catch((error) => {
    console.error("MongoDB connection error (production):", error);
    throw error;
  });
}

export default clientPromise;
