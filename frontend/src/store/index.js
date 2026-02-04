"use client";

import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";

import uiReducer from "@/store/uiSlice";

export const store = configureStore({
  reducer: {
    ui: uiReducer,
  },
});

export function ReduxProvider({ children }) {
  return <Provider store={store}>{children}</Provider>;
}
