// src/utils/textUtils.ts
// Robust text utilities for cleaning HTML and processing diary content

/**
 * Strip HTML tags and decode entities from RichEditor output
 * Specifically handles RichEditor's HTML pollution (e.g., &nbsp;, <br>)
 * Aggressively handles double encoding and nested entities
 * 
 * @param html - HTML string from RichEditor
 * @returns Clean plain text
 */
export const stripHtml = (html: string): string => {
  if (!html) return '';

  let text = html;

  // 1. Remove HTML tags first
  text = text.replace(/<[^>]*>?/gm, '');

  // 2. Handle line breaks and paragraphs before entity decoding
  text = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '');

  // 3. Decode entities (Handle double encoding like &amp;nbsp;)
  // Process multiple times to handle nested encoding
  let previousText = '';
  let iterations = 0;
  const maxIterations = 5; // Prevent infinite loops
  
  while (text !== previousText && iterations < maxIterations) {
    previousText = text;
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/')
      .replace(/&#47;/g, '/')
      .replace(/&apos;/g, "'");
    iterations++;
  }

  // 4. Final pass: Ensure no remaining HTML entities
  // Handle any remaining encoded entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');

  // 5. Trim extra whitespace and normalize line breaks
  text = text
    .replace(/\n\s*\n/g, '\n') // Remove multiple line breaks
    .replace(/\s\s+/g, ' ') // Replace multiple spaces with single space
    .trim();

  return text;
};

/**
 * Extract plain text from HTML with better handling of RichEditor output
 * This is a more robust version specifically for diary entries
 * 
 * @param html - HTML content from RichEditor
 * @returns Clean plain text ready for display or analysis
 */
export const extractPlainText = (html: string): string => {
  return stripHtml(html);
};

/**
 * Truncate text to a maximum length with ellipsis
 * 
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text with ellipsis if needed
 */
export const truncateText = (text: string, maxLength: number = 100): string => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

/**
 * Sanitize text for safe display (remove potentially problematic characters)
 * 
 * @param text - Text to sanitize
 * @returns Sanitized text
 */
export const sanitizeText = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .trim();
};

