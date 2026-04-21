import { useEffect, useState } from "react";

function DocumentEmailModal({
  customerEmail = "",
  defaultMessageBody = "",
  defaultSubject = "",
  documentLabel = "document",
  error = "",
  isLoading = false,
  onClose,
  onSubmit
}) {
  const [recipientEmail, setRecipientEmail] = useState(customerEmail);
  const [subject, setSubject] = useState(defaultSubject);
  const [messageBody, setMessageBody] = useState(defaultMessageBody);

  useEffect(() => {
    setRecipientEmail(customerEmail || "");
  }, [customerEmail]);

  useEffect(() => {
    setSubject(defaultSubject || "");
  }, [defaultSubject]);

  useEffect(() => {
    setMessageBody(defaultMessageBody || "");
  }, [defaultMessageBody]);

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit?.({
      recipientEmail,
      subject,
      messageBody
    });
  }

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
          <div>
            <strong id="document-email-title">Send {documentLabel} by email</strong>
            <span>A branded email with the PDF attachment and secure share link will be sent.</span>
          </div>
          <button className="secondary-button" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <label className="document-share-field" htmlFor="document-email-recipient">
          Recipient email
        </label>
        <input
          id="document-email-recipient"
          onChange={(event) => setRecipientEmail(event.target.value)}
          placeholder="customer@example.com"
          type="email"
          value={recipientEmail}
        />

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

        <label className="document-share-field" htmlFor="document-email-message">
          Message
        </label>
        <textarea
          id="document-email-message"
          onChange={(event) => setMessageBody(event.target.value)}
          rows="8"
          value={messageBody}
        />

        {error ? (
          <div className="form-error" role="alert">
            <strong>Email failed</strong>
            <span>{error}</span>
          </div>
        ) : null}

        <div className="button-row document-share-actions">
          <button className="primary-button" disabled={isLoading} type="submit">
            {isLoading ? "Sending..." : "Send email"}
          </button>
          <button className="secondary-button" onClick={onClose} type="button">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default DocumentEmailModal;
