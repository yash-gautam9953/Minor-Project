import { Account, Client, Databases, ID, Query } from "node-appwrite";
import { createHash } from "node:crypto";
import { findFarmerMatches } from "@/services/matching";
import type {
  BuyerProfile,
  BuyerType,
  Deal,
  DealStatus,
  DemandListing,
  FarmerProfile,
  ListingStatus,
  PlatformState,
  ProduceListing,
  UserProfile,
  UserRole,
} from "@/types";

const collectionNames = [
  "users",
  "farmers",
  "buyers",
  "produce",
  "demands",
  "matches",
  "orders",
] as const;

type CollectionName = (typeof collectionNames)[number];
type DocumentRecord = Record<string, unknown> & { $id: string };
type AuthenticatedUser = { $id: string; name: string; email: string };

const collectionEnvironmentNames: Record<CollectionName, string> = {
  users: "APPWRITE_USERS_COLLECTION_ID",
  farmers: "APPWRITE_FARMERS_COLLECTION_ID",
  buyers: "APPWRITE_BUYERS_COLLECTION_ID",
  produce: "APPWRITE_PRODUCE_COLLECTION_ID",
  demands: "APPWRITE_DEMANDS_COLLECTION_ID",
  matches: "APPWRITE_MATCHES_COLLECTION_ID",
  orders: "APPWRITE_ORDERS_COLLECTION_ID",
};

export class PlatformApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "PlatformApiError";
  }
}

function getAppwriteConfig() {
  const missing = [
    !process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT && "NEXT_PUBLIC_APPWRITE_ENDPOINT",
    !process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID && "NEXT_PUBLIC_APPWRITE_PROJECT_ID",
    !process.env.APPWRITE_DATABASE_ID && "APPWRITE_DATABASE_ID",
    !process.env.APPWRITE_API_KEY && "APPWRITE_API_KEY",
    ...collectionNames
      .filter((name) => !process.env[collectionEnvironmentNames[name]])
      .map((name) => collectionEnvironmentNames[name]),
  ].filter(Boolean);

  if (missing.length) {
    throw new PlatformApiError(
      `Appwrite server configuration is incomplete: ${missing.join(", ")}.`,
      503,
    );
  }

  return {
    endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!,
    projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!,
    databaseId: process.env.APPWRITE_DATABASE_ID!,
    apiKey: process.env.APPWRITE_API_KEY!,
  };
}

function getDatabases() {
  const config = getAppwriteConfig();
  const client = new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId)
    .setKey(config.apiKey);
  return { databases: new Databases(client), databaseId: config.databaseId };
}

function getCollectionId(name: CollectionName) {
  const collectionId = process.env[collectionEnvironmentNames[name]];
  if (!collectionId) {
    throw new PlatformApiError(
      `Missing Appwrite collection configuration: ${collectionEnvironmentNames[name]}.`,
      503,
    );
  }
  return collectionId;
}

function errorCode(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "number"
  ) {
    return error.code;
  }
  return undefined;
}

async function authenticate(request: Request, optional = false) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) {
    if (optional) return null;
    throw new PlatformApiError("Sign in to continue.", 401);
  }

  const config = getAppwriteConfig();
  const client = new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId)
    .setJWT(token);
  try {
    return await new Account(client).get();
  } catch (error) {
    if (errorCode(error) === 401) {
      throw new PlatformApiError("Your session expired. Please sign in again.", 401);
    }
    throw error;
  }
}

function documentFields(document: DocumentRecord) {
  return Object.fromEntries(
    Object.entries(document).filter(([key]) => !key.startsWith("$")),
  ) as Record<string, unknown>;
}

function requiredString(data: Record<string, unknown>, key: string) {
  const value = data[key];
  if (typeof value !== "string") {
    throw new PlatformApiError(`An Appwrite document is missing its ${key} field.`, 500);
  }
  return value;
}

