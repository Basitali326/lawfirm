"use client";

import axios from "axios";

import { getAccessToken } from "@/lib/authSession";
import { API_BASE_URL } from "@/lib/config";

const apiClient = axios.create({
  baseURL: API_BASE_URL || "/",
  withCredentials: true,
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
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
