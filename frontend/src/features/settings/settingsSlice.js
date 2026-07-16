import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/axios';

// Global storefront branding/config, loaded once at app start and kept
// fresh via the `settings:updated` content-sync event.
export const fetchSettings = createAsyncThunk(
  'settings/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/api/settings');
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load settings');
    }
  }
);

const initialState = {
  data: {
    companyName: 'Prakruthi Bags',
    logo: '',
    favicon: '',
    currency: '₹',
    gstRate: 0,
    shippingCharges: 0,
    freeShippingLimit: 0,
    announcement: '',
    theme: {},
    socialLinks: {},
    contact: {},
    footerText: 'Crafted with care for the planet.',
    enabledPaymentMethods: [],
    storeLocation: null,
    deliveryPartners: [],
  },
  loading: false,
  loaded: false,
  error: null,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    applySettings: (state, action) => {
      state.data = { ...state.data, ...action.payload };
      state.loaded = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSettings.pending, (state) => { state.loading = true; })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.loaded = true;
        state.data = { ...state.data, ...action.payload };
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message || 'Error';
      });
  },
});

export const { applySettings } = settingsSlice.actions;
export default settingsSlice.reducer;