function requiredNumber(data: Record<string, unknown>, key: string) {
  const value = data[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new PlatformApiError(`An Appwrite document has an invalid ${key} field.`, 500);
  }
  return value;
}

function listingStatus(data: Record<string, unknown>): ListingStatus {
  const status = requiredString(data, "status");
  if (status !== "open" && status !== "matched" && status !== "closed") {
    throw new PlatformApiError("An Appwrite listing has an invalid status.", 500);
  }
  return status;
}

function toUserProfile(document: DocumentRecord): UserProfile {
  const data = documentFields(document);
  const role = requiredString(data, "role");
  const accountStatus = data.accountStatus ?? "enabled";
  if (role !== "farmer" && role !== "buyer") {
    throw new PlatformApiError("This account has no valid farmer or buyer profile.", 403);
  }
  if (accountStatus !== "enabled" && accountStatus !== "disabled") {
    throw new PlatformApiError("This KhetLink account has an invalid status.", 500);
  }
  return {
    id: document.$id,
    name: requiredString(data, "name"),
    email: requiredString(data, "email"),
    role,
    location: requiredString(data, "location"),
    accountStatus,
  };
}

function toFarmerProfile(document: DocumentRecord): FarmerProfile {
  const data = documentFields(document);
  if (typeof data.verified !== "boolean") {
    throw new PlatformApiError("An Appwrite farmer profile has an invalid verified field.", 500);
  }
  return {
    id: document.$id,
    name: requiredString(data, "name"),
    location: requiredString(data, "location"),
    phone: "",
    verified: data.verified,
    rating: requiredNumber(data, "rating"),
  };
}

function toBuyerProfile(document: DocumentRecord): BuyerProfile {
  const data = documentFields(document);
  const buyerType = requiredString(data, "buyerType");
  if (
    buyerType !== "Retailer" &&
    buyerType !== "Restaurant" &&
    buyerType !== "Hostel" &&
    buyerType !== "Small business"
  ) {
    throw new PlatformApiError("An Appwrite buyer profile has an invalid buyerType field.", 500);
  }
  return {
    id: document.$id,
    name: requiredString(data, "name"),
    buyerType,
    location: requiredString(data, "location"),
    phone: "",
  };
}

function toProduceListing(document: DocumentRecord): ProduceListing {
  const data = documentFields(document);
  return {
    id: document.$id,
    farmerId: requiredString(data, "farmerId"),
    farmerName: requiredString(data, "farmerName"),
    produce: requiredString(data, "produce"),
    quantityKg: requiredNumber(data, "quantityKg"),
    askingPricePerKg: requiredNumber(data, "askingPricePerKg"),
    location: requiredString(data, "location"),
    availableBy: requiredString(data, "availableBy"),
    status: listingStatus(data),
  };
}

function toDemandListing(document: DocumentRecord): DemandListing {
  const data = documentFields(document);
  const buyerType = requiredString(data, "buyerType");
  if (
    buyerType !== "Retailer" &&
    buyerType !== "Restaurant" &&
    buyerType !== "Hostel" &&
    buyerType !== "Small business"
  ) {
    throw new PlatformApiError("An Appwrite demand has an invalid buyerType field.", 500);
  }
  return {
    id: document.$id,
    buyerId: requiredString(data, "buyerId"),
    buyerName: requiredString(data, "buyerName"),
    buyerType,
    produce: requiredString(data, "produce"),
    quantityKg: requiredNumber(data, "quantityKg"),
    targetPricePerKg: requiredNumber(data, "targetPricePerKg"),
    location: requiredString(data, "location"),
    requiredBy: requiredString(data, "requiredBy"),
    status: listingStatus(data),
  };
}

