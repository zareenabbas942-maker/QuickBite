
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <main className="qb-home">
      <section className="qb-hero">
        <div className="qb-hero-content">
          <span className="qb-eyebrow">
            YOUR SMART RESTAURANT EXPERIENCE
          </span>

          <h1>
            Great food.
            <br />
            <span>Made simple.</span>
          </h1>

          <p>
            Welcome to QuickBite — explore our menu, chat with
            our AI restaurant assistant, and place your order
            with ease.
          </p>

          <div className="qb-hero-actions">
            <Link to="/menu" className="qb-primary-btn">
              Explore Menu
            </Link>

            <Link to="/assistant" className="qb-secondary-btn">
              Chat with AI
            </Link>
          </div>

          <div className="qb-home-highlights">
            <div>
              <strong>Fresh</strong>
              <span>Menu selections</span>
            </div>

            <div>
              <strong>Smart</strong>
              <span>AI ordering</span>
            </div>

            <div>
              <strong>Easy</strong>
              <span>Order tracking</span>
            </div>
          </div>
        </div>

        <div className="qb-hero-visual">
          <div className="qb-food-card">
            <span className="qb-food-emoji">🍔</span>
            <span className="qb-food-tag">QUICKBITE SPECIAL</span>
            <h2>Your next favorite meal.</h2>
            <p>Discover something delicious today.</p>
            <Link to="/menu">View our menu →</Link>
          </div>

          <div className="qb-floating-badge">
            <span>✦</span> Powered by AI
          </div>
        </div>
      </section>

      <section className="qb-home-bottom">
        <p>GOOD FOOD, A SMARTER WAY.</p>
        <h2>Your meal is just a few clicks away.</h2>
        <Link to="/menu" className="qb-primary-btn">
          Start Your Order
        </Link>
      </section>
    </main>
  );
}
