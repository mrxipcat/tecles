import { useEffect, useRef } from "react";
import DOMPurify from "dompurify";

const TOOLBAR_ACTIONS = [
  { command: "bold", label: "N", title: "Negreta" },
  { command: "italic", label: "I", title: "Cursiva" },
  { command: "underline", label: "S", title: "Subratllat" },
  { command: "insertUnorderedList", label: "•", title: "Llista" },
  { command: "insertOrderedList", label: "1.", title: "Llista numerada" },
];

export default function RichTextEditor({ value, onChange, placeholder }) {
  const editorRef = useRef(null);

  useEffect(() => {
    const node = editorRef.current;
    if (node && node.innerHTML !== (value || "")) {
      node.innerHTML = value || "";
    }
    // Només cal sincronitzar quan canvia des de fora (p. ex. en obrir un formulari d'edició).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function emitChange() {
    onChange(editorRef.current.innerHTML);
  }

  function runCommand(command) {
    editorRef.current.focus();
    document.execCommand(command);
    emitChange();
  }

  function insertLink() {
    const url = window.prompt("URL de l'enllaç (https://...)");
    if (!url) return;
    editorRef.current.focus();
    document.execCommand("createLink", false, url);
    const anchors = editorRef.current.querySelectorAll(`a[href="${url}"]`);
    anchors.forEach((a) => {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    });
    emitChange();
  }

  function removeLink() {
    editorRef.current.focus();
    document.execCommand("unlink");
    emitChange();
  }

  function handlePaste(event) {
    event.preventDefault();
    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");
    if (html) {
      document.execCommand("insertHTML", false, DOMPurify.sanitize(html));
    } else {
      document.execCommand("insertText", false, text);
    }
    emitChange();
  }

  return (
    <div className="richtext-editor">
      <div className="richtext-toolbar">
        {TOOLBAR_ACTIONS.map((action) => (
          <button
            key={action.command}
            type="button"
            title={action.title}
            onClick={() => runCommand(action.command)}
          >
            {action.label}
          </button>
        ))}
        <button type="button" title="Insereix un enllaç" onClick={insertLink}>
          🔗
        </button>
        <button type="button" title="Treu l'enllaç" onClick={removeLink}>
          🔗✕
        </button>
      </div>
      <div
        ref={editorRef}
        className="richtext-editable"
        contentEditable
        data-placeholder={placeholder}
        onInput={emitChange}
        onBlur={emitChange}
        onPaste={handlePaste}
      />
    </div>
  );
}