function toDeal(document: DocumentRecord): Deal {
  const data = documentFields(document);
  const status = requiredString(data, "status");
  if (status !== "pending" && status !== "confirmed" && status !== "completed") {
    throw new PlatformApiError("An Appwrite order has an invalid status.", 500);
  }
  return {
    id: document.$id,
    farmerId: requiredString(data, "farmerId"),
    farmerName: requiredString(data, "farmerName"),
    buyerId: requiredString(data, "buyerId"),
    buyerName: requiredString(data, "buyerName"),
    produce: requiredString(data, "produce"),
    quantityKg: requiredNumber(data, "quantityKg"),
    agreedPricePerKg: requiredNumber(data, "agreedPricePerKg"),
    totalValue: requiredNumber(data, "totalValue"),
    status,
    createdAt: requiredString(data, "createdAt"),
  };
}

async function getDocument(
  name: CollectionName,
  documentId: string,
  transactionId?: string,
) {
  const { databases, databaseId } = getDatabases();
  const document = await databases.getDocument(
    databaseId,
    getCollectionId(name),
    documentId,
    [],
    transactionId,
  );
  return document as unknown as DocumentRecord;
}

async function listDocuments(name: CollectionName) {
  const { databases, databaseId } = getDatabases();
  const collectionId = getCollectionId(name);
  const documents: DocumentRecord[] = [];
  let cursor: string | undefined;

  while (documents.length < 10_000) {
    const queries = [Query.limit(100)];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const page = await databases.listDocuments(
      databaseId,
      collectionId,
      queries,
    );
    const rows = page.documents as unknown as DocumentRecord[];
    documents.push(...rows);
    if (rows.length < 100) return documents;
    cursor = rows[rows.length - 1].$id;
  }

  throw new PlatformApiError(
    `The ${name} collection exceeded the 10,000-document request limit.`,
    413,
  );
}

async function getProfile(userId: string) {
  try {
    const document = await getDocument("users", userId);
    const profile = toUserProfile(document);
    if (profile.accountStatus === "disabled") {
      throw new PlatformApiError(
        "Your KhetLink account is disabled. Contact an administrator.",
        403,
      );
    }
    return profile;
  } catch (error) {
    if (error instanceof PlatformApiError) throw error;
    if (errorCode(error) === 404) {
      throw new PlatformApiError(
        "Your KhetLink profile is missing. Please register this account again.",
        403,
      );
    }
    throw error;
  }
}

async function loadState(
  userId?: string,
  adminAccount?: AuthenticatedUser,
): Promise<PlatformState> {
  const profile = adminAccount
    ? {
        id: adminAccount.$id,
        name: adminAccount.name,
        email: adminAccount.email,
        role: "admin" as const,
        location: "Greater Noida",
      }
    : userId
      ? await getProfile(userId)
      : null;
  const [userDocuments, farmerDocuments, buyerDocuments, produceDocuments, demandDocuments, dealDocuments] = await Promise.all([
    adminAccount ? listDocuments("users") : Promise.resolve([]),
    userId ? listDocuments("farmers") : Promise.resolve([]),
    userId ? listDocuments("buyers") : Promise.resolve([]),
    listDocuments("produce"),
    listDocuments("demands"),
    userId ? listDocuments("orders") : Promise.resolve([]),
  ]);

  return {
    user: profile,
    farmers: farmerDocuments.map(toFarmerProfile),
    buyers: buyerDocuments.map(toBuyerProfile),
    produce: produceDocuments
      .map(toProduceListing)
      .filter(
        (listing) =>
          Boolean(userId) || (listing.status === "open" && listing.quantityKg > 0),
      ),
    demands: demandDocuments
      .map(toDemandListing)
      .filter(
        (demand) =>
          Boolean(userId) || (demand.status === "open" && demand.quantityKg > 0),
      ),
    deals: dealDocuments.map(toDeal).filter(
      (deal) =>
        Boolean(adminAccount) ||
        deal.farmerId === userId ||
        deal.buyerId === userId,
    ),
    ...(adminAccount
      ? {
          adminUsers: userDocuments.map((document) => {
            const data = documentFields(document);
            const role = requiredString(data, "role");
            const accountStatus = data.accountStatus ?? "enabled";
            if (accountStatus !== "enabled" && accountStatus !== "disabled") {
              throw new PlatformApiError(
                "A KhetLink account has an invalid status.",
                500,
              );
            }
            return {
              id: document.$id,
              name: requiredString(data, "name"),
              email: requiredString(data, "email"),
              status: accountStatus === "enabled",
              role: role === "farmer" || role === "buyer" ? role : undefined,
            };
          }),
        }
      : {}),
  };
}

