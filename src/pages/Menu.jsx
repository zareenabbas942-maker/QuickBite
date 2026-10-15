
import { useState } from "react";

const categories = ["All", "Burgers", "Pizza", "Sides", "Drinks"];

export default function Menu({ menuItems = [], onAddToCart }) {
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredItems =
    activeCategory === "All"
      ? menuItems
      : menuItems.filter(
          (item) => item.category === activeCategory
        );

  return (
    <main className="qb-section qb-menu-page">
      <div className="qb-section-heading">
        <span className="qb-eyebrow">MADE FOR YOUR CRAVINGS</span>
        <h1>Explore Our Menu</h1>
        <p>
          Discover your favorites and add them to your cart.
        </p>
      </div>

      <div className="qb-menu-filters">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            className={
              activeCategory === category
                ? "qb-filter-btn active"
                : "qb-filter-btn"
            }
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="qb-menu-grid">
        {filteredItems.map((item) => (
          <article className="qb-menu-card" key={item.id}>
            <div className="qb-menu-card-visual">
              <span>{item.emoji}</span>
              <small>{item.category}</small>
            </div>

            <div className="qb-menu-card-content">
              <h2>{item.name}</h2>
              <p>{item.description}</p>

              <div className="qb-menu-card-bottom">
                <strong>
                  PKR {item.price.toLocaleString("en-PK")}
                </strong>

                <button
                  type="button"
                  className="qb-primary-btn"
                  onClick={() => onAddToCart(item)}
                >
                  + Add
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
