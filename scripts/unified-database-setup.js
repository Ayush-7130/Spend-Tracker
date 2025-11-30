/**
 * Unified Database Setup Script
 *
 * This script combines all database initialization, security setup, and index creation:
 * 1. Environment validation
 * 2. Collection creation/verification
 * 3. Comprehensive index creation (including TTL indexes)
 * 4. Security features setup (login history, security logs, sessions)
 * 5. Initial data seeding (optional)
 * 6. Database verification and statistics
 *
 * Run this once after setting up MongoDB to prepare your entire database.
 *
 * Usage:
 *   node scripts/unified-database-setup.js              # Full setup with seed data
 *   node scripts/unified-database-setup.js --no-seed    # Skip seeding data
 *   node scripts/unified-database-setup.js --force      # Force recreate existing data
 *   node scripts/unified-database-setup.js --help       # Show help
 */

const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");

// Load environment variables from .env.local or .env
const dotenv = require("dotenv");
const envLocalPath = path.resolve(process.cwd(), ".env.local");
const envPath = path.resolve(process.cwd(), ".env");

if (fs.existsSync(envLocalPath)) {
  console.log("📄 Loading environment from .env.local\n");
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  console.log("📄 Loading environment from .env\n");
  dotenv.config({ path: envPath });
} else {
  console.warn("⚠️  No .env or .env.local file found\n");
}

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = "spend-tracker";

/**
 * Comprehensive index definitions for all collections
 */
const indexes = {
  // Users Collection
  users: [
    { keys: { email: 1 }, options: { unique: true, name: "email_unique" } },
    { keys: { createdAt: -1 }, options: { name: "createdAt_desc" } },
    {
      keys: { emailVerificationToken: 1 },
      options: { name: "emailVerificationToken", sparse: true },
    },
    {
      keys: { passwordResetToken: 1 },
      options: { name: "passwordResetToken", sparse: true },
    },
  ],

  // Sessions Collection
  sessions: [
    { keys: { userId: 1, isActive: 1 }, options: { name: "userId_isActive" } },
    { keys: { refreshToken: 1 }, options: { name: "refreshToken" } },
    {
      keys: { accessToken: 1, isActive: 1 },
      options: { name: "accessToken_isActive" },
    },
    {
      keys: { expiresAt: 1 },
      options: { name: "expiresAt_ttl", expireAfterSeconds: 0 },
    },
    // CRITICAL: Compound index for efficient session refresh lookups
    {
      keys: { userId: 1, refreshToken: 1, isActive: 1 },
      options: { name: "userId_refreshToken_isActive" },
    },
    // CRITICAL: Index for finding recently refreshed sessions (race condition handling)
    {
      keys: { userId: 1, isActive: 1, lastActivityAt: -1 },
      options: { name: "userId_isActive_lastActivity" },
    },
  ],

  // Login History Collection (with TTL)
  loginHistory: [
    {
      keys: { userId: 1, timestamp: -1 },
      options: { name: "userId_timestamp" },
    },
    {
      keys: { email: 1, timestamp: -1 },
      options: { name: "email_timestamp" },
    },
    {
      keys: { timestamp: 1 },
      options: {
        name: "timestamp_ttl",
        expireAfterSeconds: 15 * 24 * 60 * 60,
      }, // 15 days
    },
  ],

  // Security Logs Collection (with TTL)
  securityLogs: [
    {
      keys: { userId: 1, timestamp: -1 },
      options: { name: "userId_timestamp" },
    },
    {
      keys: { eventType: 1, timestamp: -1 },
      options: { name: "eventType_timestamp" },
    },
    {
      keys: { timestamp: 1 },
      options: {
        name: "timestamp_ttl",
        expireAfterSeconds: 15 * 24 * 60 * 60,
      }, // 15 days
    },
  ],

  // Expenses Collection
  expenses: [
    { keys: { paidBy: 1, date: -1 }, options: { name: "paidBy_date" } },
    { keys: { category: 1 }, options: { name: "category" } },
    { keys: { date: -1 }, options: { name: "date_desc" } },
    { keys: { description: "text" }, options: { name: "description_text" } },
    { keys: { isSplit: 1 }, options: { name: "isSplit" } },
    { keys: { category: 1, date: -1 }, options: { name: "category_date" } },
    { keys: { createdAt: -1 }, options: { name: "createdAt_desc" } },
    { keys: { createdBy: 1 }, options: { name: "createdBy" } },
  ],

  // Categories Collection
  categories: [
    { keys: { name: 1 }, options: { unique: true, name: "name_unique" } },
    { keys: { createdAt: -1 }, options: { name: "createdAt_desc" } },
    { keys: { createdBy: 1 }, options: { name: "createdBy", sparse: true } },
  ],

  // Settlements Collection
  settlements: [
    { keys: { fromUser: 1, date: -1 }, options: { name: "fromUser_date" } },
    { keys: { toUser: 1, date: -1 }, options: { name: "toUser_date" } },
    { keys: { status: 1 }, options: { name: "status" } },
    { keys: { date: -1 }, options: { name: "date_desc" } },
    { keys: { expenseId: 1 }, options: { name: "expenseId", sparse: true } },
    {
      keys: { fromUser: 1, toUser: 1, status: 1 },
      options: { name: "fromUser_toUser_status" },
    },
    { keys: { createdAt: -1 }, options: { name: "createdAt_desc" } },
    { keys: { createdBy: 1 }, options: { name: "createdBy" } },
  ],

  // Notifications Collection (with TTL)
  notifications: [
    {
      keys: { userId: 1, read: 1, createdAt: -1 },
      options: { name: "userId_read_createdAt" },
    },
    {
      keys: { createdAt: -1 },
      options: { name: "createdAt_ttl", expireAfterSeconds: 2592000 },
    }, // 30 days
    {
      keys: { expiresAt: 1 },
      options: { name: "expiresAt_ttl", expireAfterSeconds: 0 },
    },
  ],
};