async function withTransaction<T>(
  work: (transactionId: string) => Promise<T>,
): Promise<T> {
  const { databases } = getDatabases();
  const transaction = await databases.createTransaction({ ttl: 60 });
  try {
    const result = await work(transaction.$id);
    await databases.updateTransaction({
      transactionId: transaction.$id,
      commit: true,
    });
    return result;
  } catch (error) {
    try {
      await databases.updateTransaction({
        transactionId: transaction.$id,
        rollback: true,
      });
    } catch (rollbackError) {
      console.error("Appwrite transaction rollback failed.", rollbackError);
    }
    if (errorCode(error) === 409) {
      throw new PlatformApiError(
        "Another request changed this record. Refresh and try again.",
        409,
      );
    }
    throw error;
  }
}

function stringValue(value: unknown, label: string, maxLength = 128) {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    throw new PlatformApiError(`${label} is required and must be ${maxLength} characters or fewer.`, 400);
  }
  return value.trim();
}

function positiveNumber(value: unknown, label: string) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0 || number > 1_000_000_000) {
    throw new PlatformApiError(`${label} must be a positive number.`, 400);
  }
  return number;
}

function validDate(value: unknown, label: string) {
  const date = stringValue(value, label, 10);
  const parsedDate = new Date(`${date}T00:00:00Z`);
  const today = new Date().toISOString().slice(0, 10);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== date ||
    date < today
  ) {
    throw new PlatformApiError(`${label} must be a valid date.`, 400);
  }
  return date;
}

function assertLocation(value: unknown) {
  const location = stringValue(value, "Location");
  if (!["Greater Noida", "Noida", "Delhi", "Ghaziabad"].includes(location)) {
    throw new PlatformApiError("Choose a supported NCR location.", 400);
  }
  return location;
}

function assertCrop(value: unknown) {
  const crop = stringValue(value, "Produce");
  if (!["Tomato", "Potato", "Onion", "Wheat", "Rice", "Cauliflower"].includes(crop)) {
    throw new PlatformApiError("Choose a supported produce type.", 400);
  }
  return crop;
}

function assertBuyerType(value: unknown): BuyerType {
  if (
    value !== "Retailer" &&
    value !== "Restaurant" &&
    value !== "Hostel" &&
    value !== "Small business"
  ) {
    throw new PlatformApiError("Choose a supported buyer type.", 400);
  }
  return value;
}

async function createProfile(
  user: AuthenticatedUser,
  role: UserRole,
  submittedName: unknown,
) {
  if (role !== "farmer" && role !== "buyer") {
    throw new PlatformApiError("New accounts must be farmers or buyers.", 400);
  }
  const { databases, databaseId } = getDatabases();
  try {
    await getDocument("users", user.$id);
    throw new PlatformApiError("This account already has a KhetLink profile. Sign in instead.", 409);
  } catch (error) {
    if (error instanceof PlatformApiError) throw error;
    if (errorCode(error) !== 404) throw error;
  }

  const displayName = stringValue(user.name || submittedName, "Name");
  const location = "Greater Noida";
  await withTransaction(async (transactionId) => {
    await databases.createDocument({
      databaseId,
      collectionId: getCollectionId("users"),
      documentId: user.$id,
      data: {
        id: user.$id,
        name: displayName,
        email: user.email,
        role,
        location,
        accountStatus: "enabled",
      },
      transactionId,
    });

    if (role === "farmer") {
      await databases.createDocument({
        databaseId,
        collectionId: getCollectionId("farmers"),
        documentId: user.$id,
        data: {
          id: user.$id,
          name: displayName,
          location,
          phone: "",
          verified: false,
          rating: 5,
        },
        transactionId,
      });
    } else {
      await databases.createDocument({
        databaseId,
        collectionId: getCollectionId("buyers"),
        documentId: user.$id,
        data: {
          id: user.$id,
          name: displayName,
          buyerType: "Restaurant",
          location,
          phone: "",
        },
        transactionId,
      });
    }
  });
  return loadState(user.$id);
}

