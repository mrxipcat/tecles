import DOMPurify from "dompurify";

// Descripcions antigues poden tenir enllaços sense protocol (p. ex. "www.instagram.com"),
// que el navegador resoldria com a ruta relativa de la mateixa app. També forcem que
// qualsevol enllaç s'obri en una pestanya nova, independentment de com s'hagi desat.
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName !== "A") return;
  const href = node.getAttribute("href");
  if (href && !/^[a-z][a-z0-9+.-]*:/i.test(href) && !href.startsWith("#")) {
    node.setAttribute("href", `https://${href}`);
  }
  node.setAttribute("target", "_blank");
  node.setAttribute("rel", "noopener noreferrer");
});

export default function RichTextContent({ html, className = "" }) {
  if (!html) return null;

  return (
    <div
      className={`rich-text-content ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
    />
  );
}
