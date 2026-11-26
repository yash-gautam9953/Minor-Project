import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Client, Databases } from "node-appwrite";

const envPath = resolve(process.cwd(), ".env.local");
const defaultDatabaseId = "khetlink";
const collectionDefinitions = [
  {
    env: "APPWRITE_USERS_COLLECTION_ID",
    id: "users",
    name: "Users",
    attributes: [
      { key: "id", type: "string", size: 36 },
      { key: "name", type: "string", size: 128 },
      { key: "email", type: "string", size: 320 },
      { key: "role", type: "string", size: 16 },
      { key: "location", type: "string", size: 64 },
      { key: "accountStatus", type: "string", size: 16, required: false },
    ],
  },
  {
    env: "APPWRITE_FARMERS_COLLECTION_ID",
    id: "farmers",
    name: "Farmers",
    attributes: [
      { key: "id", type: "string", size: 36 },
      { key: "name", type: "string", size: 128 },
      { key: "location", type: "string", size: 64 },
      { key: "phone", type: "string", size: 32, required: false },
      { key: "verified", type: "boolean" },
      { key: "rating", type: "double" },
    ],
  },
  {
    env: "APPWRITE_BUYERS_COLLECTION_ID",
    id: "buyers",
    name: "Buyers",
    attributes: [
      { key: "id", type: "string", size: 36 },
      { key: "name", type: "string", size: 128 },
      { key: "buyerType", type: "string", size: 32 },
      { key: "location", type: "string", size: 64 },
      { key: "phone", type: "string", size: 32, required: false },
    ],
  },
  {
    env: "APPWRITE_PRODUCE_COLLECTION_ID",
    id: "produce",
    name: "Produce",
    attributes: [
      { key: "farmerId", type: "string", size: 36 },
      { key: "farmerName", type: "string", size: 128 },
      { key: "produce", type: "string", size: 64 },
      { key: "quantityKg", type: "double" },
      { key: "askingPricePerKg", type: "double" },
      { key: "location", type: "string", size: 64 },
      { key: "availableBy", type: "string", size: 10 },
      { key: "status", type: "string", size: 16 },
    ],
  },
  {
    env: "APPWRITE_DEMANDS_COLLECTION_ID",
    id: "demands",
    name: "Demands",
    attributes: [
      { key: "buyerId", type: "string", size: 36 },
      { key: "buyerName", type: "string", size: 128 },
      { key: "buyerType", type: "string", size: 32 },
      { key: "produce", type: "string", size: 64 },
      { key: "quantityKg", type: "double" },
      { key: "targetPricePerKg", type: "double" },
      { key: "location", type: "string", size: 64 },
      { key: "deliveryAddress", type: "string", size: 512, required: false },
      { key: "requiredBy", type: "string", size: 10 },
      { key: "status", type: "string", size: 16 },
    ],
  },
  {
    env: "APPWRITE_MATCHES_COLLECTION_ID",
    id: "matches",
    name: "Matches",
    attributes: [
      { key: "demandId", type: "string", size: 36 },
      { key: "produceId", type: "string", size: 36 },
      { key: "quantityKg", type: "double" },
      { key: "status", type: "string", size: 16 },
      { key: "createdAt", type: "string", size: 10 },
    ],
  },
  {
    env: "APPWRITE_ORDERS_COLLECTION_ID",
    id: "orders",
    name: "Orders",
    attributes: [
      { key: "farmerId", type: "string", size: 36 },
      { key: "farmerName", type: "string", size: 128 },
      { key: "farmerLocation", type: "string", size: 64, required: false },
      { key: "buyerId", type: "string", size: 36 },
      { key: "buyerName", type: "string", size: 128 },
      { key: "deliveryAddress", type: "string", size: 512, required: false },
      { key: "produce", type: "string", size: 64 },
      { key: "quantityKg", type: "double" },
      { key: "agreedPricePerKg", type: "double" },
      { key: "totalValue", type: "double" },
      { key: "status", type: "string", size: 16 },
      { key: "createdAt", type: "string", size: 10 },
      { key: "paymentStatus", type: "string", size: 20, required: false },
      { key: "demoPaymentMethod", type: "string", size: 16, required: false },
      { key: "paymentSimulatedAt", type: "string", size: 40, required: false },
      { key: "deliveryStatus", type: "string", size: 24, required: false },
      { key: "riderId", type: "string", size: 36, required: false },
      { key: "riderName", type: "string", size: 128, required: false },
      { key: "distanceKm", type: "double", required: false },
      { key: "riderRatePerKm", type: "double", required: false },
      { key: "riderFee", type: "double", required: false },
      { key: "deliveryUpdatedAt", type: "string", size: 40, required: false },
    ],
  },
];

function parseEnvFile(contents) {
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;

    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

function validateId(value, label) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,35}$/.test(value)) {
    throw new Error(`${label} must be 1-36 letters, numbers, dots, underscores or hyphens.`);
  }
  return value;
}

function errorCode(error) {
  return typeof error?.code === "number" ? error.code : undefined;
}

async function ensureDatabase(databases, databaseId) {
  try {
    const database = await databases.get({ databaseId });
    console.log(`Using existing database: ${databaseId}`);
    return database;
  } catch (error) {
    if (errorCode(error) !== 404) throw error;
  }

  const database = await databases.create({
    databaseId,
    name: "KhetLink",
    enabled: true,
  });
  console.log(`Created database: ${databaseId}`);
  return database;
}