async function addProduce(user: UserProfile, body: Record<string, unknown>) {
  if (user.role !== "farmer") {
    throw new PlatformApiError("Only farmer accounts can publish produce.", 403);
  }
  const { databases, databaseId } = getDatabases();
  const documentId = ID.unique();
  const listing: Omit<ProduceListing, "id"> = {
    farmerId: user.id,
    farmerName: user.name,
    produce: assertCrop(body.produce),
    quantityKg: positiveNumber(body.quantityKg, "Quantity"),
    askingPricePerKg: positiveNumber(body.askingPricePerKg, "Price"),
    location: assertLocation(body.location),
    availableBy: validDate(body.availableBy, "Available date"),
    status: "open",
  };
  await databases.createDocument({
    databaseId,
    collectionId: getCollectionId("produce"),
    documentId,
    data: listing,
  });
  return loadState(user.id);
}

async function postDemand(user: UserProfile, body: Record<string, unknown>) {
  if (user.role !== "buyer") {
    throw new PlatformApiError("Only buyer accounts can post demand.", 403);
  }
  const { databases, databaseId } = getDatabases();
  const demand: Omit<DemandListing, "id"> = {
    buyerId: user.id,
    buyerName: user.name,
    buyerType: assertBuyerType(body.buyerType),
    produce: assertCrop(body.produce),
    quantityKg: positiveNumber(body.quantityKg, "Quantity"),
    targetPricePerKg: positiveNumber(body.targetPricePerKg, "Target price"),
    location: assertLocation(body.location),
    requiredBy: validDate(body.requiredBy, "Required date"),
    status: "open",
  };
  await databases.createDocument({
    databaseId,
    collectionId: getCollectionId("demands"),
    documentId: ID.unique(),
    data: demand,
  });
  return loadState(user.id);
}

function listingValues(
  body: Record<string, unknown>,
  role: "farmer",
): {
  produce: string;
  quantityKg: number;
  location: string;
  date: string;
  askingPricePerKg: number;
  availableBy: string;
};
function listingValues(
  body: Record<string, unknown>,
  role: "buyer",
): {
  produce: string;
  quantityKg: number;
  location: string;
  date: string;
  targetPricePerKg: number;
  buyerType: BuyerType;
  requiredBy: string;
};
function listingValues(body: Record<string, unknown>, role: "farmer" | "buyer") {
  const values = {
    produce: assertCrop(body.produce),
    quantityKg: positiveNumber(body.quantityKg, "Quantity"),
    location: assertLocation(body.location),
    date: validDate(body.date, role === "farmer" ? "Available date" : "Required date"),
  };
  return role === "farmer"
    ? {
        ...values,
        askingPricePerKg: positiveNumber(body.price, "Price"),
        availableBy: values.date,
      }
    : {
        ...values,
        targetPricePerKg: positiveNumber(body.price, "Target price"),
        buyerType: assertBuyerType(body.buyerType),
        requiredBy: values.date,
      };
}

