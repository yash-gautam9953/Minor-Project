import { Account, Client, Databases, ID, Query } from "appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

export const appwriteConfigured = Boolean(endpoint && projectId);

const client = appwriteConfigured
  ? new Client().setEndpoint(endpoint!).setProject(projectId!)
  : null;

export const account = client ? new Account(client) : null;
export const databases = client ? new Databases(client) : null;

const collectionIds: Record<string, string | undefined> = {
  users: process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
  farmers: process.env.NEXT_PUBLIC_APPWRITE_FARMERS_COLLECTION_ID,
  buyers: process.env.NEXT_PUBLIC_APPWRITE_BUYERS_COLLECTION_ID,
  produce: process.env.NEXT_PUBLIC_APPWRITE_PRODUCE_COLLECTION_ID,
  demands: process.env.NEXT_PUBLIC_APPWRITE_DEMANDS_COLLECTION_ID,
  matches: process.env.NEXT_PUBLIC_APPWRITE_MATCHES_COLLECTION_ID,
  orders: process.env.NEXT_PUBLIC_APPWRITE_ORDERS_COLLECTION_ID,
  price_history: process.env.NEXT_PUBLIC_APPWRITE_PRICE_HISTORY_COLLECTION_ID,
};

export async function saveAppwriteDocument(collection: keyof typeof collectionIds, data: Record<string, unknown>) {
  const collectionId = collectionIds[collection];
  if (!databases || !databaseId || !collectionId) return false;

  try {
    await databases.createDocument(databaseId, collectionId, ID.unique(), data);
    return true;
  } catch (error) {
    console.warn(`Appwrite ${collection} write failed; the local demo state remains available.`, error);
    return false;
  }
}

export async function listAppwriteDocuments<T>(collection: keyof typeof collectionIds, limit = 100): Promise<T[]> {
  const collectionId = collectionIds[collection];
  if (!databases || !databaseId || !collectionId) return [];

  try {
    const response = await databases.listDocuments(databaseId, collectionId, [Query.limit(limit)]);
    return response.documents.map((document) => document as unknown as T);
  } catch (error) {
    console.warn(`Appwrite ${collection} read failed; using local demo data.`, error);
    return [];
  }
}

export async function createAppwriteAccount(name: string, email: string, password: string) {
  if (!account) return false;
  await account.create(ID.unique(), email, password, name);
  await account.createEmailPasswordSession(email, password);
  return true;
}

export async function createAppwriteSession(email: string, password: string) {
  if (!account) return false;
  await account.createEmailPasswordSession(email, password);
  return true;
}

export async function endAppwriteSession() {
  if (!account) return;
  try {
    await account.deleteSession("current");
  } catch (error) {
    console.warn("Appwrite session could not be closed.", error);
  }
}