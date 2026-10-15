
export default function Assistant({
  chatMessages = [],
  message = "",
  setMessage,
  sendMessage,
  loading = false,
}) {
 
function handleSubmit(event) {
  if (message.trim() && !loading) {
    sendMessage?.(event);
  } else {
    event.preventDefault();
  }
}

  return (
    <main className="qb-section qb-assistant-page">
      <div className="qb-section-heading">
        <span className="qb-eyebrow">YOUR SMART FOOD COMPANION</span>
        <h1>QuickBite AI Assistant</h1>
        <p>
          Tell our assistant what you would like to order or ask
          a question about our restaurant menu.
        </p>
      </div>

      <section className="qb-assistant-panel">
        <div className="qb-assistant-header">
          <span className="qb-assistant-avatar">✦</span>
          <div>
            <h2>QuickBite Assistant</h2>
            <p>AI-powered restaurant assistance</p>
          </div>
          <span className="qb-assistant-indicator">Ready</span>
        </div>

        <div className="qb-chat-messages" aria-live="polite">
          {chatMessages.length === 0 ? (
            <div className="qb-chat-welcome">
              <span>👋</span>
              <h3>What can I help you with?</h3>
              <p>
                Try asking for a menu item or describe the food
                you would like to order.
              </p>

              <div className="qb-chat-suggestions">
                <button
                  type="button"
                  onClick={() =>
                    setMessage?.("I want 2 Zinger Burgers")
                  }
                >
                  I want 2 Zinger Burgers
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setMessage?.("Show me the menu and prices")
                  }
                >
                  Show me the menu and prices
                </button>
              </div>
            </div>
          ) : (
            chatMessages.map((item, index) => {
              const text =
                typeof item === "string"
                  ? item
                  : item.message ?? item.content ?? item.text ?? "";

              const role =
                typeof item === "string"
                  ? "assistant"
                  : item.role ?? item.sender ?? "assistant";

              return (
                <div
                  key={item.id ?? index}
                  className={`qb-chat-message ${
                    role === "user" ? "user" : "assistant"
                  }`}
                >
                  <p>{text}</p>
                </div>
              );
            })
          )}
        </div>

        <form className="qb-chat-form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={message}
            onChange={(event) => setMessage?.(event.target.value)}
            placeholder="Type your message..."
            aria-label="Message to AI assistant"
            disabled={loading}
          />

          <button
            type="submit"
            className="qb-primary-btn"
            disabled={loading || !message.trim()}
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </form>

        <p className="qb-chat-note">
          Order prices and confirmation should be verified by
          QuickBite's menu and backend.
        </p>
      </section>
    </main>
  );
}
