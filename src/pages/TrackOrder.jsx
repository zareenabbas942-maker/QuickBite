
export default function TrackOrder({
  orderId = "",
  setOrderId,
  trackOrder,
  tracking = false,
  trackingResult = "",
}) {
  return (
    <main className="qb-section qb-tracking-page">
      <div className="qb-section-heading">
        <span className="qb-eyebrow">YOUR ORDER, YOUR WAY</span>
        <h1>Track Your Order</h1>
        <p>Enter your Order ID to check its latest status.</p>
      </div>

      <section className="qb-tracking-card">
        <div className="qb-tracking-icon">📦</div>
        <h2>Where's your order?</h2>
        <p>
          Use the Order ID you received when placing your order.
        </p>

        <form
          className="qb-tracking-form"
          onSubmit={trackOrder}
        >
          <label htmlFor="qb-order-id">Order ID</label>

          <input
            id="qb-order-id"
            type="text"
            value={orderId}
            onChange={(event) => setOrderId(event.target.value)}
            placeholder="e.g. ORD-1234"
            required
            disabled={tracking}
          />

          <button
            type="submit"
            className="qb-primary-btn"
            disabled={tracking || !orderId.trim()}
          >
            {tracking ? "Checking..." : "Track Order"}
          </button>
        </form>

        {trackingResult && (
          <pre className="qb-checkout-result" aria-live="polite">
            {trackingResult}
          </pre>
        )}
      </section>
    </main>
  );
}
