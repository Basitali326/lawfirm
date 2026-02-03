"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  { label: "Active matters", value: "128", delta: "+12%" },
  { label: "Open tasks", value: "42", delta: "+4%" },
  { label: "New clients", value: "18", delta: "+9%" },
  { label: "Revenue", value: "$48,200", delta: "+7%" },
  { label: "Satisfaction", value: "96%", delta: "+2%" },
];

export default function AdminDashboard() {
  const { data: session } = useSession();
  const name = useMemo(() => {
    const fullName = session?.user?.name || "";
    if (!fullName) return "there";
    return fullName.split(" ")[0];
  }, [session]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Welcome back, {name}
          </h1>
          <p className="text-sm text-slate-500">
            Here's what's happening with your firm today.
          </p>
        </div>
        <div className="flex items-center gap-3"></div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-slate-200/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-slate-900">
                {stat.value}
              </div>
              <p className="mt-2 text-xs text-emerald-600">{stat.delta}</p>
            </CardContent>
          </Card>
        ))}
      </div>

    </div>
  );
}
