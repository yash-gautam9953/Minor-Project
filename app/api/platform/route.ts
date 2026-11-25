import {
  getPlatformState,
  handlePlatformAction,
  PlatformApiError,
} from "@/lib/appwrite-server";

export const runtime = "nodejs";

function failureResponse(error: unknown) {
  if (error instanceof PlatformApiError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "number"
      ? error.code
      : undefined;
  if (code === 401) {
    return Response.json(
      { error: "Your session expired. Please sign in again." },
      { status: 401 },
    );
  }
  if (code === 409) {
    return Response.json(
      { error: "This record changed in another request. Refresh and try again." },
      { status: 409 },
    );
  }

  console.error("KhetLink Appwrite request failed.", error);
  const status = code === 404 ? 503 : 500;
  const message =
    code === 404
      ? "An Appwrite database or collection could not be found. Check your server configuration."
      : "Appwrite could not complete the request. Check the server logs and Appwrite setup.";
  return Response.json({ error: message }, { status });
}

export async function GET(request: Request) {
  try {
    return Response.json(await getPlatformState(request));
  } catch (error) {
    return failureResponse(error);
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  try {
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return Response.json({ error: "Invalid request body." }, { status: 400 });
    }
    return Response.json(
      await handlePlatformAction(request, body as Record<string, unknown>),
    );
  } catch (error) {
    return failureResponse(error);
  }
}
