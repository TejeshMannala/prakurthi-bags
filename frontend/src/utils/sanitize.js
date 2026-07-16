import DOMPurify from 'dompurify';

export const sanitize = (html) => DOMPurify.sanitize(html || '', { ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'span', 'hr', 'pre', 'code'], ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'target', 'rel', 'colspan', 'rowspan', 'width', 'height'] });