async function updateOwnListing(
  user: UserProfile,
  body: Record<string, unknown>,
  role: "farmer" | "buyer",
) {
  if (user.role !== role) {
    throw new PlatformApiError(
      role === "farmer"
        ? "Only farmer accounts can edit produce."
        : "Only buyer accounts can edit demands.",
      403,
    );
  }
  const documentId = stringValue(
    body[role === "farmer" ? "produceId" : "demandId"],
    role === "farmer" ? "Produce ID" : "Demand ID",
    36,
  );
  const collection: CollectionName = role === "farmer" ? "produce" : "demands";
  const { databases, databaseId } = getDatabases();
  await withTransaction(async (transactionId) => {
    const document = await getDocument(collection, documentId, transactionId);
    let data: Record<string, unknown>;
    if (role === "farmer") {
      const listing = toProduceListing(document);
      if (listing.farmerId !== user.id) {
        throw new PlatformApiError("You can only edit your own records.", 403);
      }
      if (listing.status !== "open" || listing.quantityKg <= 0) {
        throw new PlatformApiError("Only open records with remaining quantity can be edited.", 409);
      }
      const values = listingValues(body, "farmer");
      data = {
        produce: values.produce,
        quantityKg: values.quantityKg,
        location: values.location,
        askingPricePerKg: values.askingPricePerKg,
        availableBy: values.availableBy,
      };
    } else {
      const listing = toDemandListing(document);
      if (listing.buyerId !== user.id) {
        throw new PlatformApiError("You can only edit your own records.", 403);
      }
      if (listing.status !== "open" || listing.quantityKg <= 0) {
        throw new PlatformApiError("Only open records with remaining quantity can be edited.", 409);
      }
      const values = listingValues(body, "buyer");
      data = {
        produce: values.produce,
        quantityKg: values.quantityKg,
        location: values.location,
        targetPricePerKg: values.targetPricePerKg,
        buyerType: values.buyerType,
        requiredBy: values.requiredBy,
      };
    }
    await databases.updateDocument({
      databaseId,
      collectionId: getCollectionId(collection),
      documentId,
      data,
      transactionId,
    });
  });
  return loadState(user.id);
}

async function closeOwnListing(
  user: UserProfile,
  body: Record<string, unknown>,
  role: "farmer" | "buyer",
) {
  if (user.role !== role) {
    throw new PlatformApiError("You are not allowed to close this record.", 403);
  }
  const documentId = stringValue(
    body[role === "farmer" ? "produceId" : "demandId"],
    role === "farmer" ? "Produce ID" : "Demand ID",
    36,
  );
  const collection: CollectionName = role === "farmer" ? "produce" : "demands";
  const { databases, databaseId } = getDatabases();
  await withTransaction(async (transactionId) => {
    const document = await getDocument(collection, documentId, transactionId);
    if (role === "farmer") {
      const listing = toProduceListing(document);
      if (listing.farmerId !== user.id) {
        throw new PlatformApiError("You can only close your own records.", 403);
      }
      if (listing.status !== "open") {
        throw new PlatformApiError("Only open records can be closed.", 409);
      }
    } else {
      const listing = toDemandListing(document);
      if (listing.buyerId !== user.id) {
        throw new PlatformApiError("You can only close your own records.", 403);
      }
      if (listing.status !== "open") {
        throw new PlatformApiError("Only open records can be closed.", 409);
      }
    }
    await databases.updateDocument({
      databaseId,
      collectionId: getCollectionId(collection),
      documentId,
      data: { status: "closed" },
      transactionId,
    });
  });
  return loadState(user.id);
}

