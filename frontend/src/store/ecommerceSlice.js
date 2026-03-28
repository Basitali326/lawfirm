"use client";

import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  cartDrawerOpen: false,
  cartCount: 0,
  cartKey: null,
};

const ecommerceSlice = createSlice({
  name: "ecommerce",
  initialState,
  reducers: {
    openCartDrawer(state) {
      state.cartDrawerOpen = true;
    },
    closeCartDrawer(state) {
      state.cartDrawerOpen = false;
    },
    toggleCartDrawer(state) {
      state.cartDrawerOpen = !state.cartDrawerOpen;
    },
    setCartKey(state, action) {
      state.cartKey = action.payload || null;
    },
    setCartCount(state, action) {
      state.cartCount = Number(action.payload || 0);
    },
  },
});

export const { openCartDrawer, closeCartDrawer, toggleCartDrawer, setCartKey, setCartCount } = ecommerceSlice.actions;
export default ecommerceSlice.reducer;
