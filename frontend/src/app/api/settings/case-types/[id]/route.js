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

function resolveId(req, params) {
  if (params?.id && params.id !== "undefined") return params.id;
  const segments = req.nextUrl?.pathname?.split("/").filter(Boolean) || [];
  const idx = segments.indexOf("case-types");
  if (idx !== -1 && segments.length > idx + 1) return segments[idx + 1];
  return null;
}

export async function GET(req, { params }) {
  const id = resolveId(req, params);
  if (!id) {
    return NextResponse.json(
      { success: false, message: "Invalid case type id", data: null, errors: null, meta: null },
      { status: 400 }
    );
  }
  const access = await ensureAccess(req);
  if (!access) {
    return NextResponse.json(
      { success: false, message: "Unauthorized", data: null, errors: null, meta: null },
      { status: 401 }
    );
  }
  const upstream = await fetch(`${API_BASE_URL}/api/v1/settings/case-types/${id}/`, {
    headers: { Authorization: `Bearer ${access}` },
    cache: "no-store",
  });
  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}

export async function PATCH(req, { params }) {
  const id = resolveId(req, params);
  if (!id) {
    return NextResponse.json(
      { success: false, message: "Invalid case type id", data: null, errors: null, meta: null },
      { status: 400 }
    );
  }
  const access = await ensureAccess(req);
  if (!access) {
    return NextResponse.json(
      { success: false, message: "Unauthorized", data: null, errors: null, meta: null },
      { status: 401 }
    );
  }
  const payload = await req.json();
  const upstream = await fetch(`${API_BASE_URL}/api/v1/settings/case-types/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${access}` },
    body: JSON.stringify(payload),
  });
  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}

export async function DELETE(req, { params }) {
  const id = resolveId(req, params);
  if (!id) {
    return NextResponse.json(
      { success: false, message: "Invalid case type id", data: null, errors: null, meta: null },
      { status: 400 }
    );
  }
  const access = await ensureAccess(req);
  if (!access) {
    return NextResponse.json(
      { success: false, message: "Unauthorized", data: null, errors: null, meta: null },
      { status: 401 }
    );
  }
  const upstream = await fetch(`${API_BASE_URL}/api/v1/settings/case-types/${id}/`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${access}` },
  });
  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}