async function acceptMatch(
  user: UserProfile,
  body: Record<string, unknown>,
) {
  const demandId = stringValue(body.demandId, "Demand ID", 36);
  const produceId = stringValue(body.produceId, "Produce ID", 36);
  const { databases, databaseId } = getDatabases();
  await withTransaction(async (transactionId) => {
    const [demandDocument, produceDocument] = await Promise.all([
      getDocument("demands", demandId, transactionId),
      getDocument("produce", produceId, transactionId),
    ]);
    const demand = toDemandListing(demandDocument);
    const produce = toProduceListing(produceDocument);
    const ownsDemand = user.role === "buyer" && demand.buyerId === user.id;
    const ownsProduce = user.role === "farmer" && produce.farmerId === user.id;
    if (!ownsDemand && !ownsProduce) {
      throw new PlatformApiError("You can only accept a match involving your own demand or listing.", 403);
    }
    const match = findFarmerMatches(demand, [produce])[0];
    if (
      demand.status !== "open" ||
      produce.status !== "open" ||
      demand.quantityKg <= 0 ||
      produce.quantityKg <= 0 ||
      !match
    ) {
      throw new PlatformApiError("This match is no longer available or does not meet the matching rules.", 409);
    }

    const quantityKg = Math.min(demand.quantityKg, produce.quantityKg);
    const remainingDemand = demand.quantityKg - quantityKg;
    const remainingProduce = produce.quantityKg - quantityKg;
    const createdAt = new Date().toISOString().slice(0, 10);
    const deal: Omit<Deal, "id"> = {
      farmerId: produce.farmerId,
      farmerName: produce.farmerName,
      buyerId: demand.buyerId,
      buyerName: demand.buyerName,
      produce: produce.produce,
      quantityKg,
      agreedPricePerKg: produce.askingPricePerKg,
      totalValue: quantityKg * produce.askingPricePerKg,
      status: "confirmed",
      createdAt,
    };
    const matchId = createHash("sha256")
      .update(`${demandId}:${produceId}`)
      .digest("hex")
      .slice(0, 36);
    await databases.updateDocument({
      databaseId,
      collectionId: getCollectionId("demands"),
      documentId: demandId,
      data: {
        quantityKg: remainingDemand,
        status: remainingDemand > 0 ? "open" : "matched",
      },
      transactionId,
    });
    await databases.updateDocument({
      databaseId,
      collectionId: getCollectionId("produce"),
      documentId: produceId,
      data: {
        quantityKg: remainingProduce,
        status: remainingProduce > 0 ? "open" : "matched",
      },
      transactionId,
    });
    await databases.createDocument({
      databaseId,
      collectionId: getCollectionId("orders"),
      documentId: ID.unique(),
      data: deal,
      transactionId,
    });
    await databases.createDocument({
      databaseId,
      collectionId: getCollectionId("matches"),
      documentId: matchId,
      data: {
        demandId,
        produceId,
        quantityKg,
        status: "matched",
        createdAt,
      },
      transactionId,
    });
  });
  return loadState(user.id);
}

async function updateDealStatus(
  user: UserProfile,
  body: Record<string, unknown>,
) {
  const dealId = stringValue(body.dealId, "Deal ID", 36);
  const status = body.status;
  if (status !== "confirmed" && status !== "completed") {
    throw new PlatformApiError("Unsupported deal status.", 400);
  }
  const { databases, databaseId } = getDatabases();
  await withTransaction(async (transactionId) => {
    const dealDocument = await getDocument("orders", dealId, transactionId);
    const deal = toDeal(dealDocument);
    if (deal.farmerId !== user.id && deal.buyerId !== user.id) {
      throw new PlatformApiError("You can only update your own deals.", 403);
    }
    if (
      (status === "confirmed" && deal.status !== "pending") ||
      (status === "completed" && deal.status !== "confirmed")
    ) {
      throw new PlatformApiError("This deal cannot transition to the requested status.", 409);
    }
    await databases.updateDocument({
      databaseId,
      collectionId: getCollectionId("orders"),
      documentId: dealId,
      data: { status: status as DealStatus },
      transactionId,
    });
  });
  return loadState(user.id);
}

function isAdminAccount(userId: string) {
  const configuredIds = process.env.APPWRITE_ADMIN_USER_IDS?.split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return configuredIds?.includes(userId) ?? false;
}

