
export default function AdminDashboard({
  adminKey = "",
  setAdminKey,
  adminOrders = [],
  loadAdminOrders,
  updateAdminOrderStatus,
  adminLoading = false,
  adminError = "",
  adminMessage = "",
  adminOrderId = "",
  setAdminOrderId,
  adminStatus = "Preparing",
  setAdminStatus,
  updatingStatus = false,
}) {
  const statuses = ["Pending", "Preparing", "Ready", "Completed"];

  return (
    <main className="qb-section qb-admin-page">
      <div className="qb-section-heading">
        <span className="qb-eyebrow">RESTAURANT MANAGEMENT</span>
        <h1>Admin Dashboard</h1>
        <p>Manage incoming orders and kitchen status.</p>
      </div>

      <section className="qb-admin-panel">
        <h2>Admin Access</h2>
        <p>Enter your admin key to load and manage orders.</p>

        <label htmlFor="qb-admin-key">Admin Key</label>
        <input
          id="qb-admin-key"
          type="password"
          value={adminKey}
          onChange={(event) => setAdminKey(event.target.value)}
          placeholder="Enter admin key"
          autoComplete="off"
        />

        <button
          type="button"
          className="qb-primary-btn"
          onClick={loadAdminOrders}
          disabled={adminLoading || !adminKey.trim()}
        >
          {adminLoading ? "Loading..." : "Load Orders"}
        </button>

        {adminError && (
          <p className="qb-admin-error" role="alert">
            {adminError}
          </p>
        )}
      </section>

      <section className="qb-admin-orders">
        <div className="qb-admin-orders-heading">
          <div>
            <h2>Orders</h2>
            <p>{adminOrders.length} orders loaded</p>
          </div>

          <button
            type="button"
            className="qb-secondary-btn"
            onClick={loadAdminOrders}
            disabled={adminLoading || !adminKey.trim()}
          >
            Refresh
          </button>
        </div>

        {adminOrders.length === 0 ? (
          <p>No orders loaded yet. Enter your admin key first.</p>
        ) : (
          adminOrders.map((order) => (
            <article
              className="qb-admin-order-card"
              key={order.order_id}
            >
              <h3>{order.order_id}</h3>
              <p>
                <strong>Customer:</strong>{" "}
                {order.customer_name || "Customer"}
              </p>
              <p>
                <strong>Token:</strong> {order.token || "—"}
              </p>
              <p>
                <strong>Total:</strong>{" "}
                PKR {Number(order.total || 0).toLocaleString("en-PK")}
              </p>
              <p>
                <strong>Current status:</strong> {order.status}
              </p>

              {Array.isArray(order.items) && (
                <div>
                  <strong>Items</strong>
                  {order.items.map((item, index) => (
                    <p key={`${item.id || item.name}-${index}`}>
                      {item.name || item.item_name || item.id} ×{" "}
                      {item.quantity || item.qty || 1}
                    </p>
                  ))}
                </div>
              )}
            </article>
          ))
        )}
      </section>

      <section className="qb-admin-panel">
        <h2>Update Order Status</h2>

        <form
          onSubmit={updateAdminOrderStatus}
          className="qb-admin-access-form"
        >
          <label htmlFor="qb-admin-order-id">Order ID</label>
          <input
            id="qb-admin-order-id"
            value={adminOrderId}
            onChange={(event) => setAdminOrderId(event.target.value)}
            placeholder="e.g. ORD-1234"
            required
          />

          <label htmlFor="qb-admin-status">New Status</label>
          <select
            id="qb-admin-status"
            value={adminStatus}
            onChange={(event) => setAdminStatus(event.target.value)}
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="qb-primary-btn"
            disabled={updatingStatus || !adminKey.trim()}
          >
            {updatingStatus ? "Updating..." : "Update Status"}
          </button>
        </form>

        {adminMessage && (
          <p aria-live="polite">{adminMessage}</p>
        )}
      </section>
    </main>
  );
}
