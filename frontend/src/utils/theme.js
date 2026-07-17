// Theme persistence helper. The storefront currently ships in light mode;
// this module provides the storage primitives so a theme never resets after a
// refresh and can be applied before React paints (see public/index.html).
export const getTheme = () => {
  try {
    const t = localStorage.getItem('theme');
    return t === 'dark' || t === 'light' ? t : 'light';
  } catch {
    return 'light';
  }
};

export const setTheme = (theme) => {
  try {
    const value = theme === 'dark' ? 'dark' : 'light';
    localStorage.setItem('theme', value);
    document.documentElement.setAttribute('data-theme', value);
  } catch {
    /* ignore */
  }
};

export const applyStoredTheme = () => {
  try {
    const t = localStorage.getItem('theme');
    if (t === 'dark' || t === 'light') {
      document.documentElement.setAttribute('data-theme', t);
    }
  } catch {
    /* ignore */
  }
};
