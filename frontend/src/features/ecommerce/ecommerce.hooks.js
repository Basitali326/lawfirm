"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  addCartItem,
  createCheckout,
  createCollection,
  createCategory,
  createProduct,
  createProductVariant,
  deleteCartItem,
  deleteCategory,
  deleteCollection,
  deleteProduct,
  deleteProductMedia,
  deleteProductVariant,
  getCart,
  getCategory,
  getCollection,
  getOrder,
  getOrderSuccess,
  getProduct,
  getStoreProduct,
  listCategories,
  listCollections,
  listFeaturedProducts,
  listOrders,
  listProducts,
  listStoreCategories,
  listStoreCollections,
  listStoreProducts,
  reorderProductMedia,
  updateCartItem,
  updateCategory,
  updateCollection,
  updateOrderPaymentStatus,
  updateOrderStatus,
  updateProduct,
  updateProductVariant,
  uploadProductMedia,
} from "@/features/ecommerce/ecommerce.api";
import { normalizeError, shapeAxiosError } from "@/lib/errors";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { openCartDrawer, setCartCount, setCartKey } from "@/store/ecommerceSlice";

function useCartKey() {
  const dispatch = useAppDispatch();
  const cartKey = useAppSelector((state) => state.ecommerce.cartKey);
  const setKey = (key) => {
    if (key) {
      dispatch(setCartKey(key));
      if (typeof window !== "undefined") {
        window.localStorage.setItem("ecommerce_cart_key", key);
      }
    }
  };
  return { cartKey, setKey };
}

export function useHydrateCartKey() {
  const dispatch = useAppDispatch();
  return () => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("ecommerce_cart_key");
    if (stored) dispatch(setCartKey(stored));
  };
}

export function useAdminCollectionsQuery(params = {}, options = {}) {
  return useQuery({
    queryKey: ["ecommerce", "collections", params],
    queryFn: () => listCollections(params),
    ...options,
  });
}

export function useAdminCollectionQuery(id, options = {}) {
  return useQuery({
    queryKey: ["ecommerce", "collection", id],
    queryFn: () => getCollection(id),
    enabled: !!id,
    ...options,
  });
}

export function useCollectionMutations() {
  const queryClient = useQueryClient();
  return {
    create: useMutation({
      mutationFn: createCollection,
      onSuccess: () => {
        toast.success("Collection created");
        queryClient.invalidateQueries({ queryKey: ["ecommerce", "collections"] });
      },
      onError: (error) => toast.error(normalizeError(shapeAxiosError(error)).message),
    }),
    update: useMutation({
      mutationFn: ({ id, payload }) => updateCollection(id, payload),
      onSuccess: (_, variables) => {
        toast.success("Collection updated");
        queryClient.invalidateQueries({ queryKey: ["ecommerce", "collections"] });
        queryClient.invalidateQueries({ queryKey: ["ecommerce", "collection", variables.id] });
      },
      onError: (error) => toast.error(normalizeError(shapeAxiosError(error)).message),
    }),
    remove: useMutation({
      mutationFn: deleteCollection,
      onSuccess: () => {
        toast.success("Collection deleted");
        queryClient.invalidateQueries({ queryKey: ["ecommerce", "collections"] });
      },
      onError: (error) => toast.error(normalizeError(shapeAxiosError(error)).message),
    }),
  };
}

export function useAdminCategoriesQuery(params = {}, options = {}) {
  return useQuery({
    queryKey: ["ecommerce", "categories", params],
    queryFn: () => listCategories(params),
    ...options,
  });
}

export function useAdminCategoryQuery(id, options = {}) {
  return useQuery({
    queryKey: ["ecommerce", "category", id],
    queryFn: () => getCategory(id),
    enabled: !!id,
    ...options,
  });
}

