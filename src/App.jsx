
import { useEffect, useState } from "react";
import { Routes, Route, NavLink } from "react-router-dom";
import "./App.css";

import Home from "./pages/Home";
import Menu from "./pages/Menu";
import Cart from "./pages/Cart";
import TrackOrder from "./pages/TrackOrder";
import AdminDashboard from "./pages/AdminDashboard";
import Assistant from "./pages/Assistant";

// Local testing ke liye FastAPI backend
const API_BASE_URL = "http://127.0.0.1:8000";

const initialMenu = [
  { id: "B01", name: "Zinger Burger", category: "Burgers", price: 450, emoji: "🍔", description: "Crispy chicken, lettuce and mayo" },
  { id: "B02", name: "Chicken Burger", category: "Burgers", price: 400, emoji: "🍔", description: "Classic chicken burger" },
  { id: "P01", name: "Chicken Pizza", category: "Pizza", price: 700, emoji: "🍕", description: "Chicken pizza with melted cheese" },
  { id: "F01", name: "Fries", category: "Sides", price: 200, emoji: "🍟", description: "Golden crispy fries" },
  { id: "D01", name: "Cola", category: "Drinks", price: 150, emoji: "🥤", description: "Chilled soft drink" },
];

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = result.detail;
    const message = typeof detail === "string"
      ? detail
      : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return result;
}

function formatOrder(order) {
  return JSON.stringify(order, null, 2);
}

