// Resolve the best display image for a product regardless of how the
// `images` field is shaped (array of {url} objects, array of strings,
// or a single `image`/`thumbnail` string). A `?v=<updatedAt>` cache-buster
// is appended so the browser always fetches the latest image after an edit.
export const getProductImage = (product) => {
  if (!product) return '';
  const images = product.images;
  let url = '';
  if (Array.isArray(images) && images.length > 0) {
    const first = images[0];
    if (typeof first === 'string') url = first;
    else if (first && typeof first === 'object' && first.url) url = first.url;
  }
  if (!url) url = product.thumbnail || product.image || '';
  return withCacheBust(url, product);
};

// Resolve all display images for a product as an array of URLs, preserving
// order. Falls back to a single image when only `image`/`thumbnail` exist.
export const getProductImages = (product) => {
  if (!product) return [];
  const out = [];
  const push = (val) => {
    if (!val) return;
    if (typeof val === 'string') {
      if (!out.includes(val)) out.push(val);
    } else if (val && typeof val === 'object' && val.url) {
      if (!out.includes(val.url)) out.push(val.url);
    }
  };
  if (Array.isArray(product.images)) product.images.forEach(push);
  push(product.thumbnail);
  push(product.image);
  return out.map((u) => withCacheBust(u, product));
};

const withCacheBust = (url, product) => {
  if (!url || !product || !product.updatedAt) return url || '';
  if (/^data:/i.test(url)) return url;
  const sep = url.includes('?') ? '&' : '?';
  const ts = new Date(product.updatedAt).getTime();
  return `${url}${sep}v=${ts}`;
};

export default getProductImage;
