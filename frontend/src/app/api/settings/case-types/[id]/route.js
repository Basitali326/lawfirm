import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextauth";
import { API_BASE_URL } from "@/lib/config";

async function ensureAccess() {
  const session = await getServerSession(authOptions);
  return session?.access || session?.token?.access || session?.user?.access || session?.accessToken || null;
}

export async function GET(req, { params }) {
  const access = await ensureAccess();
  if (!access) {
    return NextResponse.json(
      { success: false, message: "Unauthorized", data: null, errors: null, meta: null },
      { status: 401 }
    );
  }
  const upstream = await fetch(`${API_BASE_URL}/api/v1/settings/case-types/${params.id}/`, {
    headers: { Authorization: `Bearer ${access}` },
    cache: "no-store",
  });
  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}

export async function PATCH(req, { params }) {
  const access = await ensureAccess();
  if (!access) {
    return NextResponse.json(
      { success: false, message: "Unauthorized", data: null, errors: null, meta: null },
      { status: 401 }
    );
  }
  const payload = await req.json();
  const upstream = await fetch(`${API_BASE_URL}/api/v1/settings/case-types/${params.id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${access}` },
    body: JSON.stringify(payload),
  });
  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}

export async function DELETE(req, { params }) {
  const access = await ensureAccess();
  if (!access) {
    return NextResponse.json(
      { success: false, message: "Unauthorized", data: null, errors: null, meta: null },
      { status: 401 }
    );
  }
  const upstream = await fetch(`${API_BASE_URL}/api/v1/settings/case-types/${params.id}/`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${access}` },
  });
  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}
