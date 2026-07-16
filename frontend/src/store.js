import { configureStore } from '@reduxjs/toolkit';
import cartReducer from './features/cart/cartSlice';
import couponReducer from './features/coupons/couponSlice';
import categoryReducer from './features/categories/categorySlice';
import authReducer from './features/auth/authSlice';
import addressReducer from './features/address/addressSlice';
import settingsReducer from './features/settings/settingsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    coupons: couponReducer,
    categories: categoryReducer,
    address: addressReducer,
    settings: settingsReducer,
  },
});
