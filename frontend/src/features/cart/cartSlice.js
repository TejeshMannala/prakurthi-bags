import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/axios';

export const fetchCart = createAsyncThunk(
  'cart/fetchCart',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/cart');
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch cart');
    }
  }
);

export const addToCart = createAsyncThunk(
  'cart/addToCart',
  async ({ productId, quantity }, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/cart', { productId, quantity });
      return response.data.data; // populated cart
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add to cart');
    }
  }
);

export const updateQuantity = createAsyncThunk(
  'cart/updateQuantity',
  async ({ productId, quantity }, { rejectWithValue }) => {
    try {
      const response = await api.put('/api/cart', { productId, quantity });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update quantity');
    }
  }
);

export const removeFromCart = createAsyncThunk(
  'cart/removeFromCart',
  async (productId, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/api/cart/${productId}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to remove from cart');
    }
  }
);

const initialState = {
  items: [],
  cartTotalAmount: 0,
  loading: false,
  error: null,
};

const calculateTotal = (items) => {
  return items.reduce((total, item) => {
    return total + (item.product?.price || 0) * item.quantity;
  }, 0);
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    // For local testing without backend
    setCartTotal(state, action) {
      state.cartTotalAmount = action.payload;
    },
    clearCartLocal(state) {
      state.items = [];
      state.cartTotalAmount = 0;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Cart
      .addCase(fetchCart.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload?.items || [];
        state.cartTotalAmount = calculateTotal(state.items);
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Add to Cart
      .addCase(addToCart.pending, (state) => {
        state.loading = true;
      })
      .addCase(addToCart.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload?.items || [];
        state.cartTotalAmount = calculateTotal(state.items);
      })
      .addCase(addToCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update Quantity
      .addCase(updateQuantity.fulfilled, (state, action) => {
        state.items = action.payload?.items || [];
        state.cartTotalAmount = calculateTotal(state.items);
      })
      // Remove
      .addCase(removeFromCart.fulfilled, (state, action) => {
        state.items = action.payload?.items || [];
        state.cartTotalAmount = calculateTotal(state.items);
      });
  },
});

export const { setCartTotal, clearCartLocal } = cartSlice.actions;
export default cartSlice.reducer;