async function adminCloseListing(body: Record<string, unknown>) {
  const kind = body.kind;
  if (kind !== "produce" && kind !== "demand") {
    throw new PlatformApiError("Choose a valid listing type.", 400);
  }
  const documentId = stringValue(body.documentId, "Listing ID", 36);
  const collection: CollectionName = kind === "produce" ? "produce" : "demands";
  const { databases, databaseId } = getDatabases();
  await withTransaction(async (transactionId) => {
    const document = await getDocument(collection, documentId, transactionId);
    const status = listingStatus(documentFields(document));
    if (status !== "open") {
      throw new PlatformApiError("Only open listings can be closed.", 409);
    }
    await databases.updateDocument({
      databaseId,
      collectionId: getCollectionId(collection),
      documentId,
      data: { status: "closed" },
      transactionId,
    });
  });
}

async function adminSetUserStatus(body: Record<string, unknown>) {
  const userId = stringValue(body.userId, "User ID", 36);
  if (typeof body.status !== "boolean") {
    throw new PlatformApiError("Choose whether the account should be enabled.", 400);
  }
  if (isAdminAccount(userId)) {
    throw new PlatformApiError("Admin accounts cannot be disabled here.", 403);
  }
  const profile = await getDocument("users", userId);
  const role = requiredString(documentFields(profile), "role");
  if (role !== "farmer" && role !== "buyer") {
    throw new PlatformApiError("Only registered farmer or buyer accounts can be managed.", 403);
  }
  const { databases, databaseId } = getDatabases();
  await withTransaction(async (transactionId) => {
    const currentProfile = await getDocument("users", userId, transactionId);
    const fields = documentFields(currentProfile);
    const currentRole = requiredString(fields, "role");
    if (currentRole !== "farmer" && currentRole !== "buyer") {
      throw new PlatformApiError("Only registered farmer or buyer accounts can be managed.", 403);
    }
    await databases.updateDocument({
      databaseId,
      collectionId: getCollectionId("users"),
      documentId: userId,
      data: { accountStatus: body.status ? "enabled" : "disabled" },
      transactionId,
    });
  });
}

export async function getPlatformState(request: Request) {
  const user = await authenticate(request, true);
  if (!user) return loadState();
  if (isAdminAccount(user.$id)) return loadState(user.$id, user);
  return loadState(user.$id);
}

export async function handlePlatformAction(
  request: Request,
  body: Record<string, unknown>,
) {
  const account = await authenticate(request);
  if (!account) {
    throw new PlatformApiError("Sign in to continue.", 401);
  }
  if (isAdminAccount(account.$id)) {
    if (
      body.action !== "adminCloseListing" &&
      body.action !== "adminSetUserStatus"
    ) {
      throw new PlatformApiError("Admins can only use admin management actions.", 403);
    }
    if (body.action === "adminCloseListing") {
      await adminCloseListing(body);
    } else {
      await adminSetUserStatus(body);
    }
    return loadState(account.$id, account);
  }
  if (body.action === "createProfile") {
    if (body.role !== "farmer" && body.role !== "buyer") {
      throw new PlatformApiError("New accounts must be farmers or buyers.", 400);
    }
    return createProfile(
      account,
      body.role,
      body.name,
    );
  }

  const user = await getProfile(account.$id);
  switch (body.action) {
    case "addProduce":
      return addProduce(user, body);
    case "postDemand":
      return postDemand(user, body);
    case "updateProduce":
      return updateOwnListing(user, body, "farmer");
    case "updateDemand":
      return updateOwnListing(user, body, "buyer");
    case "closeProduce":
      return closeOwnListing(user, body, "farmer");
    case "closeDemand":
      return closeOwnListing(user, body, "buyer");
    case "acceptMatch":
      return acceptMatch(user, body);
    case "updateDealStatus":
      return updateDealStatus(user, body);
    case "adminCloseListing":
    case "adminSetUserStatus":
      throw new PlatformApiError("Admin access is required for this action.", 403);
    default:
      throw new PlatformApiError("Unknown platform action.", 400);
  }
}
