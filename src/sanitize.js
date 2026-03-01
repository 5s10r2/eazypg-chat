import DOMPurify from 'dompurify';
import { marked } from 'marked';

export function safeParse(md) {
  return DOMPurify.sanitize(marked.parse(md));
}

export function safeParseInline(md) {
  return DOMPurify.sanitize(marked.parseInline(md));
}
