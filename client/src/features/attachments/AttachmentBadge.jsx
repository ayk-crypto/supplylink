function AttachmentBadge({ count, onClick }) {
  if (!count) return null;
  const label = `${count} attachment${count === 1 ? "" : "s"}`;
  const Tag = typeof onClick === "function" ? "button" : "span";
  const props =
    Tag === "button"
      ? { type: "button", onClick, "aria-label": label, title: label }
      : { "aria-label": label, title: label };
  return (
    <Tag className="attachment-badge" {...props}>
      <svg
        aria-hidden="true"
        focusable="false"
        height="12"
        viewBox="0 0 24 24"
        width="12"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
      <span>{count}</span>
    </Tag>
  );
}

export default AttachmentBadge;
