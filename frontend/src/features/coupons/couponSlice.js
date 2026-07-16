import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/axios';

export const fetchAvailableCoupons = createAsyncThunk(
  'coupons/fetchAvailable',
  async (orderAmount, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/coupons/available?orderAmount=${orderAmount || 0}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch coupons');
    }
  }
);

export const applyCoupon = createAsyncThunk(
  'coupons/apply',
  async ({ code, orderAmount }, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/coupons/validate', { code, orderAmount });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Invalid coupon');
    }
  }
);

const couponSlice = createSlice({
  name: 'coupons',
  initialState: {
    availableCoupons: [],
    appliedCoupon: null,
    loading: false,
    error: null,
    successMessage: null,
  },
  reducers: {
    removeCoupon(state) {
      state.appliedCoupon = null;
      state.successMessage = null;
      state.error = null;
    },
    clearMessages(state) {
      state.error = null;
      state.successMessage = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAvailableCoupons.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAvailableCoupons.fulfilled, (state, action) => {
        state.loading = false;
        state.availableCoupons = action.payload;
      })
      .addCase(fetchAvailableCoupons.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(applyCoupon.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(applyCoupon.fulfilled, (state, action) => {
        state.loading = false;
        state.appliedCoupon = action.payload.coupon || action.payload;
        state.successMessage = `Coupon ${(action.payload.coupon || action.payload).code} Applied Successfully!`;
      })
      .addCase(applyCoupon.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { removeCoupon, clearMessages } = couponSlice.actions;
export default couponSlice.reducer;
