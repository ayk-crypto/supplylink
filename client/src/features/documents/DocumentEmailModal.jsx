import { useEffect, useRef, useState } from "react";

function DocumentEmailModal({
  customerEmail = "",
  defaultMessageBody = "",
  defaultSubject = "",
  documentLabel = "document",
  error = "",
  fallbackShareHint = "",
  isLoading = false,
  onClose,
  onCopyShareLink,
  onSubmit
}) {
  const [recipientEmail, setRecipientEmail] = useState(customerEmail);
  const [subject, setSubject] = useState(defaultSubject);
  const [messageBody, setMessageBody] = useState(defaultMessageBody);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    setRecipientEmail(customerEmail || "");
  }, [customerEmail]);

  useEffect(() => {
    setSubject(defaultSubject || "");
  }, [defaultSubject]);

  useEffect(() => {
    setMessageBody(defaultMessageBody || "");
  }, [defaultMessageBody]);

  useEffect(() => {
    function handleKey(event) {
      if (event.key === "Escape") {
        onClose?.();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit?.({
      recipientEmail,
      subject,
      messageBody
    });
  }

  const docTitle = documentLabel.charAt(0).toUpperCase() + documentLabel.slice(1);

  return (
    <div
      className="modal-backdrop document-share-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
      role="presentation"
    >
      <form
        aria-labelledby="document-email-title"
        aria-modal="true"
        className="document-share-shell document-email-shell"
        onSubmit={handleSubmit}
        role="dialog"
      >
        <div className="document-share-header">
          <div className="document-share-header-main">
            <span className="document-share-icon" aria-hidden="true">
              @
            </span>
            <div>
              <strong id="document-email-title">Send {documentLabel} by email</strong>
              <span>
                A branded email with the PDF attachment and a secure share link will be
                delivered to your recipient.
              </span>
            </div>
          </div>
          <button
            aria-label="Close"
            className="document-share-close"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            x
          </button>
        </div>

        <div className="document-share-body">
          <div className="document-share-field-group">
            <label className="document-share-field" htmlFor="document-email-recipient">
              Recipient email
            </label>
            <input
              autoFocus
              id="document-email-recipient"
              onChange={(event) => setRecipientEmail(event.target.value)}
              placeholder="customer@example.com"
              required
              type="email"
              value={recipientEmail}
            />
            <small className="document-share-help">
              We use this address as the "To:" for the message.
            </small>
          </div>

          <div className="document-share-field-group">
            <label className="document-share-field" htmlFor="document-email-subject">
              Subject
            </label>
            <input
              id="document-email-subject"
              onChange={(event) => setSubject(event.target.value)}
              placeholder={`Subject for this ${documentLabel}`}
              type="text"
              value={subject}
            />
          </div>

          <div className="document-share-field-group">
            <label className="document-share-field" htmlFor="document-email-message">
              Message
            </label>
            <textarea
              id="document-email-message"
              onChange={(event) => setMessageBody(event.target.value)}
              rows="8"
              value={messageBody}
            />
            <small className="document-share-help">
              {`The ${docTitle} PDF will be attached automatically.`}
            </small>
          </div>
        </div>

        {error ? (
          <div className="form-error" role="alert">
            <strong>Email failed</strong>
            <span>{error}</span>
            {fallbackShareHint ? (
              <div className="document-email-fallback">
                <span>{fallbackShareHint}</span>
                {onCopyShareLink ? (
                  <button className="secondary-button" onClick={onCopyShareLink} type="button">
                    Copy secure link
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="document-share-footer">
          <button className="secondary-button" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="primary-button" disabled={isLoading} type="submit">
            {isLoading ? "Sending..." : "Send email"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default DocumentEmailModal;
