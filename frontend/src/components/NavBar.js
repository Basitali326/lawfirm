"use client";

import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { LogOut } from "lucide-react";

import AppButton from "@/components/AppButton";
import { USE_NEXTAUTH } from "@/lib/config";
import { logout } from "@/lib/auth";
import { toast } from "sonner";

export default function NavBar() {
  const router = useRouter();
  const { data: session } = useSession();

  const handleLogout = async () => {
    try {
      if (USE_NEXTAUTH) {
        await signOut({ redirect: false });
      } else {
        await logout();
      }
      toast.success("Logged out");
      router.push("/login");
    } catch (error) {
      toast.error(error?.message || "Logout failed");
    }
  };

  return (
    <div className="flex items-center justify-between border-b px-6 py-4">
      <div>
        <p className="text-sm text-muted-foreground">Signed in</p>
        <p className="text-base font-semibold">
          {session?.user?.email || "Dashboard"}
        </p>
      </div>
      <AppButton variant="outline" onClick={handleLogout}>
        <LogOut className="mr-2 h-4 w-4" /> Logout
      </AppButton>
    </div>
  );
}
