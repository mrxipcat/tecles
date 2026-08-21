import DOMPurify from "dompurify";

export default function RichTextContent({ html, className = "" }) {
  if (!html) return null;

  return (
    <div
      className={`rich-text-content ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
    />
  );
}
