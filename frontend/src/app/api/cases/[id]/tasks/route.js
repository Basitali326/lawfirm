import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextauth";
import { API_BASE_URL } from "@/lib/config";

async function ensureAccess() {
  const session = await getServerSession(authOptions);
  return session?.access || session?.token?.access || session?.user?.access || session?.accessToken || null;
}

export async function POST(req, context) {
  const access = await ensureAccess();
  if (!access) {
    return NextResponse.json(
      { success: false, message: "Unauthorized", data: null, errors: null, meta: null },
      { status: 401 }
    );
  }
  const { id } = await context.params;
  const payload = await req.json();
  const upstream = await fetch(`${API_BASE_URL}/api/v1/cases/${id}/tasks/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${access}` },
    body: JSON.stringify(payload),
  });
  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}