function App() {
  const [menuItems, setMenuItems] = useState(initialMenu);
  const [menuMessage, setMenuMessage] = useState("");

  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState("");
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
  const [lastOrderId, setLastOrderId] = useState("");

  const [orderId, setOrderId] = useState("");
  const [tracking, setTracking] = useState(false);
  const [trackingResult, setTrackingResult] = useState("");

  const [adminOrders, setAdminOrders] = useState([]);
  const [adminKey, setAdminKey] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminOrderId, setAdminOrderId] = useState("");
  const [adminStatus, setAdminStatus] = useState("Preparing");
  const [adminMessage, setAdminMessage] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // Backend se official menu load karo
  useEffect(() => {
    let active = true;

    apiRequest("/api/menu")
      .then((result) => {
        if (!active || !Array.isArray(result.menu)) return;

        const menuWithDisplayInfo = result.menu.map((item) => {
          const displayItem = initialMenu.find(
            (product) => product.id === item.id
          );

          return {
            ...item,
            category: displayItem?.category || "Menu",
            emoji: displayItem?.emoji || "🍽️",
            description: displayItem?.description || "",
          };
        });

        setMenuItems(menuWithDisplayInfo);
        setMenuMessage("");
      })
      .catch((error) => {
        console.error("Menu loading error:", error);
        if (active) {
          setMenuMessage(
            "Backend menu load nahi hua. Local menu display ho raha hai."
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

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
      const result = await apiRequest("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message: text }),
      });

      setChat((current) => [
        ...current,
        {
          role: "assistant",
          text: result.reply || "Sorry, I could not generate a reply.",
        },
      ]);
    } catch (error) {
      console.error("AI chat error:", error);

      setChat((current) => [
        ...current,
        {
          role: "assistant",
          text: `AI connection nahi ho saka: ${error.message}. Backend aur Ollama check karo.`,
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

    if (!customerName.trim()) {
      setCheckoutResult("Please enter your name before confirming your order.");
      return;
    }

    if (placingOrder) return;

    setPlacingOrder(true);
    setCheckoutResult("Connecting to QuickBite order system...");

    try {
      const result = await apiRequest("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          customer_name: customerName.trim(),
          items: cart.map((item) => ({
            id: item.id,
            quantity: item.quantity,
          })),
        }),
      });

      setLastOrderId(result.order_id);
      setOrderId(result.order_id);
      setCheckoutResult(
        `Order placed successfully!\n\nOrder ID: ${result.order_id}\nToken: ${result.token}\nTotal: PKR ${result.total}\nStatus: ${result.status}\n\nPlease save your Order ID for tracking.`
      );

      setChat((current) => [
        ...current,
        {
          role: "assistant",
          text: `Your order has been placed successfully! Order ID: ${result.order_id}. Token: ${result.token}. Total: PKR ${result.total}. Status: ${result.status}.`,
        },
      ]);

      // Backend confirmation ke baad hi cart empty karo
      setCart([]);
    } catch (error) {
      console.error("Checkout error:", error);

      setCheckoutResult(
        `Order place nahi ho saka: ${error.message}\n\nPlease check your backend connection before trying again.`
      );
    } finally {
      setPlacingOrder(false);
    }
  }

  async function trackOrder(event) {
    event.preventDefault();

    const id = orderId.trim().toUpperCase();

    if (!id) {
      setTrackingResult("Please enter your Order ID.");
      return;
    }

    setTracking(true);
    setTrackingResult("");

    try {
      const result = await apiRequest(
        `/api/orders/${encodeURIComponent(id)}`
      );
      setTrackingResult(formatOrder(result));
    } catch (error) {
      console.error("Order tracking error:", error);
      setTrackingResult(`Tracking failed: ${error.message}`);
    } finally {
      setTracking(false);
    }
  }

async function loadAdminOrders() {
  setAdminLoading(true);
  setAdminError("");

  try {
    const result = await apiRequest("/api/orders", {
      headers: {
        "X-Admin-Key": adminKey,
      },
    });

    setAdminOrders(result.orders || []);
  } catch (error) {
    console.error("Admin orders error:", error);
    setAdminError(`Orders load nahi huay: ${error.message}`);
  } finally {
    setAdminLoading(false);
  }
}

  async function updateAdminOrderStatus(event) {
    event.preventDefault();

    const id = adminOrderId.trim().toUpperCase();

    if (!id) {
      setAdminMessage("Please enter an Order ID.");
      return;
    }

    setUpdatingStatus(true);
    setAdminMessage("");

    try {
     
const result = await apiRequest(
  `/api/orders/${encodeURIComponent(id)}/status`,
  {
    method: "PATCH",
    headers: {
      "X-Admin-Key": adminKey,
    },
    body: JSON.stringify({ status: adminStatus }),
  }
);


      setAdminMessage(
        `Order ${result.order.order_id} status updated to ${result.order.status}.`
      );

      await loadAdminOrders();
    } catch (error) {
      console.error("Status update error:", error);
      setAdminMessage(`Status update failed: ${error.message}`);
    } finally {
      setUpdatingStatus(false);
    }
  }

return (
  <div className="quickbite-app">
    <header className="qb-header">
      <NavLink className="qb-brand" to="/">
        <span className="qb-brand-icon">🍔</span>
        <span>
          <strong>QuickBite</strong>
          <small>AI Restaurant Assistant</small>
        </span>
      </NavLink>

      <nav className="qb-nav">
        <NavLink to="/">Home</NavLink>
        <NavLink to="/menu">Menu</NavLink>
        <NavLink to="/assistant">AI Assistant</NavLink>
        <NavLink to="/track-order">Track Order</NavLink>
        <NavLink to="/admin">Admin</NavLink>
      </nav>

      <NavLink className="qb-cart-link" to="/cart">
        🛒 Cart ({totalItems})
      </NavLink>
    </header>

    <Routes>
      <Route path="/" element={<Home />} />

      <Route
        path="/menu"
        element={
          <Menu
            menuItems={menuItems}
            onAddToCart={addToCart}
          />
        }
      />

      <Route
        path="/assistant"
        element={
          <Assistant
            chatMessages={chat}
            message={message}
            setMessage={setMessage}
            sendMessage={sendMessage}
            loading={sending}
          />
        }
      />

      <Route
        path="/cart"
        element={
          <Cart
            cart={cart}
            customerName={customerName}
            setCustomerName={setCustomerName}
            changeQuantity={changeQuantity}
            checkout={checkout}
            loading={placingOrder}
          />
        }
      />

      <Route
        path="/track-order"
        element={
          <TrackOrder
            orderId={orderId}
            setOrderId={setOrderId}
            trackOrder={trackOrder}
            tracking={tracking}
            trackingResult={trackingResult}
          />
        }
      />

      <Route
        path="/admin"
        element={
          <AdminDashboard
            adminKey={adminKey}
            setAdminKey={setAdminKey}
            adminOrders={adminOrders}
            loadAdminOrders={loadAdminOrders}
            updateAdminOrderStatus={updateAdminOrderStatus}
            adminLoading={adminLoading}
            adminError={adminError}
            adminMessage={adminMessage}
            adminOrderId={adminOrderId}
            setAdminOrderId={setAdminOrderId}
            adminStatus={adminStatus}
            setAdminStatus={setAdminStatus}
            updatingStatus={updatingStatus}
          />
        }
      />

      <Route
        path="*"
        element={
          <main className="qb-section">
            <h1>Page not found</h1>
            <NavLink to="/">Return Home</NavLink>
          </main>
        }
      />
    </Routes>

    <footer className="qb-footer">
      <NavLink className="qb-brand" to="/">
        <span className="qb-brand-icon">🍔</span>
        <strong>QuickBite</strong>
      </NavLink>
      <p>Smarter ordering, one bite at a time.</p>
      <span>AI Restaurant Assistant · Project Prototype</span>
    </footer>
  </div>
);
}

export default App;
