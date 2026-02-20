import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextauth";
import { API_BASE_URL } from "@/lib/config";

async function ensureAccess(req) {
  const headerAuth = req?.headers?.get("authorization");
  if (headerAuth) {
    const token = headerAuth.replace(/^Bearer\\s+/i, "");
    if (token) return token;
  }
  const session = await getServerSession(authOptions);
  return session?.access || session?.token?.access || session?.user?.access || session?.accessToken || null;
}

export async function POST(req, context) {
  const access = await ensureAccess(req);
  if (!access) {
    return NextResponse.json(
      { success: false, message: "Unauthorized", data: null, errors: null, meta: null },
      { status: 401 }
    );
  }

  const { id } = await context.params;

  const upstream = await fetch(`${API_BASE_URL}/api/v1/cases/${id}/generate-tasks/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  let data;
  try {
    data = await upstream.json();
  } catch {
    data = { success: false, message: "Upstream error", data: null, errors: null, meta: null };
  }

  return NextResponse.json(data, { status: upstream.status });
}
