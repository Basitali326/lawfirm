"use client";

import axios from "axios";

import { getAccessToken } from "@/lib/authSession";
import { ensureAccessToken, tokenStore } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";

const apiClient = axios.create({
  baseURL: API_BASE_URL || "/",
  withCredentials: true,
});

apiClient.interceptors.request.use(async (config) => {
  let token = await getAccessToken();
  if (!token) {
    try {
      token = await ensureAccessToken();
    } catch (_) {
      token = null;
    }
  }
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  const firmId = tokenStore.getFirmId();
  if (firmId) {
    config.headers = config.headers || {};
    config.headers["X-FIRM-ID"] = firmId;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const body = response?.data;
    if (body && Object.prototype.hasOwnProperty.call(body, "data")) {
      return body.data;
    }
    return body;
  },
  (error) => {
    const original = error?.config || {};
    if (error?.response?.status === 401 && !original._retry) {
      original._retry = true;
      return ensureAccessToken()
        .then((newAccess) => {
          if (newAccess) {
            original.headers = original.headers || {};
            original.headers.Authorization = `Bearer ${newAccess}`;
            return apiClient(original);
          }
          throw error;
        })
        .catch((refreshErr) => {
          tokenStore.clear();
          if (typeof window !== "undefined") {
            const current = window.location.pathname;
            if (!current.startsWith("/login") && !current.startsWith("/session-expired")) {
              window.location.href = "/session-expired";
            }
          }
          return Promise.reject(refreshErr);
        });
    }
    if (error?.response?.data?.error) {
      const errPayload = error.response.data.error;
      const wrapped = new Error(errPayload.message || "Request failed.");
      wrapped.code = errPayload.code;
      wrapped.details = errPayload.details;
      wrapped.status = error.response.status;
      wrapped.__fromAxios = true;
      return Promise.reject(wrapped);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