export function useCategoryMutations() {
  const queryClient = useQueryClient();
  return {
    create: useMutation({
      mutationFn: createCategory,
      onSuccess: () => {
        toast.success("Category created");
        queryClient.invalidateQueries({ queryKey: ["ecommerce", "categories"] });
      },
      onError: (error) => toast.error(normalizeError(shapeAxiosError(error)).message),
    }),
    update: useMutation({
      mutationFn: ({ id, payload }) => updateCategory(id, payload),
      onSuccess: (_, variables) => {
        toast.success("Category updated");
        queryClient.invalidateQueries({ queryKey: ["ecommerce", "categories"] });
        queryClient.invalidateQueries({ queryKey: ["ecommerce", "category", variables.id] });
      },
      onError: (error) => toast.error(normalizeError(shapeAxiosError(error)).message),
    }),
    remove: useMutation({
      mutationFn: deleteCategory,
      onSuccess: () => {
        toast.success("Category deleted");
        queryClient.invalidateQueries({ queryKey: ["ecommerce", "categories"] });
      },
      onError: (error) => toast.error(normalizeError(shapeAxiosError(error)).message),
    }),
  };
}

export function useAdminProductsQuery(params = {}, options = {}) {
  return useQuery({
    queryKey: ["ecommerce", "products", params],
    queryFn: () => listProducts(params),
    ...options,
  });
}

export function useAdminProductQuery(id, options = {}) {
  return useQuery({
    queryKey: ["ecommerce", "product", id],
    queryFn: () => getProduct(id),
    enabled: !!id,
    ...options,
  });
}

export function useProductMutations() {
  const queryClient = useQueryClient();
  return {
    create: useMutation({
      mutationFn: createProduct,
      onSuccess: () => {
        toast.success("Product created");
        queryClient.invalidateQueries({ queryKey: ["ecommerce", "products"] });
      },
      onError: (error) => toast.error(normalizeError(shapeAxiosError(error)).message),
    }),
    update: useMutation({
      mutationFn: ({ id, payload }) => updateProduct(id, payload),
      onSuccess: (_, variables) => {
        toast.success("Product updated");
        queryClient.invalidateQueries({ queryKey: ["ecommerce", "products"] });
        queryClient.invalidateQueries({ queryKey: ["ecommerce", "product", variables.id] });
      },
      onError: (error) => toast.error(normalizeError(shapeAxiosError(error)).message),
    }),
    remove: useMutation({
      mutationFn: deleteProduct,
      onSuccess: () => {
        toast.success("Product deleted");
        queryClient.invalidateQueries({ queryKey: ["ecommerce", "products"] });
      },
      onError: (error) => toast.error(normalizeError(shapeAxiosError(error)).message),
    }),
    uploadMedia: useMutation({
      mutationFn: ({ productId, formData }) => uploadProductMedia(productId, formData),
      onSuccess: (_, variables) => {
        toast.success("Media uploaded");
        queryClient.invalidateQueries({ queryKey: ["ecommerce", "product", variables.productId] });
        queryClient.invalidateQueries({ queryKey: ["ecommerce", "products"] });
      },
      onError: (error) => toast.error(normalizeError(error).message),
    }),
    deleteMedia: useMutation({
      mutationFn: ({ productId, mediaId }) => deleteProductMedia(productId, mediaId),
      onSuccess: (_, variables) => {
        toast.success("Media removed");
        queryClient.invalidateQueries({ queryKey: ["ecommerce", "product", variables.productId] });
      },
      onError: (error) => toast.error(normalizeError(error).message),
    }),
    reorderMedia: useMutation({
      mutationFn: ({ productId, payload }) => reorderProductMedia(productId, payload),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ["ecommerce", "product", variables.productId] });
      },
      onError: (error) => toast.error(normalizeError(error).message),
    }),
    createVariant: useMutation({
      mutationFn: ({ productId, payload }) => createProductVariant(productId, payload),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ["ecommerce", "product", variables.productId] });
      },
      onError: (error) => toast.error(normalizeError(error).message),
    }),
    updateVariant: useMutation({
      mutationFn: ({ productId, variantId, payload }) => updateProductVariant(productId, variantId, payload),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ["ecommerce", "product", variables.productId] });
      },
      onError: (error) => toast.error(normalizeError(error).message),
    }),
    deleteVariant: useMutation({
      mutationFn: ({ productId, variantId }) => deleteProductVariant(productId, variantId),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ["ecommerce", "product", variables.productId] });
      },
      onError: (error) => toast.error(normalizeError(error).message),
    }),
  };
}

export function useAdminOrdersQuery(params = {}, options = {}) {
  return useQuery({
    queryKey: ["ecommerce", "orders", params],
    queryFn: () => listOrders(params),
    ...options,
  });
}