async function ensureCollection(databases, databaseId, collection) {
  try {
    const existing = await databases.getCollection({
      databaseId,
      collectionId: collection.id,
    });
    console.log(`Using existing collection: ${collection.id}`);
    return existing;
  } catch (error) {
    if (errorCode(error) !== 404) throw error;
  }

  await databases.createCollection({
    databaseId,
    collectionId: collection.id,
    name: collection.name,
    permissions: [],
    documentSecurity: true,
    enabled: true,
    description: `KhetLink ${collection.name.toLowerCase()} data`,
  });
  console.log(`Created collection: ${collection.id}`);
}

function normalizedType(type) {
  if (type === "float" || type === "double") return "double";
  return type;
}

function validateAttribute(existing, definition, collectionId) {
  const expectedType = definition.type;
  if (normalizedType(existing.type) !== expectedType) {
    throw new Error(
      `${collectionId}.${definition.key} exists as ${existing.type}; expected ${expectedType}. ` +
        "The script will not replace an existing attribute or its data.",
    );
  }
  if (definition.size && existing.size < definition.size) {
    throw new Error(
      `${collectionId}.${definition.key} is too small (${existing.size}); expected at least ${definition.size}.`,
    );
  }
  if (existing.required !== (definition.required !== false)) {
    throw new Error(
      `${collectionId}.${definition.key} has a different required setting. ` +
        "The script will not alter an existing attribute.",
    );
  }
}

async function waitForAttribute(databases, databaseId, collectionId, definition) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    const result = await databases.listAttributes({
      databaseId,
      collectionId,
    });
    const attribute = result.attributes.find((item) => item.key === definition.key);
    if (!attribute) {
      await new Promise((resolveWait) => setTimeout(resolveWait, 1000));
      continue;
    }
    if (attribute.status === "failed" || attribute.status === "stuck") {
      throw new Error(
        `${collectionId}.${definition.key} creation ${attribute.status}: ${attribute.error || "no Appwrite error details"}`,
      );
    }
    if (attribute.status === "available") {
      validateAttribute(attribute, definition, collectionId);
      return;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 1000));
  }

  throw new Error(`Timed out waiting for ${collectionId}.${definition.key} to become available.`);
}

async function ensureAttribute(databases, databaseId, collectionId, definition) {
  const result = await databases.listAttributes({ databaseId, collectionId });
  const existing = result.attributes.find((attribute) => attribute.key === definition.key);
  if (existing) {
    if (existing.status === "available") {
      validateAttribute(existing, definition, collectionId);
      return;
    }
    await waitForAttribute(databases, databaseId, collectionId, definition);
    return;
  }

  const required = definition.required !== false;
  if (definition.type === "string") {
    await databases.createStringAttribute({
      databaseId,
      collectionId,
      key: definition.key,
      size: definition.size,
      required,
    });
  } else if (definition.type === "double") {
    await databases.createFloatAttribute({
      databaseId,
      collectionId,
      key: definition.key,
      required,
    });
  } else if (definition.type === "boolean") {
    await databases.createBooleanAttribute({
      databaseId,
      collectionId,
      key: definition.key,
      required,
    });
  } else {
    throw new Error(`Unsupported attribute type: ${definition.type}`);
  }

  await waitForAttribute(databases, databaseId, collectionId, definition);
  console.log(`Created attribute: ${collectionId}.${definition.key}`);
}

async function saveGeneratedIds(contents, updates) {
  const newline = contents.includes("\r\n") ? "\r\n" : "\n";
  const lines = contents.split(/\r?\n/);
  const remaining = new Set(Object.keys(updates));
  const updatedLines = lines.map((line) => {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=/);
    const key = match?.[1];
    if (!key || !(key in updates)) return line;
    remaining.delete(key);
    return `${key}=${updates[key]}`;
  });

  for (const key of remaining) updatedLines.push(`${key}=${updates[key]}`);
  await writeFile(envPath, updatedLines.join(newline), "utf8");
}

async function main() {
  let envContents;
  try {
    envContents = await readFile(envPath, "utf8");
  } catch {
    throw new Error("Missing .env.local. Copy .env.example to .env.local, then fill in the endpoint, project ID and API key.");
  }
  parseEnvFile(envContents);

  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;
  if (!endpoint || !projectId || !apiKey) {
    throw new Error(
      "Set NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT_ID and APPWRITE_API_KEY in .env.local first.",
    );
  }

  const databaseId = validateId(
    process.env.APPWRITE_DATABASE_ID || defaultDatabaseId,
    "Database ID",
  );
  const collections = collectionDefinitions.map((collection) => ({
    ...collection,
    id: validateId(process.env[collection.env] || collection.id, collection.env),
  }));
  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);
  const databases = new Databases(client);

  await ensureDatabase(databases, databaseId);
  for (const collection of collections) {
    await ensureCollection(databases, databaseId, collection);
    for (const attribute of collection.attributes) {
      await ensureAttribute(databases, databaseId, collection.id, attribute);
    }
  }

  await saveGeneratedIds(envContents, {
    APPWRITE_DATABASE_ID: databaseId,
    ...Object.fromEntries(collections.map((collection) => [collection.env, collection.id])),
  });
  console.log("\nAppwrite setup is complete. Generated IDs were saved to .env.local.");
  console.log("Restart the Next.js server with: npm run dev");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "unknown error";
  if (/missing scopes/i.test(message)) {
    console.error(
      "Appwrite API key is missing permissions. Add these scopes to the key: " +
        "databases.read, databases.write, collections.read, collections.write, " +
        "attributes.read, attributes.write, documents.read, documents.write.\n" +
        "The database may already have been created; after updating the key, rerun npm run appwrite:setup.\n" +
        `Appwrite details: ${message}`,
    );
  } else {
    console.error(`Appwrite setup failed: ${message}`);
  }
  process.exitCode = 1;
});
