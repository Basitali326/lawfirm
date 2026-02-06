import { apiFetch } from "@/lib/api";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextauth";

export async function DELETE(_request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.access) {
    return Response.json({ success: false, message: "Unauthorized", data: null, errors: null, meta: null }, { status: 401 });
  }
  const id =
    params?.id ||
    (() => {
      try {
        const url = new URL(_request.url);
        return (
          url.searchParams.get("id") ||
          url.pathname
            .split("/")
            .filter(Boolean)
            .pop()
        );
      } catch (_) {
        return null;
      }
    })();
  if (!id) {
    return Response.json({ success: false, message: "User id is required", data: null, errors: null, meta: null }, { status: 400 });
  }
  try {
    const res = await apiFetch(`/api/v1/settings/users/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access}` },
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
