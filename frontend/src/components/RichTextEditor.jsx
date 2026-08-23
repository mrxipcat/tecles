import { useEffect, useRef } from "react";
import DOMPurify from "dompurify";
import { useTranslation } from "react-i18next";

const TOOLBAR_ACTIONS = [
  { command: "bold", label: "N", titleKey: "bold" },
  { command: "italic", label: "I", titleKey: "italic" },
  { command: "underline", label: "S", titleKey: "underline" },
  { command: "insertUnorderedList", label: "•", titleKey: "unorderedList" },
  { command: "insertOrderedList", label: "1.", titleKey: "orderedList" },
];

export default function RichTextEditor({ value, onChange, placeholder }) {
  const { t } = useTranslation("richTextEditor");
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
    const input = window.prompt(t("linkUrlPrompt"));
    if (!input) return;
    // Sense protocol (p. ex. "www.instagram.com"), el navegador el resoldria com una
    // ruta relativa de la mateixa app en lloc d'un enllaç extern.
    const url = /^[a-z][a-z0-9+.-]*:/i.test(input) ? input : `https://${input}`;
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
            title={t(action.titleKey)}
            onClick={() => runCommand(action.command)}
          >
            {action.label}
          </button>
        ))}
        <button type="button" title={t("insertLink")} onClick={insertLink}>
          🔗
        </button>
        <button type="button" title={t("removeLink")} onClick={removeLink}>
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
