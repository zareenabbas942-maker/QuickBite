
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

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "openai/gpt-oss-20b"

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
    if not GROQ_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Groq API key is not configured."
        )

    menu_text = "\n".join(
        f"- {item['name']}: PKR {item['price']}"
        for item in MENU
    )

    system_prompt = f"""
You are QuickBite's friendly AI Restaurant Assistant.
Reply in the customer's language when possible.

OFFICIAL MENU:
{menu_text}

STRICT RULES:
1. Recommend only items from the official menu.
2. Use exact menu names and individual prices.
3. Never invent items, prices, discounts, order IDs or statuses.
4. Never calculate or state a combined order total.
5. If asked for a total, direct the customer to Cart or Checkout.
6. Guide customers to add items to cart and checkout.
7. Never claim items were added to cart unless confirmed.
8. Never claim an order was placed unless confirmed.
9. For order tracking, direct customers to Track Order.
10. The backend is the source of truth for prices and orders.
"""

    total_keywords = (
        "total", "altogether", "combined", "grand total",
        "bill", "cost for all", "price for all"
    )

    if any(
        keyword in request.message.lower()
        for keyword in total_keywords
    ):
        return {
            "reply": (
                "Please check your Cart or Checkout for the "
                "exact total. QuickBite calculates your bill "
                "using official menu prices."
            )
        }

    try:
        response = requests.post(
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": GROQ_MODEL,
                "messages": [
                    {
                        "role": "system",
                        "content": system_prompt
                    },
                    {
                        "role": "user",
                        "content": request.message
                    }
                ],
                "temperature": 0.2,
                "max_tokens": 300
            },
            timeout=30
        )

        response.raise_for_status()
        data = response.json()

        answer = (
            data["choices"][0]["message"]["content"] or ""
        ).strip()

        if not answer:
            return {
                "reply": "Sorry, please try asking again."
            }

        return {"reply": answer}

    
    except requests.HTTPError as error:
        status = (
            error.response.status_code
            if error.response is not None
            else "unknown"
        )
        print(f"Groq API HTTP error: {status}", flush=True)

        if error.response is not None:
            try:
                groq_error = error.response.json().get("error", {})
                print(
                    f"Groq error type: {groq_error.get('type', 'unknown')}",
                    flush=True
                )
                print(
                    f"Groq error code: {groq_error.get('code', 'unknown')}",
                    flush=True
                )
            except (ValueError, AttributeError):
                pass

        raise HTTPException(
            status_code=503,
            detail="AI service is temporarily unavailable."
        )

    except (requests.RequestException, KeyError, IndexError,
            TypeError, ValueError) as error:
        print(
            f"Groq connection or response error: {type(error).__name__}",
            flush=True
        )
        raise HTTPException(
            status_code=503,
            detail="AI service is temporarily unavailable."
        )


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
