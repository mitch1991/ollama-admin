import { NextRequest, NextResponse } from "next/server";
import {
  formatOllamaConnectionError,
  getVersion,
  normalizeOllamaUrl,
} from "@/lib/ollama";
import { guardActiveSetupAdmin } from "@/lib/require-active-setup-admin";

export async function POST(req: NextRequest) {
  const guardResponse = await guardActiveSetupAdmin();
  if (guardResponse) return guardResponse;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let url: string;
  try {
    url = normalizeOllamaUrl(
      body && typeof body === "object" && "url" in body
        ? (body as { url?: unknown }).url
        : undefined
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid URL" },
      { status: 400 }
    );
  }

  try {
    const version = await getVersion(url);
    return NextResponse.json({ status: "online", version: version.version });
  } catch (err) {
    return NextResponse.json(
      { status: "offline", error: formatOllamaConnectionError(url, err) },
      { status: 502 }
    );
  }
}
