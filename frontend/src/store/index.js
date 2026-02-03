import { configureStore } from "@reduxjs/toolkit";

import uiReducer from "@/store/slices/uiSlice";

export const store = configureStore({
  reducer: {
    ui: uiReducer,
  },
});