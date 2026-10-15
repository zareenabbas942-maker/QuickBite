
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Literal
from pathlib import Path
from datetime import datetime
import sqlite3
import random
import requests
import json
import os

app = FastAPI(title="QuickBite AI Restaurant Assistant")

ADMIN_KEY = os.getenv("QUICKBITE_ADMIN_KEY", "")


def verify_admin_key(x_admin_key: str = Header(default="")):
    if not ADMIN_KEY or x_admin_key != ADMIN_KEY:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: Invalid admin key."
        )


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

MENU = [
    {"id": "B01", "name": "Zinger Burger", "price": 450},
    {"id": "B02", "name": "Chicken Burger", "price": 400},
    {"id": "P01", "name": "Chicken Pizza", "price": 700},
    {"id": "F01", "name": "Fries", "price": 200},
    {"id": "D01", "name": "Cola", "price": 150},
]

OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
OLLAMA_MODEL = "qwen2.5:3b"

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "restaurant_orders.db"

STATUSES = ["Pending", "Preparing", "Ready", "Completed"]


def get_connection():
    connection = sqlite3.connect(DB_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA busy_timeout = 10000")
    return connection


def init_db():
    with get_connection() as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                order_id TEXT PRIMARY KEY,
                token TEXT NOT NULL,
                customer_name TEXT NOT NULL,
                items_json TEXT NOT NULL,
                total INTEGER NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)


init_db()


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


class OrderItem(BaseModel):
    id: str
    quantity: int = Field(ge=1, le=50)


class CreateOrderRequest(BaseModel):
    customer_name: str = Field(min_length=1, max_length=100)
    items: list[OrderItem] = Field(min_length=1, max_length=30)


class StatusRequest(BaseModel):
    status: Literal["Pending", "Preparing", "Ready", "Completed"]


def calculate_order(items):
    menu_lookup = {item["id"]: item for item in MENU}
    combined = {}

    for requested in items:
        item_id = requested.id
        quantity = requested.quantity

        if item_id not in menu_lookup:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown menu item: {item_id}"
            )

        combined[item_id] = combined.get(item_id, 0) + quantity

        if combined[item_id] > 50:
            raise HTTPException(
                status_code=400,
                detail="Maximum 50 of each menu item per order."
            )

    final_items = []
    total = 0

    for item_id, quantity in combined.items():
        menu_item = menu_lookup[item_id]
        subtotal = menu_item["price"] * quantity
        total += subtotal

        final_items.append({
            "id": item_id,
            "name": menu_item["name"],
            "price": menu_item["price"],
            "quantity": quantity,
            "subtotal": subtotal,
        })

    return final_items, total


def serialize_order(row):
    result = dict(row)
    result["items"] = json.loads(result.pop("items_json"))
    return result


@app.get("/")
def home():
    return {
        "message": "QuickBite backend is running!",
        "status": "success"
    }


@app.get("/api/health")
def health():
    return {"status": "healthy"}


@app.get("/api/menu")
def get_menu():
    return {"menu": MENU}


@app.post("/api/chat")
def chat(request: ChatRequest):
    menu_text = "\n".join(
        f"- {item['name']}: PKR {item['price']}"
        for item in MENU
    )

    prompt = f"""
You are the friendly QuickBite AI Restaurant Assistant.
Reply in the customer's language when possible.

OFFICIAL MENU:
{menu_text}

STRICT RULES:
1. Recommend only items listed in the official menu.
2. Use the exact official item names and individual prices.
3. Never invent menu items, prices, discounts, order IDs, tokens, or statuses.
4. Never calculate, estimate, or state a combined order total.
5. You may repeat individual item prices from the official menu.
6. If asked for a total, direct the customer to the cart or checkout.
7. Guide customers who want to order to add items to their cart and use checkout.
8. Do not claim items were added to the cart unless the application confirms it.
9. Do not claim an order was placed or saved unless the backend confirms it.
10. Do not pretend to access the database or track orders.
    Direct customers to the Track Order page.
11. If information is unavailable, politely say so instead of guessing.
12. The backend checkout is the source of truth for prices,
    quantities, totals, and order confirmation.

Customer message: {request.message}
Assistant:
"""

    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False
            },
            timeout=120
        )
   
        response.raise_for_status()
        answer = response.json().get("response", "").strip()

        if not answer:
            return {"reply": "Sorry, please try asking again."}

        # Prevent the AI from presenting an unreliable combined total.
        total_keywords = (
            "total", "altogether", "combined", "grand total",
            "bill", "cost for all", "price for all"
        )
        asks_for_total = any(
            keyword in request.message.lower()
            for keyword in total_keywords
        )

        if asks_for_total:
            return {
                "reply": (
                    "Please check your Cart or Checkout for the exact "
                    "total. QuickBite calculates your bill using the "
                    "official menu prices."
                )
            }

        return {"reply": answer}

    except requests.RequestException:
        return {
            "reply": (
                "AI service is unavailable. Please check that Ollama "
                "is running and qwen2.5:3b is installed."
            )
        }


@app.post("/api/orders")
def create_order(request: CreateOrderRequest):
    items, total = calculate_order(request.items)

    for _ in range(10):
        order_id = f"ORD-{random.randint(1000, 9999)}"
        token = f"T{random.randint(100, 999)}"

        try:
            with get_connection() as connection:
                connection.execute(
                    """
                    INSERT INTO orders
                    (order_id, token, customer_name, items_json,
                     total, status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        order_id,
                        token,
                        request.customer_name.strip(),
                        json.dumps(items),
                        total,
                        "Pending",
                        datetime.now().isoformat(timespec="seconds"),
                    ),
                )

            return {
                "message": "Order placed successfully!",
                "order_id": order_id,
                "token": token,
                "customer_name": request.customer_name.strip(),
                "items": items,
                "total": total,
                "status": "Pending",
            }

        except sqlite3.IntegrityError:
            continue

    raise HTTPException(
        status_code=500,
        detail="Could not generate a unique order ID. Please retry."
    )


@app.get("/api/orders/{order_id}")
def track_order(order_id: str):
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM orders WHERE order_id = ?",
            (order_id.strip().upper(),),
        ).fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="Order not found.")

    return serialize_order(row)


@app.get("/api/orders")
def get_all_orders(
    admin_key: str = Depends(verify_admin_key),
):
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM orders ORDER BY created_at DESC"
        ).fetchall()

    return {"orders": [serialize_order(row) for row in rows]}


@app.patch("/api/orders/{order_id}/status")
def update_order_status(
    order_id: str,
    request: StatusRequest,
    admin_key: str = Depends(verify_admin_key),
):
    with get_connection() as connection:
        cursor = connection.execute(
            "UPDATE orders SET status = ? WHERE order_id = ?",
            (request.status, order_id.strip().upper()),
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Order not found."
            )

        row = connection.execute(
            "SELECT * FROM orders WHERE order_id = ?",
            (order_id.strip().upper(),),
        ).fetchone()

    return {
        "message": "Order status updated successfully.",
        "order": serialize_order(row),
    }
