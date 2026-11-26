"use client";

import { Account, Client, ID } from "appwrite";
import type { PlatformState, UserRole } from "@/types";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

const client = endpoint && projectId
  ? new Client().setEndpoint(endpoint!).setProject(projectId!)
  : null;

export const account = client ? new Account(client) : null;

export async function createAppwriteAccount(
  name: string,
  email: string,
  password: string,
) {
  if (!account) throw new Error("Appwrite authentication is not configured.");
  await account.create(ID.unique(), email, password, name);
  await createAppwriteSession(email, password);
}

export async function createAppwriteSession(email: string, password: string) {
  if (!account) throw new Error("Appwrite authentication is not configured.");
  if (await hasAppwriteSession()) {
    await endAppwriteSession();
  }
  await account.createEmailPasswordSession(email, password);
}

export async function hasAppwriteSession() {
  if (!account) return false;
  try {
    await account.get();
    return true;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 401
    ) {
      return false;
    }
    throw error;
  }
}

async function callPlatformApi<T>(
  method: "GET" | "POST",
  body?: Record<string, unknown>,
  authenticated = true,
): Promise<T> {
  const headers = new Headers();
  if (body) headers.set("Content-Type", "application/json");
  if (authenticated) {
    if (!account) throw new Error("Appwrite authentication is not configured.");
    const jwt = await account.createJWT();
    headers.set("Authorization", `Bearer ${jwt.jwt}`);
  }

  const response = await fetch("/api/platform", {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = (await response.json()) as { error?: string } & T;
  if (!response.ok) {
    throw new Error(result.error || "The platform request failed.");
  }
  return result;
}

export function loadPlatformState(authenticated: boolean) {
  return callPlatformApi<PlatformState>("GET", undefined, authenticated);
}

export function createPlatformProfile(
  role: UserRole,
  name: string,
  location: string,
  buyerType: string,
) {
  return callPlatformApi<PlatformState>("POST", {
    action: "createProfile",
    role,
    name,
    location,
    buyerType,
  });
}

export function runPlatformAction(
  action: string,
  data: Record<string, unknown>,
) {
  return callPlatformApi<PlatformState>("POST", { action, ...data });
}

export async function endAppwriteSession() {
  if (!account) return;
  try {
    await account.deleteSession("current");
  } catch (error) {
    console.warn("Appwrite session could not be closed.", error);
    throw error;
  }
}
