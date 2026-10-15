
export default function Cart({
  cart = [],
  customerName = "",
  setCustomerName,
  changeQuantity,
  checkout,
  loading = false,
}) {
  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <main className="qb-section qb-cart-page">
      <div className="qb-section-heading">
        <span className="qb-eyebrow">ALMOST THERE</span>
        <h1>Your Cart</h1>
        <p>Review your items before placing your order.</p>
      </div>

      <div className="qb-cart-page-layout">
        <section className="qb-cart-panel">
          {cart.length === 0 ? (
            <div className="qb-empty-cart">
              <span>🛍️</span>
              <h2>Your cart is empty</h2>
              <p>Head to the menu and add something delicious.</p>
              <a href="/menu" className="qb-primary-btn">
                Explore Menu
              </a>
            </div>
          ) : (
            <>
              <h2>Order Items ({cart.length})</h2>

              <div className="qb-cart-items">
                {cart.map((item) => (
                  <article
                    className="qb-cart-item"
                    key={item.id}
                  >
                    <div className="qb-cart-item-info">
                      <span className="qb-cart-item-emoji">
                        {item.emoji || "🍽️"}
                      </span>
                      <div>
                        <h3>{item.name}</h3>
                        <p>PKR {item.price.toLocaleString("en-PK")} each</p>
                      </div>
                    </div>

                    <div className="qb-cart-item-actions">
                      <div className="qb-quantity-control">
                        <button
                          type="button"
                          onClick={() =>
                            changeQuantity(item.id, -1)
                          }
                          aria-label={`Remove one ${item.name}`}
                        >
                          −
                        </button>

                        <span>{item.quantity}</span>

                        <button
                          type="button"
                          onClick={() =>
                            changeQuantity(item.id, 1)
                          }
                          aria-label={`Add one ${item.name}`}
                        >
                          +
                        </button>
                      </div>

                      <strong>
                        PKR{" "}
                        {(item.price * item.quantity).toLocaleString("en-PK")}
                      </strong>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>

        <aside className="qb-cart-summary">
          <h2>Order Summary</h2>

          <div className="qb-cart-summary-row">
            <span>Items</span>
            <span>
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          </div>

          <div className="qb-cart-summary-row qb-cart-total">
            <span>Total</span>
            <strong>PKR {total.toLocaleString("en-PK")}</strong>
          </div>

          <label htmlFor="qb-customer-name">
            Customer Name
          </label>

          <input
            id="qb-customer-name"
            type="text"
            placeholder="Enter your name"
            value={customerName}
            onChange={(event) =>
              setCustomerName?.(event.target.value)
            }
          />

          <button
            type="button"
            className="qb-primary-btn qb-checkout-btn"
            onClick={checkout}
            disabled={cart.length === 0 || loading}
          >
            {loading ? "Placing Order..." : "Place Order"}
          </button>

          <p className="qb-checkout-note">
            Your order will be submitted to QuickBite for confirmation.
          </p>
        </aside>
      </div>
    </main>
  );
}
