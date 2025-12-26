/**
 * MongoDB Connection Manager
 *
 * Manages MongoDB client connection with optimized settings for production.
 *
 * WHY Connection Pooling:
 * - MongoDB connections are expensive to create (TCP handshake, auth, etc.)
 * - Connection pool reuses existing connections across requests
 * - Dramatically improves performance (10x faster than creating new connections)
 * - Prevents "too many connections" errors under load
 *
 * Connection Pool Settings:
 * - maxPoolSize: 10 connections (sufficient for most serverless environments)
 * - minPoolSize: 2 connections (keeps warm connections ready)
 * - maxIdleTimeMS: 30s (closes idle connections to save resources)
 *
 * Compression:
 * - snappy: Fast compression with good ratio (first choice)
 * - zlib: Higher compression ratio but slower (fallback)
 * - Reduces network bandwidth by 60-80%
 * - Critical for large document transfers
 *
 * Timeouts:
 * - serverSelectionTimeoutMS: 5s (fail fast if MongoDB unreachable)
 * - socketTimeoutMS: 45s (long enough for complex aggregations)
 * - connectTimeoutMS: 10s (initial connection timeout)
 *
 * Retry Logic:
 * - retryWrites: true (automatically retry failed write operations)
 * - retryReads: true (automatically retry failed read operations)
 * - Handles transient network issues gracefully
 *
 * Development vs Production:
 * - Development: Global variable preserves connection across Hot Module Reload
 * - Production: Fresh connection on each deployment (no stale connections)
 */

import { MongoClient, MongoClientOptions } from "mongodb";
import logger from "./logger";

// TypeScript global augmentation for development HMR persistence
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const uri = process.env.MONGODB_URI!;

/**
 * MongoDB Client Options - Optimized for Production Performance
 *
 * These settings balance performance, reliability, and resource usage
 */
const options: MongoClientOptions = {
  // Connection Pool: Reuses TCP connections for better performance
  // WHY 10 connections: Sufficient for serverless (Lambda, Vercel) concurrency
  maxPoolSize: 10, // Maximum concurrent connections
  minPoolSize: 2, // Keep 2 connections warm (reduces cold start latency)
  maxIdleTimeMS: 30000, // Close idle connections after 30s (saves resources)

  // Compression: Reduces network bandwidth by 60-80%
  // WHY snappy first: 10x faster than zlib with good compression ratio
  compressors: ["snappy", "zlib"],

  // Timeouts: Balance between responsiveness and reliability
  serverSelectionTimeoutMS: 5000, // Fail fast if MongoDB unreachable (5s)
  socketTimeoutMS: 45000, // Long enough for complex aggregations (45s)
  connectTimeoutMS: 10000, // Initial connection timeout (10s)

  // Retry Logic: Handles transient network failures
  // WHY retry: Network blips shouldn't fail requests
  retryWrites: true, // Automatically retry failed write operations
  retryReads: true, // Automatically retry failed read operations
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// Check if we're in build phase - skip MongoDB connection during static build
const isBuildTime = process.env.NEXT_PHASE === "phase-production-build";

// Environment validation - Fail fast if MongoDB URI missing (except during build)
if (!process.env.MONGODB_URI && !isBuildTime) {
  logger.error("MongoDB URI is missing from environment variables", null, {
    context: "mongodb-init",
  });
  throw new Error("Please add your Mongo URI to .env.local");
}

if (isBuildTime || !process.env.MONGODB_URI) {
  // Build Time: Create a dummy promise that won't actually connect
  // This prevents import errors during static page generation
  clientPromise = new Promise((resolve) => {
    // Return a mock client that will never be called during build
    resolve({} as MongoClient);
  });
} else if (process.env.NODE_ENV === "development") {
  // Development Mode: Preserve connection across Hot Module Reload
  // WHY global variable: Next.js HMR re-imports modules, would create new connections
  // Without this, each HMR would leak connections until pool exhausted
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect().catch((error) => {
      logger.error("MongoDB connection error (development)", error, {
        context: "mongodb-connect-dev",
      });
      throw error;
    });
  }
  clientPromise = global._mongoClientPromise;
} else {
  // Production Mode: Fresh connection on each deployment
  // WHY no global: Production deployments start fresh, no HMR
  // Prevents stale connections from previous deployments
  client = new MongoClient(uri, options);
  clientPromise = client.connect().catch((error) => {
    logger.error("MongoDB connection error (production)", error, {
      context: "mongodb-connect-prod",
    });
    throw error;
  });
}

export default clientPromise;
