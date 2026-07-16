import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/axios';

export const fetchAddresses = createAsyncThunk('address/fetchAll', async (_, { rejectWithValue }) => {
  try {
      const { data } = await api.get('/api/addresses');
    return data;
  } catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed to fetch addresses'); }
});

export const createAddress = createAsyncThunk('address/create', async (addressData, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/api/addresses', addressData);
    return data;
  } catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed to save address'); }
});

export const updateAddress = createAsyncThunk('address/update', async ({ id, ...addressData }, { rejectWithValue }) => {
  try {
    const { data } = await api.put(`/api/addresses/${id}`, addressData);
    return data;
  } catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed to update address'); }
});

export const deleteAddress = createAsyncThunk('address/delete', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/api/addresses/${id}`);
    return id;
  } catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed to delete address'); }
});

export const setDefaultAddress = createAsyncThunk('address/setDefault', async (id, { rejectWithValue }) => {
  try {
    const { data } = await api.patch(`/api/addresses/${id}/default`);
    return data;
  } catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed to set default address'); }
});

const addressSlice = createSlice({
  name: 'address',
  initialState: {
    addresses: [],
    selectedAddress: null,
    loading: false,
    error: null,
  },
  reducers: {
    selectAddress(state, action) {
      state.selectedAddress = action.payload;
    },
    clearAddressError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAddresses.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchAddresses.fulfilled, (state, action) => {
        state.loading = false;
        state.addresses = action.payload;
        if (!state.selectedAddress && action.payload.length > 0) {
          state.selectedAddress = action.payload.find(a => a.isDefault) || action.payload[0];
        }
      })
      .addCase(fetchAddresses.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(createAddress.fulfilled, (state, action) => {
        state.addresses.unshift(action.payload);
        state.selectedAddress = action.payload;
      })
      .addCase(updateAddress.fulfilled, (state, action) => {
        const idx = state.addresses.findIndex(a => a._id === action.payload._id);
        if (idx >= 0) state.addresses[idx] = action.payload;
        if (state.selectedAddress?._id === action.payload._id) state.selectedAddress = action.payload;
      })
      .addCase(deleteAddress.fulfilled, (state, action) => {
        state.addresses = state.addresses.filter(a => a._id !== action.payload);
        if (state.selectedAddress?._id === action.payload) state.selectedAddress = state.addresses[0] || null;
      });
  },
});

export const { selectAddress, clearAddressError } = addressSlice.actions;
export default addressSlice.reducer;
