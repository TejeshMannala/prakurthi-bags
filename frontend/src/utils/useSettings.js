import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchSettings, applySettings } from '../features/settings/settingsSlice';
import { onContentChanged } from './contentSync';

// Returns the global storefront settings and keeps them in sync:
//  - loads once on first mount
//  - refetches whenever the admin edits settings (socket/visibility)
export const useSettings = () => {
  const dispatch = useDispatch();
  const { data, loading, loaded, error } = useSelector((s) => s.settings);

  useEffect(() => {
    if (!loaded) dispatch(fetchSettings());
  }, [dispatch, loaded]);

  useEffect(() => {
    const off = onContentChanged('settings:updated', () => {
      dispatch(fetchSettings());
    });
    return off;
  }, [dispatch]);

  return { settings: data, loading, loaded, error, refresh: () => dispatch(fetchSettings()) };
};

// Helper to apply settings edits performed in the SAME tab (e.g. from an
// admin preview) without waiting for a round-trip.
export const useApplySettings = () => {
  const dispatch = useDispatch();
  return (payload) => dispatch(applySettings(payload));
};