/**
 * Initial seed data for categories
 */
const seedCategories = [
  {
    _id: "groceries",
    name: "Groceries",
    icon: "bi-cart",
    color: "#28a745",
    subcategories: [
      "Weekly Shopping",
      "Vegetables",
      "Fruits",
      "Dairy",
      "Snacks",
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: "dining",
    name: "Dining Out",
    icon: "bi-cup-straw",
    color: "#fd7e14",
    subcategories: ["Restaurant", "Fast Food", "Cafe", "Delivery"],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: "transportation",
    name: "Transportation",
    icon: "bi-bus-front",
    color: "#0dcaf0",
    subcategories: ["Fuel", "Public Transport", "Taxi", "Parking"],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: "entertainment",
    name: "Entertainment",
    icon: "bi-film",
    color: "#6f42c1",
    subcategories: ["Movies", "Games", "Concerts", "Sports"],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: "utilities",
    name: "Utilities",
    icon: "bi-lightning",
    color: "#ffc107",
    subcategories: ["Electricity", "Water", "Internet", "Phone"],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: "shopping",
    name: "Shopping",
    icon: "bi-bag",
    color: "#e83e8c",
    subcategories: ["Clothing", "Electronics", "Home", "Personal Care"],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

/**
 * Initial seed data for users
 */
async function getSeedUsers() {
  const passwordHash = await bcrypt.hash("password123", 12);

  return [
    {
      _id: "saket",
      email: "saket@example.com",
      name: "Saket",
      passwordHash: passwordHash,
      role: "user",
      isEmailVerified: true,
      mfaEnabled: false,
      accountLocked: false,
      failedLoginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: "ayush",
      email: "ayush@example.com",
      name: "Ayush",
      passwordHash: passwordHash,
      role: "user",
      isEmailVerified: true,
      mfaEnabled: false,
      accountLocked: false,
      failedLoginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
}

/**
 * Check environment configuration
 */
function checkEnvironment() {
  console.log("🔍 Checking environment configuration...\n");

  if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI not found in environment variables\n");
    console.error("Please create a .env.local file with:\n");
    console.error(
      'MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/spend-tracker"'
    );
    console.error('JWT_SECRET="your-secret-key"');
    console.error('RESEND_API_KEY="your-resend-api-key" (optional)\n');
    return false;
  }

  console.log("✅ MONGODB_URI is configured");

  if (!process.env.JWT_SECRET) {
    console.warn("⚠️  JWT_SECRET not found - authentication will not work");
  } else {
    console.log("✅ JWT_SECRET is configured");
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn("⚠️  RESEND_API_KEY not found - email features disabled");
  } else {
    console.log("✅ RESEND_API_KEY is configured");
  }

  console.log("");
  return true;
}

/**
 * Create or verify collections exist
 */
async function createCollections(db) {
  console.log("📦 Creating/verifying collections...\n");

  const collections = [
    "users",
    "sessions",
    "loginHistory",
    "securityLogs",
    "notifications",
    "expenses",
    "categories",
    "settlements",
  ];

  let createdCount = 0;
  let existingCount = 0;

  for (const collectionName of collections) {
    const exists = await db.listCollections({ name: collectionName }).hasNext();
    if (!exists) {
      await db.createCollection(collectionName);
      console.log(`  ✓ Created: ${collectionName}`);
      createdCount++;
    } else {
      console.log(`  ○ Exists: ${collectionName}`);
      existingCount++;
    }
  }

  console.log(
    `\n  Summary: ${createdCount} created, ${existingCount} already existed\n`
  );
}

/**
 * Create indexes for a collection
 */
async function createIndexesForCollection(db, collectionName, indexDefs) {
  const collection = db.collection(collectionName);

  console.log(`  📑 ${collectionName}:`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const indexDef of indexDefs) {
    try {
      await collection.createIndex(indexDef.keys, indexDef.options);

      // Show TTL information if applicable
      const ttlInfo =
        indexDef.options.expireAfterSeconds !== undefined
          ? indexDef.options.expireAfterSeconds === 0
            ? " [TTL: on expiry]"
            : ` [TTL: ${indexDef.options.expireAfterSeconds / 86400} days]`
          : "";

      console.log(`    ✓ ${indexDef.options.name}${ttlInfo}`);
      successCount++;
    } catch (error) {
      if (error.code === 85 || error.code === 86) {
        // Index exists with different options - recreate
        try {
          await collection.dropIndex(indexDef.options.name);
          await collection.createIndex(indexDef.keys, indexDef.options);
          console.log(`    ↻ ${indexDef.options.name} (recreated)`);
          successCount++;
        } catch (dropError) {
          console.error(
            `    ✗ ${indexDef.options.name} (error: ${dropError.message})`
          );
          errorCount++;
        }
      } else if (
        error.code === 11000 ||
        error.codeName === "IndexAlreadyExists"
      ) {
        console.log(`    ○ ${indexDef.options.name} (already exists)`);
        skipCount++;
      } else {
        console.error(
          `    ✗ ${indexDef.options.name} (error: ${error.message})`
        );
        errorCount++;
      }
    }
  }

  console.log(
    `    Summary: ${successCount} created, ${skipCount} existed, ${errorCount} errors\n`
  );
}

/**
 * Create all indexes
 */
async function createAllIndexes(db) {
  console.log("📊 Creating database indexes...\n");

  for (const [collectionName, indexDefs] of Object.entries(indexes)) {
    await createIndexesForCollection(db, collectionName, indexDefs);
  }
}

/**
 * Update existing users with security fields
 */
async function updateUsersWithSecurityFields(db) {
  console.log("🔄 Updating existing users with security fields...\n");

  const usersToUpdate = await db
    .collection("users")
    .find({ isEmailVerified: { $exists: false } })
    .toArray();

  if (usersToUpdate.length > 0) {
    await db.collection("users").updateMany(
      { isEmailVerified: { $exists: false } },
      {
        $set: {
          isEmailVerified: true, // Mark existing users as verified
          mfaEnabled: false,
          accountLocked: false,
          failedLoginAttempts: 0,
          updatedAt: new Date(),
        },
      }
    );
    console.log(
      `  ✓ Updated ${usersToUpdate.length} existing user(s) with security fields\n`
    );
  } else {
    console.log("  ℹ️  No users need security field updates\n");
  }
}

/**
 * Seed initial data
 */
async function seedInitialData(db, options = {}) {
  const { skipIfExists = true } = options;

  console.log("🌱 Seeding initial data...\n");

  // Seed users
  const usersCollection = db.collection("users");
  const existingUsersCount = await usersCollection.countDocuments();

  if (existingUsersCount > 0 && skipIfExists) {
    console.log(`  ○ Users: ${existingUsersCount} already exist (skipping)\n`);
  } else {
    const users = await getSeedUsers();
    try {
      await usersCollection.insertMany(users, { ordered: false });
      console.log(`  ✓ Users: ${users.length} created`);
      console.log(`     • saket@example.com / password123`);
      console.log(`     • ayush@example.com / password123\n`);
    } catch (error) {
      if (error.code === 11000) {
        console.log(`  ○ Users: Already exist (skipping duplicates)\n`);
      } else {
        console.error(`  ✗ Users: Error - ${error.message}\n`);
      }
    }
  }

  // Seed categories
  const categoriesCollection = db.collection("categories");
  const existingCategoriesCount = await categoriesCollection.countDocuments();

  if (existingCategoriesCount > 0 && skipIfExists) {
    console.log(
      `  ○ Categories: ${existingCategoriesCount} already exist (skipping)\n`
    );
  } else {
    try {
      await categoriesCollection.insertMany(seedCategories, {
        ordered: false,
      });
      console.log(`  ✓ Categories: ${seedCategories.length} created`);
      seedCategories.forEach((cat) => console.log(`     • ${cat.name}`));
      console.log("");
    } catch (error) {
      if (error.code === 11000) {
        console.log(`  ○ Categories: Already exist (skipping duplicates)\n`);
      } else {
        console.error(`  ✗ Categories: Error - ${error.message}\n`);
      }
    }
  }
}

/**
 * Verify database setup and show statistics
 */
async function verifySetup(db) {
  console.log("🔍 Verifying database setup...\n");

  const allCollections = [
    "users",
    "sessions",
    "loginHistory",
    "securityLogs",
    "notifications",
    "expenses",
    "categories",
    "settlements",
  ];

  console.log("  Collection Statistics:");
  console.log("  " + "─".repeat(58));
  console.log("  Collection          Documents    Indexes    TTL Indexes");
  console.log("  " + "─".repeat(58));

  for (const collName of allCollections) {
    try {
      const count = await db.collection(collName).countDocuments();
      const indexList = await db.collection(collName).indexes();
      const indexCount = indexList.length;
      const ttlCount = indexList.filter(
        (idx) => idx.expireAfterSeconds !== undefined
      ).length;

      console.log(
        `  ${collName.padEnd(20)}${String(count).padEnd(13)}${String(indexCount).padEnd(11)}${ttlCount > 0 ? `✓ ${ttlCount}` : "-"}`
      );
    } catch (error) {
      console.log(`  ${collName.padEnd(20)}Not created yet`);
    }
  }

  console.log("  " + "─".repeat(58));
  console.log("");
}

/**
 * Show final instructions
 */
function showFinalInstructions() {
  console.log("━".repeat(60));
  console.log("🎉 Database setup completed successfully!\n");
  console.log("📝 What's been set up:");
  console.log("   ✓ All collections created and verified");
  console.log("   ✓ Performance indexes configured");
  console.log("   ✓ TTL indexes for auto-cleanup:");
  console.log("     • Login history: 15 days");
  console.log("     • Security logs: 15 days");
  console.log("     • Notifications: 30 days");
  console.log("     • Sessions: auto-expire");
  console.log("   ✓ Security features initialized");
  console.log("   ✓ Sample data seeded (if requested)\n");
  console.log("📝 Next steps:");
  console.log("   1. Start your development server:");
  console.log("      npm run dev");
  console.log("   2. Open http://localhost:3000");
  console.log("   3. Login with test accounts:");
  console.log("      • saket@example.com / password123");
  console.log("      • ayush@example.com / password123\n");
  console.log("⚠️  Security Reminders:");
  console.log("   • Change default passwords in production");
  console.log("   • Keep JWT_SECRET secure and unique");
  console.log("   • Configure RESEND_API_KEY for email features");
  console.log("   • Enable MFA for production accounts\n");
  console.log("━".repeat(60));
}

/**
 * Main unified setup function
 */
async function unifiedDatabaseSetup(options = {}) {
  const { seedData = true, skipIfExists = true, verbose = false } = options;

  // Check environment
  if (!checkEnvironment()) {
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    console.log("━".repeat(60));
    console.log("🚀 Starting Unified Database Setup");
    console.log("━".repeat(60));
    console.log("");

    // Connect to MongoDB
    console.log("🔗 Connecting to MongoDB...\n");
    await client.connect();
    console.log("✅ Connected successfully!\n");

    const db = client.db(DB_NAME);

    // Step 1: Create collections
    console.log("━".repeat(60));
    await createCollections(db);

    // Step 2: Create indexes
    console.log("━".repeat(60));
    await createAllIndexes(db);

    // Step 3: Update existing users with security fields
    console.log("━".repeat(60));
    await updateUsersWithSecurityFields(db);

    // Step 4: Seed initial data
    if (seedData) {
      console.log("━".repeat(60));
      await seedInitialData(db, { skipIfExists });
    }

    // Step 5: Verify setup
    console.log("━".repeat(60));
    await verifySetup(db);

    // Show final instructions
    showFinalInstructions();
  } catch (error) {
    console.error("\n❌ Database setup failed:", error.message);
    if (verbose) {
      console.error("\nFull error:", error);
    }
    process.exit(1);
  } finally {
    await client.close();
    console.log("🔌 Database connection closed\n");
  }
}

/**
 * Command line interface
 */
if (require.main === module) {
  const args = process.argv.slice(2);

  // Show help
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Unified Database Setup Script
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This script performs complete database initialization including:
  • Environment validation
  • Collection creation
  • Index creation (with TTL indexes)
  • Security features setup
  • Initial data seeding
  • Verification and statistics

Usage:
  node scripts/unified-database-setup.js [options]

Options:
  --no-seed       Skip seeding initial data (users and categories)
  --force         Force recreation of data even if it exists
  --verbose, -v   Show detailed error messages
  --help, -h      Show this help message

Examples:
  node scripts/unified-database-setup.js
    → Full setup with all features and seed data

  node scripts/unified-database-setup.js --no-seed
    → Create collections and indexes only, no sample data

  node scripts/unified-database-setup.js --force
    → Force recreate all data (overwrites existing)

  node scripts/unified-database-setup.js --verbose
    → Show detailed error messages for debugging

Environment Variables Required:
  MONGODB_URI     MongoDB connection string (required)
  JWT_SECRET      Secret key for JWT tokens (required)
  RESEND_API_KEY  API key for email service (optional)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
    process.exit(0);
  }

  const options = {
    seedData: !args.includes("--no-seed"),
    skipIfExists: !args.includes("--force"),
    verbose: args.includes("--verbose") || args.includes("-v"),
  };

  unifiedDatabaseSetup(options);
}

module.exports = {
  unifiedDatabaseSetup,
  indexes,
  seedCategories,
  getSeedUsers,
};
