import { apiFetch } from "@/lib/api";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextauth";

async function getAccess(req) {
  const headerAuth = req?.headers?.get("authorization");
  if (headerAuth) {
    const token = headerAuth.replace(/^Bearer\\s+/i, "");
    if (token) return token;
  }
  const session = await getServerSession(authOptions);
  return session?.access || session?.token?.access || session?.user?.access || session?.accessToken || null;
}

export async function GET(req) {
  const access = await getAccess(req);
  if (!access) {
    return Response.json({ success: false, message: "Unauthorized", data: null, errors: null, meta: null }, { status: 401 });
  }
  try {
    const res = await apiFetch(`/api/v1/settings/users`, {
      headers: { Authorization: `Bearer ${access}` },
      cache: "no-store",
    });
    return Response.json(res, { status: 200 });
  } catch (err) {
    const status = err?.status || 500;
    return Response.json(
      { success: false, message: err?.message || "Request failed", data: null, errors: err?.data || err?.errors || null, meta: null },
      { status }
    );
  }
}

export async function POST(request) {
  const access = await getAccess(request);
  if (!access) {
    return Response.json({ success: false, message: "Unauthorized", data: null, errors: null, meta: null }, { status: 401 });
  }
  const body = await request.json();
  try {
    const res = await apiFetch(`/api/v1/settings/users`, {
      method: "POST",
      headers: { Authorization: `Bearer ${access}` },
      body: JSON.stringify(body),
    });
    return Response.json(res, { status: 201 });
  } catch (err) {
    const status = err?.status || 500;
    return Response.json(
      { success: false, message: err?.message || "Request failed", data: null, errors: err?.data || err?.errors || null, meta: null },
      { status }
    );
  }
}
