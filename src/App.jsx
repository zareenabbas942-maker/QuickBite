
import { useState } from "react";
import "./App.css";

const GRADIO_URL = "https://YOUR-CURRENT-COLAB-LINK.gradio.live";

const menuItems = [
  { id: "B01", name: "Zinger Burger", category: "Burgers", price: 450, emoji: "🍔", description: "Crispy chicken, lettuce and mayo" },
  { id: "B02", name: "Chicken Burger", category: "Burgers", price: 400, emoji: "🍔", description: "Classic chicken burger" },
  { id: "P01", name: "Chicken Pizza", category: "Pizza", price: 700, emoji: "🍕", description: "Chicken pizza with melted cheese" },
  { id: "F01", name: "French Fries", category: "Sides", price: 200, emoji: "🍟", description: "Golden crispy fries" },
  { id: "D01", name: "Cola", category: "Drinks", price: 150, emoji: "🥤", description: "Chilled soft drink" },
];

async function callGradio(endpoint, data = {}) {
  const response = await fetch(`/gradio_api/call/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: Object.values(data) }),
  });

  if (!response.ok) {
    throw new Error(`Gradio request failed (${response.status}) for ${endpoint}`);
  }

  const result = await response.json();
  if (!result.event_id) throw new Error(`No event ID returned for ${endpoint}`);

  const resultResponse = await fetch(
    `/gradio_api/call/${endpoint}/${result.event_id}`
  );

  if (!resultResponse.ok) {
    throw new Error(`Could not retrieve ${endpoint} result`);
  }

  const resultText = await resultResponse.text();
  const lines = resultText.split("\n");
  const completeIndex = lines.findIndex(
    (line) => line.trim() === "event: complete"
  );

  if (completeIndex === -1) throw new Error(`No completed result for ${endpoint}`);

  const dataLine = lines
    .slice(completeIndex + 1)
    .find((line) => line.startsWith("data: "));

  if (!dataLine) throw new Error(`Empty result for ${endpoint}`);

  const output = JSON.parse(dataLine.slice(6));
  return Array.isArray(output) ? output[0] : output;
}

function displayResult(result) {
  if (typeof result === "string") return result;
  if (result && typeof result === "object") {
    return result.text ?? result.message ?? result.response ?? JSON.stringify(result, null, 2);
  }
  return String(result ?? "");
}

function App() {
  const [cart, setCart] = useState([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [chat, setChat] = useState([
    {
      role: "assistant",
      text: "Assalam-o-Alaikum! Welcome to QuickBite. What would you like to order today?",
    },
  ]);
  const [checkoutResult, setCheckoutResult] = useState("");

  const [orderId, setOrderId] = useState("");
  const [tracking, setTracking] = useState(false);
  const [trackingResult, setTrackingResult] = useState("");
  
  const [adminOrders, setAdminOrders] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminOrderId, setAdminOrderId] = useState("");
  const [adminStatus, setAdminStatus] = useState("Preparing");
  const [adminMessage, setAdminMessage] = useState("");


  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  function addToCart(product) {
    setCheckoutResult("");
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...current, { ...product, quantity: 1 }];
    });
  }

  function changeQuantity(id, amount) {
    setCheckoutResult("");
    setCart((current) =>
      current
        .map((item) =>
          item.id === id
            ? { ...item, quantity: item.quantity + amount }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  async function sendMessage(event) {
    event.preventDefault();
    const text = message.trim();
    if (!text || sending) return;

    setChat((current) => [...current, { role: "user", text }]);
    setMessage("");
    setSending(true);

    try {
      const result = await callGradio("quickbite_chat", { message: text });
      setChat((current) => [
        ...current,
        { role: "assistant", text: displayResult(result) },
      ]);
    } catch (error) {
      console.error(error);
      setChat((current) => [
        ...current,
        {
          role: "assistant",
          text: "AI service se connection nahi ho saka. Colab aur Gradio link check karo.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function checkout() {
    if (cart.length === 0) {
      setCheckoutResult("Your cart is empty. Please add an item first.");
      return;
    }

    if (placingOrder) return;

    setPlacingOrder(true);
    setCheckoutResult("Connecting to QuickBite order system...");

    try {
      const result = await callGradio("place_website_order", {
        items_json: JSON.stringify(
          cart.map((item) => ({
            id: item.id,
            quantity: item.quantity,
          }))
        ),
      });

      const confirmation = displayResult(result);

      setCheckoutResult(
        `Order confirmation response:\n\n${confirmation}\n\nWebsite cart total: PKR ${total}`
      );

      setChat((current) => [
        ...current,
        { role: "assistant", text: `Order confirmation:\n${confirmation}` },
      ]);
    } catch (error) {
      console.error(error);
      setCheckoutResult(
        `Order confirmation failed: ${error.message}\n\nPlease check Order Tracking before retrying, in case the order was already saved.`
      );
    } finally {
      setPlacingOrder(false);
    }
  }

  async function trackOrder(event) {
    event.preventDefault();
    const id = orderId.trim();

    if (!id) {
      setTrackingResult("Please enter your Order ID.");
      return;
    }

    setTracking(true);
    setTrackingResult("");

    try {
      const result = await callGradio("track_order", { order_id: id });
      setTrackingResult(displayResult(result));
    } catch (error) {
      console.error(error);
      setTrackingResult(
        `Tracking request failed: ${error.message}\n\nCheck that the Gradio endpoint is named "track_order" and accepts one Order ID input.`
      );
    } finally {
      setTracking(false);
    }
  }

    async function loadAdminOrders() {
    setAdminLoading(true);
    setAdminError("");

    try {
      const result = await callGradio("refresh_admin_orders", {});
      let rows = result;

      if (
        result &&
        !Array.isArray(result) &&
        Array.isArray(result.data)
      ) {
        const headers = result.headers || [
          "Order ID",
          "Token",
          "Items",
          "Total (PKR)",
          "Status",
          "Created At",
        ];

        rows = result.data.map((row) => {
          if (!Array.isArray(row)) {
            return row;
          }

          return Object.fromEntries(
            headers.map((header, index) => [
              header,
              row[index],
            ])
          );
        });
      }

      if (!Array.isArray(rows)) {
        throw new Error("Unexpected orders data format.");
      }

      setAdminOrders(rows);
    } catch (error) {
      console.error("Admin orders error:", error);

      setAdminError(
        `Orders load nahi huay: ${error.message}`
      );
    } finally {
      setAdminLoading(false);
    }
  }

  async function updateAdminOrderStatus(event) {
    event.preventDefault();

    const id = adminOrderId.trim();

    if (!id) {
      setAdminMessage("Please enter an Order ID.");
      return;
    }

    setAdminMessage("");

    try {
      const result = await callGradio("kitchen_status", {
        order_id: id,
        status: adminStatus,
      });

      setAdminMessage(displayResult(result));

      await loadAdminOrders();
    } catch (error) {
      console.error("Status update error:", error);

      setAdminMessage(
        `Status update failed: ${error.message}`
      );
    }
  }

  return (
    <div className="quickbite-app">
      <header className="qb-header">
        <a className="qb-brand" href="#home">
          <span className="qb-brand-icon">🍔</span>
          <span><strong>QuickBite</strong><small>AI Restaurant Assistant</small></span>
        </a>

        <nav className="qb-nav">
          <a href="#home">Home</a>
          <a href="#menu">Menu</a>
          <a href="#assistant">AI Assistant</a>
          <a href="#tracking">Track Order</a>
          <a href="#admin">Admin</a>
        </nav>

        <a className="qb-cart-link" href="#cart">🛒 Cart ({totalItems})</a>
      </header>

      <main>
        <section className="qb-hero" id="home">
          <div className="qb-hero-content">
            <span className="qb-eyebrow">✨ YOUR SMART FOOD COMPANION</span>
            <h1>Cravings made<br /><span>easy with AI.</span></h1>
            <p>
              Tell our AI assistant what you want to eat in your own words.
              Explore the menu and enjoy a simpler ordering experience.
            </p>
            <div className="qb-hero-actions">
              <a className="qb-primary-button" href="#menu">Explore Menu →</a>
              <a className="qb-secondary-button" href="#assistant">💬 Chat with AI</a>
            </div>
            <div className="qb-hero-note">
              <span>✓ Natural-language ordering</span>
              <span>✓ Clear menu prices</span>
            </div>
          </div>

          <div className="qb-hero-art" aria-label="Burger illustration">
            <div className="qb-food-circle">
              <span>🍔</span>
              <span className="qb-floating-food qb-food-one">🍟</span>
              <span className="qb-floating-food qb-food-two">🥤</span>
            </div>
            <div className="qb-food-caption">
              <strong>Fresh. Fast. Delicious.</strong>
              <span>Your next favourite meal awaits.</span>
            </div>
          </div>
        </section>

        <section className="qb-section" id="menu">
          <div className="qb-section-heading">
            <div>
              <span className="qb-eyebrow">MADE FOR YOUR CRAVINGS</span>
              <h2>Explore our menu</h2>
              <p>Good food, straightforward prices.</p>
            </div>
            <span className="qb-menu-count">{menuItems.length} items</span>
          </div>

          <div className="qb-menu-grid">
            {menuItems.map((item) => (
              <article className="qb-menu-card" key={item.id}>
                <div className="qb-menu-emoji">{item.emoji}</div>
                <div className="qb-menu-details">
                  <span className="qb-category">{item.category}</span>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <div className="qb-menu-bottom">
                    <strong>PKR {item.price}</strong>
                    <button className="qb-add-button" type="button" onClick={() => addToCart(item)}>
                      + Add
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="qb-order-layout">
          <div className="qb-assistant-panel" id="assistant">
            <div className="qb-panel-heading">
              <div className="qb-assistant-avatar">🤖</div>
              <div>
                <h2>QuickBite AI</h2>
                <p><span className="qb-status-dot" /> Restaurant assistant</p>
              </div>
            </div>

            <div className="qb-chat-messages" aria-live="polite">
              {chat.map((item, index) => (
                <div className={`qb-chat-row ${item.role === "user" ? "qb-user-row" : ""}`} key={`${index}-${item.role}`}>
                  <div className={`qb-chat-bubble ${item.role === "user" ? "qb-user-bubble" : "qb-ai-bubble"}`}>
                    {item.text}
                  </div>
                </div>
              ))}
              {sending && <div className="qb-chat-bubble qb-ai-bubble">Thinking...</div>}
            </div>

            <form className="qb-chat-form" onSubmit={sendMessage}>
              <input
                type="text"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="e.g. 2 Zinger Burgers and 1 Cola"
                aria-label="Message QuickBite AI"
                disabled={sending}
              />
              <button type="submit" disabled={sending || !message.trim()}>
                {sending ? "..." : "Send ➤"}
              </button>
            </form>
            <p className="qb-chat-hint">Try asking about menu items or describing your order.</p>
          </div>

          <aside className="qb-cart-panel" id="cart">
            <div className="qb-cart-heading">
              <div>
                <span className="qb-eyebrow">YOUR SELECTION</span>
                <h2>Your cart 🛒</h2>
              </div>
              <span className="qb-cart-count">{totalItems}</span>
            </div>

            {cart.length === 0 ? (
              <div className="qb-empty-cart">
                <span>🛍️</span>
                <h3>Your cart is empty</h3>
                <p>Add something delicious from our menu.</p>
                <a href="#menu">Browse menu ↑</a>
              </div>
            ) : (
              <div className="qb-cart-items">
                {cart.map((item) => (
                  <div className="qb-cart-item" key={item.id}>
                    <span className="qb-cart-item-emoji">{item.emoji}</span>
                    <div className="qb-cart-item-info">
                      <strong>{item.name}</strong>
                      <span>PKR {item.price} each</span>
                      <div className="qb-quantity-controls">
                        <button type="button" aria-label={`Remove one ${item.name}`} onClick={() => changeQuantity(item.id, -1)}>−</button>
                        <span>{item.quantity}</span>
                        <button type="button" aria-label={`Add one ${item.name}`} onClick={() => changeQuantity(item.id, 1)}>+</button>
                      </div>
                    </div>
                    <strong className="qb-item-subtotal">PKR {item.price * item.quantity}</strong>
                  </div>
                ))}
              </div>
            )}

            <div className="qb-cart-total"><span>Total</span><strong>PKR {total}</strong></div>
            <button className="qb-checkout-button" type="button" onClick={checkout} disabled={placingOrder}>
              {placingOrder ? "Processing..." : "Confirm Order →"}
            </button>

            {checkoutResult && <pre className="qb-checkout-result">{checkoutResult}</pre>}
            <p className="qb-cart-note">Prices are shown in Pakistani Rupees (PKR).</p>
          </aside>
        </section>

        <section className="qb-section" id="tracking">
          <div className="qb-section-heading">
            <div>
              <span className="qb-eyebrow">ORDER UPDATES</span>
              <h2>Track your order 📦</h2>
              <p>Enter the Order ID from your confirmation.</p>
            </div>
          </div>

          <div className="qb-cart-panel">
            <form className="qb-chat-form" onSubmit={trackOrder}>
              <input
                type="text"
                value={orderId}
                onChange={(event) => setOrderId(event.target.value)}
                placeholder="e.g. ORD-9600"
                aria-label="Order ID"
                disabled={tracking}
              />
              <button type="submit" disabled={tracking || !orderId.trim()}>
                {tracking ? "Checking..." : "Track Order"}
              </button>
            </form>

            {trackingResult && (
              <pre className="qb-checkout-result" aria-live="polite">
                {trackingResult}
              </pre>
            )}
          </div>
        </section>
                <section className="qb-section" id="admin">
          <div className="qb-section-heading">
            <div>
              <span className="qb-eyebrow">RESTAURANT MANAGEMENT</span>
              <h2>Admin Dashboard</h2>
              <p>Manage restaurant orders.</p>
            </div>
          </div>

          <div className="qb-cart-panel">
            <button
              className="qb-checkout-button"
              type="button"
              onClick={loadAdminOrders}
              disabled={adminLoading}
            >
              {adminLoading ? "Loading..." : "Refresh All Orders"}
            </button>

            {adminError && (
              <p>{adminError}</p>
            )}

            {adminOrders.map((order, index) => (
              <div key={order.order_id || index}>
                <p>Order ID: {order["Order ID"] || order.order_id}</p>
                <p>Token: {order.Token || order.token}</p>
                <p>Total: PKR {order["Total (PKR)"] ?? order.total}</p>
                <p>Status: {order.Status || order.status}</p>
                <hr />
              </div>
            ))}

            <h3>Update Order Status</h3>

            <form onSubmit={updateAdminOrderStatus}>
              <input
                type="text"
                value={adminOrderId}
                onChange={(event) => setAdminOrderId(event.target.value)}
                placeholder="e.g. ORD-9600"
                aria-label="Order ID"
              />

              <select
                value={adminStatus}
                onChange={(event) => setAdminStatus(event.target.value)}
              >
                <option value="Pending">Pending</option>
                <option value="Preparing">Preparing</option>
                <option value="Ready">Ready</option>
                <option value="Completed">Completed</option>
              </select>

              <button type="submit">Update Status</button>
            </form>

            {adminMessage && <p>{adminMessage}</p>}
          </div>
        </section>
      </main>

      <footer className="qb-footer">
        <a className="qb-brand" href="#home">
          <span className="qb-brand-icon">🍔</span>
          <strong>QuickBite</strong>
        </a>
        <p>Smarter ordering, one bite at a time.</p>
        <span>AI Restaurant Assistant · Project Prototype</span>
      </footer>
    </div>
  );
}

export default App;
