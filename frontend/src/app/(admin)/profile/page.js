"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { uploadProfileImage } from "@/features/me/me.api";
import { useMeQuery } from "@/features/me/me.hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AppButton from "@/components/AppButton";
import UserAvatar from "@/components/UserAvatar";
import { Eye, EyeOff } from "lucide-react";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const CROP_CANVAS_SIZE = 280;

function drawCropPreview(canvas, image, zoom, offsetX, offsetY) {
  if (!canvas || !image) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const size = CROP_CANVAS_SIZE;
  canvas.width = size;
  canvas.height = size;
  ctx.clearRect(0, 0, size, size);

  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;
  if (!iw || !ih) return;

  const baseScale = Math.max(size / iw, size / ih);
  const totalScale = baseScale * zoom;
  const drawW = iw * totalScale;
  const drawH = ih * totalScale;
  const maxPanX = Math.max(0, (drawW - size) / 2);
  const maxPanY = Math.max(0, (drawH - size) / 2);

  const dx = (size - drawW) / 2 + (offsetX / 100) * maxPanX;
  const dy = (size - drawH) / 2 + (offsetY / 100) * maxPanY;
  ctx.drawImage(image, dx, dy, drawW, drawH);
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const { data } = useMeQuery();
  const queryClient = useQueryClient();

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropName, setCropName] = useState("");
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffsetX, setCropOffsetX] = useState(0);
  const [cropOffsetY, setCropOffsetY] = useState(0);

  const fileInputRef = useRef(null);
  const cropCanvasRef = useRef(null);
  const cropImageRef = useRef(null);

  const user = useMemo(() => {
    if (data?.user) return data.user;
    if (session?.user) {
      return {
        email: session.user.email,
        first_name: session.user.first_name || session.user.name || "",
        last_name: session.user.last_name || "",
        role: session.role || session.user.role,
      };
    }
    return null;
  }, [data, session]);

  const profileImageUrl = useMemo(() => data?.user?.profile_image_url || null, [data]);
  const firmName = useMemo(() => data?.firm?.name || session?.firm?.name || "-", [data, session]);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: { current_password: "", new_password: "" },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok || body?.success === false) {
        const error = new Error(body?.message || "Request failed");
        error.errors = body?.errors || {};
        error.status = res.status;
        throw error;
      }
      return body;
    },
    onSuccess: () => {
      toast.success("Password updated successfully");
      reset({ current_password: "", new_password: "" });
    },
    onError: (error) => {
      const fieldErrors = error?.errors || {};
      Object.entries(fieldErrors).forEach(([field, messages]) => {
        const message = Array.isArray(messages) ? messages.join(" ") : String(messages);
        setError(field, { type: "server", message });
      });
      toast.error(error?.message || "Unable to update password");
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: async (file) => uploadProfileImage(file),
    onSuccess: async () => {
      toast.success("Profile image updated successfully");
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      setCropOpen(false);
      setCropName("");
      setCropZoom(1);
      setCropOffsetX(0);
      setCropOffsetY(0);
      cropImageRef.current = null;
    },
    onError: (error) => {
      const message =
        error?.response?.data?.errors?.image?.[0] ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to upload image";
      toast.error(message);
    },
  });

  useEffect(() => {
    if (!cropOpen || !cropCanvasRef.current || !cropImageRef.current) return;
    drawCropPreview(cropCanvasRef.current, cropImageRef.current, cropZoom, cropOffsetX, cropOffsetY);
  }, [cropOpen, cropZoom, cropOffsetX, cropOffsetY]);

  const onSubmit = (values) => {
    changePasswordMutation.mutate(values);
  };

  const handleOpenPicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Only JPG, PNG, and WEBP images are allowed");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Image must be 5MB or smaller");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result || "");
      const image = new window.Image();
      image.onload = () => {
        cropImageRef.current = image;
        setCropName(file.name);
        setCropZoom(1);
        setCropOffsetX(0);
        setCropOffsetY(0);
        setCropOpen(true);
        window.requestAnimationFrame(() => {
          if (cropCanvasRef.current) {
            drawCropPreview(cropCanvasRef.current, image, 1, 0, 0);
          }
        });
      };
      image.src = src;
    };
    reader.readAsDataURL(file);
  };

  const handleCancelCrop = () => {
    setCropOpen(false);
    setCropName("");
    setCropZoom(1);
    setCropOffsetX(0);
    setCropOffsetY(0);
    cropImageRef.current = null;
  };

  const handleApplyCrop = async () => {
    if (!cropCanvasRef.current) return;
    const blob = await new Promise((resolve) => {
      cropCanvasRef.current.toBlob((result) => resolve(result), "image/jpeg", 0.92);
    });
    if (!blob) {
      toast.error("Unable to process image");
      return;
    }
    if (blob.size > MAX_IMAGE_SIZE) {
      toast.error("Cropped image is too large. Please reduce zoom and try again.");
      return;
    }

    const file = new File([blob], "profile.jpg", { type: "image/jpeg" });
    uploadImageMutation.mutate(file);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Profile</h1>
        <p className="text-sm text-slate-500">Your account details.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex flex-wrap items-center gap-4">
              <UserAvatar
                name={`${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.email || "User"}
                imageUrl={profileImageUrl}
                size="lg"
                className="h-16 w-16"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">Profile image</p>
                <p className="text-xs text-slate-500">JPG, PNG, WEBP - max 5MB</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileSelected}
              />
              <AppButton type="button" onClick={handleOpenPicker}>
                Upload image
              </AppButton>
            </div>
          </div>
          <Field label="Email" value={user?.email || "-"} />
          <Field label="Role" value={user?.role || "-"} />
          <Field label="Firm" value={firmName} />
          <Field label="First name" value={user?.first_name || "-"} />
          <Field label="Last name" value={user?.last_name || "-"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="current_password">Current Password</Label>
              <div className="relative">
                <Input
                  id="current_password"
                  type={showCurrent ? "text" : "password"}
                  autoComplete="current-password"
                  {...register("current_password", { required: "Current password is required" })}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute inset-y-0 right-2 flex items-center text-slate-500"
                  aria-label={showCurrent ? "Hide current password" : "Show current password"}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.current_password && (
                <p className="text-sm text-red-500">{errors.current_password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_password">New Password</Label>
              <div className="relative">
                <Input
                  id="new_password"
                  type={showNew ? "text" : "password"}
                  autoComplete="new-password"
                  {...register("new_password", { required: "New password is required" })}
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute inset-y-0 right-2 flex items-center text-slate-500"
                  aria-label={showNew ? "Hide new password" : "Show new password"}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.new_password && (
                <p className="text-sm text-red-500">{errors.new_password.message}</p>
              )}
            </div>

            <AppButton
              type="submit"
              loading={changePasswordMutation.isPending}
              disabled={changePasswordMutation.isPending}
              className="w-full sm:w-auto"
            >
              Update Password
            </AppButton>
          </form>
        </CardContent>
      </Card>

      {cropOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Crop profile image</h3>
              <p className="text-xs text-slate-500">{cropName || "Selected image"}</p>
            </div>
            <div className="flex flex-col items-center gap-4">
              <canvas
                ref={cropCanvasRef}
                className="h-[280px] w-[280px] rounded-xl border border-slate-200 bg-slate-100"
              />
              <div className="w-full space-y-3">
                <div>
                  <Label htmlFor="crop_zoom">Zoom</Label>
                  <Input
                    id="crop_zoom"
                    type="range"
                    min="1"
                    max="3"
                    step="0.01"
                    value={cropZoom}
                    onChange={(e) => setCropZoom(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="crop_x">Horizontal</Label>
                  <Input
                    id="crop_x"
                    type="range"
                    min="-100"
                    max="100"
                    step="1"
                    value={cropOffsetX}
                    onChange={(e) => setCropOffsetX(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="crop_y">Vertical</Label>
                  <Input
                    id="crop_y"
                    type="range"
                    min="-100"
                    max="100"
                    step="1"
                    value={cropOffsetY}
                    onChange={(e) => setCropOffsetY(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <AppButton
                type="button"
                className="bg-slate-200 text-slate-800 hover:bg-slate-300"
                onClick={handleCancelCrop}
              >
                Cancel
              </AppButton>
              <AppButton
                type="button"
                onClick={handleApplyCrop}
                loading={uploadImageMutation.isPending}
                disabled={uploadImageMutation.isPending}
              >
                Save image
              </AppButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="space-y-1">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">{value}</div>
    </div>
  );
}