export function useAdminOrderQuery(id, options = {}) {
  return useQuery({
    queryKey: ["ecommerce", "order", id],
    queryFn: () => getOrder(id),
    enabled: !!id,
    ...options,
  });
}

export function useOrderMutations() {
  const queryClient = useQueryClient();
  return {
    updateStatus: useMutation({
      mutationFn: ({ id, payload }) => updateOrderStatus(id, payload),
      onSuccess: (_, variables) => {
        toast.success("Order status updated");
        queryClient.invalidateQueries({ queryKey: ["ecommerce", "orders"] });
        queryClient.invalidateQueries({ queryKey: ["ecommerce", "order", variables.id] });
      },
      onError: (error) => toast.error(normalizeError(error).message),
    }),
    updatePaymentStatus: useMutation({
      mutationFn: ({ id, payload }) => updateOrderPaymentStatus(id, payload),
      onSuccess: (_, variables) => {
        toast.success("Payment status updated");
        queryClient.invalidateQueries({ queryKey: ["ecommerce", "orders"] });
        queryClient.invalidateQueries({ queryKey: ["ecommerce", "order", variables.id] });
      },
      onError: (error) => toast.error(normalizeError(error).message),
    }),
  };
}

export function useStoreProductsQuery(params = {}, options = {}) {
  return useQuery({
    queryKey: ["store", "products", params],
    queryFn: () => listStoreProducts(params),
    ...options,
  });
}

export function useStoreProductQuery(slug, options = {}) {
  return useQuery({
    queryKey: ["store", "product", slug],
    queryFn: () => getStoreProduct(slug),
    enabled: !!slug,
    ...options,
  });
}

export function useStoreCollectionsQuery(params = {}, options = {}) {
  return useQuery({
    queryKey: ["store", "collections", params],
    queryFn: () => listStoreCollections(params),
    ...options,
  });
}

export function useStoreCategoriesQuery(params = {}, options = {}) {
  return useQuery({
    queryKey: ["store", "categories", params],
    queryFn: () => listStoreCategories(params),
    ...options,
  });
}

export function useFeaturedProductsQuery(params = {}, options = {}) {
  return useQuery({
    queryKey: ["store", "featured-products", params],
    queryFn: () => listFeaturedProducts(params),
    ...options,
  });
}

export function useCartQuery(options = {}) {
  const { cartKey, setKey } = useCartKey();
  const dispatch = useAppDispatch();
  return useQuery({
    queryKey: ["store", "cart", cartKey],
    queryFn: async () => {
      const data = await getCart(cartKey);
      const newKey = data?.meta?.cart_key || data?.data?.guest_token;
      if (newKey) setKey(newKey);
      dispatch(setCartCount(data?.data?.items_count || 0));
      return data;
    },
    ...options,
  });
}

export function useCartMutations() {
  const { cartKey, setKey } = useCartKey();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  const syncCart = (result) => {
    const newKey = result?.meta?.cart_key || result?.data?.guest_token;
    if (newKey) setKey(newKey);
    dispatch(setCartCount(result?.data?.items_count || 0));
    queryClient.setQueryData(["store", "cart", cartKey || newKey], result);
    queryClient.invalidateQueries({ queryKey: ["store", "cart"] });
  };

  return {
    add: useMutation({
      mutationFn: (payload) => addCartItem(payload, cartKey),
      onSuccess: (result) => {
        syncCart(result);
        toast.success("Added to cart");
        dispatch(openCartDrawer());
      },
      onError: (error) => toast.error(normalizeError(error).message),
    }),
    update: useMutation({
      mutationFn: ({ itemId, payload }) => updateCartItem(itemId, payload, cartKey),
      onSuccess: syncCart,
      onError: (error) => toast.error(normalizeError(error).message),
    }),
    remove: useMutation({
      mutationFn: (itemId) => deleteCartItem(itemId, cartKey),
      onSuccess: syncCart,
      onError: (error) => toast.error(normalizeError(error).message),
    }),
  };
}

export function useCheckoutMutation() {
  const { cartKey } = useCartKey();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => createCheckout(payload, cartKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store", "cart"] });
    },
  });
}

export function useOrderSuccessQuery(token, options = {}) {
  return useQuery({
    queryKey: ["store", "order-success", token],
    queryFn: () => getOrderSuccess(token),
    enabled: !!token,
    ...options,
  });
}
