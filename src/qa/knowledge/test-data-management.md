# Test Data Management

## Principle
Test data should be programmatically generated through factories and builders, providing isolated, predictable, and self-documenting data for every test scenario.

## Rationale
Hardcoded test data is the silent killer of test suites. When dozens of tests share a
single JSON fixture file, changing one field can cascade failures across unrelated tests.
When tests depend on manually inserted database rows, they become order-dependent and
impossible to run in parallel. When test data is copy-pasted, it grows stale and drifts
from production schemas.

The factory pattern solves this by defining a single source of truth for how to build
valid test entities, with sensible defaults that can be overridden per-test. The builder
pattern adds fluent chaining for complex objects with many optional fields. Faker
libraries generate realistic-looking data that catches edge cases (unicode names, long
emails) that static fixtures miss. Database seeding strategies (transaction rollback,
truncation, dedicated schemas) ensure each test starts from a known state without
polluting other tests. Together these patterns make tests self-documenting: reading the
test reveals exactly which data properties matter for that scenario.

## Pattern Examples

### 1. Factory Pattern (JavaScript)

```javascript
// tests/factories/user-factory.js
const { faker } = require("@faker-js/faker");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");

// Default values represent a valid, minimal user.
const userDefaults = () => ({
  id: uuidv4(),
  email: faker.internet.email().toLowerCase(),
  name: faker.person.fullName(),
  role: "viewer",
  passwordHash: bcrypt.hashSync("TestPass1!", 10),
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: null,
});

/**
 * Create a plain user object (no database interaction).
 * Override any field by passing it in the overrides object.
 */
function buildUser(overrides = {}) {
  return { ...userDefaults(), ...overrides };
}

/**
 * Insert a user into the database and return the full record.
 * Useful for integration tests that need a real database row.
 */
async function createUser(db, overrides = {}) {
  const user = buildUser(overrides);

  await db.query(
    `INSERT INTO users (id, email, name, role, password_hash, is_active, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [user.id, user.email, user.name, user.role, user.passwordHash, user.isActive, user.createdAt]
  );

  return user;
}

/**
 * Create multiple users at once.
 */
async function createUsers(db, count, overrides = {}) {
  const users = [];
  for (let i = 0; i < count; i++) {
    users.push(await createUser(db, overrides));
  }
  return users;
}

module.exports = { buildUser, createUser, createUsers };
```

**Usage in tests:**

```javascript
// tests/api/users.test.js
const { buildUser, createUser } = require("../factories/user-factory");

describe("User API", () => {
  it("returns only active users", async () => {
    // The test explicitly sets the fields that matter for THIS test.
    // All other fields use sensible defaults from the factory.
    await createUser(db, { isActive: true, name: "Active Alice" });
    await createUser(db, { isActive: false, name: "Inactive Bob" });

    const res = await api.get("/api/users?active=true");

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe("Active Alice");
  });

  it("validates email uniqueness", async () => {
    const existingUser = await createUser(db, { email: "taken@example.com" });

    // buildUser creates a plain object (no DB insert) for the request body.
    const duplicate = buildUser({ email: "taken@example.com" });

    const res = await api.post("/api/users", duplicate);
    expect(res.status).toBe(409);
  });
});
```

### 2. Builder Pattern (JavaScript)

```javascript
// tests/factories/order-builder.js
const { faker } = require("@faker-js/faker");
const { v4: uuidv4 } = require("uuid");

class OrderBuilder {
  constructor() {
    // Start with a valid default order.
    this._order = {
      id: uuidv4(),
      customerId: uuidv4(),
      status: "pending",
      items: [],
      shippingAddress: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state({ abbreviated: true }),
        zip: faker.location.zipCode(),
        country: "US",
      },
      currency: "USD",
      subtotal: 0,
      tax: 0,
      total: 0,
      createdAt: new Date().toISOString(),
      notes: null,
    };
  }

  // Fluent setters return `this` for chaining.
  withCustomer(customerId) {
    this._order.customerId = customerId;
    return this;
  }

  withStatus(status) {
    this._order.status = status;
    return this;
  }

  withItem(item) {
    const fullItem = {
      productId: item.productId || uuidv4(),
      name: item.name || faker.commerce.productName(),
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || parseFloat(faker.commerce.price()),
    };
    this._order.items.push(fullItem);
    return this;
  }

  withItems(count) {
    for (let i = 0; i < count; i++) {
      this.withItem({});
    }
    return this;
  }

  withShipping(address) {
    this._order.shippingAddress = { ...this._order.shippingAddress, ...address };
    return this;
  }

  withNotes(notes) {
    this._order.notes = notes;
    return this;
  }

  // Compute totals based on items and build the final object.
  build() {
    this._order.subtotal = this._order.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );
    this._order.tax = parseFloat((this._order.subtotal * 0.08).toFixed(2));
    this._order.total = parseFloat((this._order.subtotal + this._order.tax).toFixed(2));
    return { ...this._order };
  }
}

// Convenience function.
function anOrder() {
  return new OrderBuilder();
}

module.exports = { OrderBuilder, anOrder };
```

**Usage in tests:**

```javascript
const { anOrder } = require("../factories/order-builder");

it("calculates tax correctly for multi-item orders", () => {
  const order = anOrder()
    .withItem({ name: "Widget", unitPrice: 10.0, quantity: 3 })
    .withItem({ name: "Gadget", unitPrice: 25.0, quantity: 1 })
    .build();

  // Subtotal: 30 + 25 = 55. Tax: 55 * 0.08 = 4.40.
  expect(order.subtotal).toBe(55);
  expect(order.tax).toBe(4.40);
  expect(order.total).toBe(59.40);
});

it("ships to international addresses", () => {
  const order = anOrder()
    .withItems(2)
    .withShipping({ country: "CA", state: "ON", zip: "M5V 2T6" })
    .build();

  expect(order.shippingAddress.country).toBe("CA");
});
```

### 3. Factory Pattern (Python / pytest + Factory Boy)

```python
# tests/factories.py
"""Test data factories using factory_boy."""

import factory
from factory import fuzzy
from datetime import datetime, timezone

from app.models import User, Product, Order, OrderItem


class UserFactory(factory.alchemy.SQLAlchemyModelFactory):
    """Generates valid User instances with sensible defaults."""

    class Meta:
        model = User
        sqlalchemy_session_persistence = "commit"

    id = factory.Faker("uuid4")
    email = factory.Faker("email")
    name = factory.Faker("name")
    role = "viewer"
    password_hash = factory.LazyFunction(
        lambda: "$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWX"
    )
    is_active = True
    created_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))


class AdminUserFactory(UserFactory):
    """A user with admin privileges."""
    role = "admin"
    email = factory.Sequence(lambda n: f"admin-{n}@example.com")


class ProductFactory(factory.alchemy.SQLAlchemyModelFactory):
    class Meta:
        model = Product
        sqlalchemy_session_persistence = "commit"

    id = factory.Faker("uuid4")
    name = factory.Faker("catch_phrase")
    price = fuzzy.FuzzyDecimal(1.00, 999.99, precision=2)
    category = fuzzy.FuzzyChoice(["electronics", "clothing", "home", "books"])
    stock = fuzzy.FuzzyInteger(0, 500)
    is_available = True
    created_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))


class OrderFactory(factory.alchemy.SQLAlchemyModelFactory):
    class Meta:
        model = Order
        sqlalchemy_session_persistence = "commit"

    id = factory.Faker("uuid4")
    customer = factory.SubFactory(UserFactory)
    status = "pending"
    currency = "USD"
    created_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))

    @factory.post_generation
    def items(obj, create, extracted, **kwargs):
        """Allow passing items: OrderFactory(items=3) or items=[item1, item2]."""
        if not create:
            return
        if extracted:
            if isinstance(extracted, int):
                OrderItemFactory.create_batch(extracted, order=obj)
            else:
                for item in extracted:
                    obj.items.append(item)


class OrderItemFactory(factory.alchemy.SQLAlchemyModelFactory):
    class Meta:
        model = OrderItem
        sqlalchemy_session_persistence = "commit"

    id = factory.Faker("uuid4")
    order = factory.SubFactory(OrderFactory)
    product = factory.SubFactory(ProductFactory)
    quantity = fuzzy.FuzzyInteger(1, 10)
    unit_price = factory.LazyAttribute(lambda o: float(o.product.price))
```

**Usage in tests:**

```python
# tests/test_orders.py
from tests.factories import UserFactory, OrderFactory, ProductFactory


class TestOrderAPI:

    def test_only_shows_orders_for_current_user(self, db_session, client):
        alice = UserFactory(name="Alice")
        bob = UserFactory(name="Bob")

        # Create 3 orders for Alice, 1 for Bob.
        OrderFactory.create_batch(3, customer=alice, items=2)
        OrderFactory.create_batch(1, customer=bob, items=1)

        # Alice should only see her 3 orders.
        res = client.get("/api/orders", headers=auth_for(alice))
        assert res.status_code == 200
        assert len(res.json()["data"]) == 3

    def test_out_of_stock_product_cannot_be_ordered(self, db_session, client):
        user = UserFactory()
        out_of_stock = ProductFactory(stock=0, is_available=True)

        res = client.post(
            "/api/orders",
            json={
                "items": [{"productId": str(out_of_stock.id), "quantity": 1}],
            },
            headers=auth_for(user),
        )

        assert res.status_code == 422
        assert "stock" in res.json()["message"].lower()
```

### 4. Database Seeding Script

```javascript
// tests/helpers/seed.js
// Seeds the database with a realistic dataset for integration tests.

const { buildUser } = require("../factories/user-factory");
const { OrderBuilder } = require("../factories/order-builder");
const { faker } = require("@faker-js/faker");

async function seedFullDataset(db) {
  // Create users with specific roles for auth testing.
  const admin = await insertUser(db, buildUser({ role: "admin", email: "admin@test.com" }));
  const editor = await insertUser(db, buildUser({ role: "editor", email: "editor@test.com" }));
  const viewers = [];
  for (let i = 0; i < 10; i++) {
    viewers.push(await insertUser(db, buildUser({ role: "viewer" })));
  }

  // Create products.
  const products = [];
  const categories = ["electronics", "clothing", "home", "books"];
  for (let i = 0; i < 50; i++) {
    products.push(
      await insertProduct(db, {
        id: faker.string.uuid(),
        name: faker.commerce.productName(),
        price: parseFloat(faker.commerce.price()),
        category: faker.helpers.arrayElement(categories),
        stock: faker.number.int({ min: 0, max: 500 }),
      })
    );
  }

  // Create orders.
  for (const viewer of viewers) {
    const orderCount = faker.number.int({ min: 1, max: 5 });
    for (let i = 0; i < orderCount; i++) {
      const builder = new OrderBuilder().withCustomer(viewer.id);
      const itemCount = faker.number.int({ min: 1, max: 4 });
      for (let j = 0; j < itemCount; j++) {
        const product = faker.helpers.arrayElement(products);
        builder.withItem({
          productId: product.id,
          name: product.name,
          unitPrice: product.price,
          quantity: faker.number.int({ min: 1, max: 3 }),
        });
      }
      await insertOrder(db, builder.build());
    }
  }

  return { admin, editor, viewers, products };
}

async function insertUser(db, user) {
  await db.query(
    `INSERT INTO users (id, email, name, role, password_hash, is_active, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [user.id, user.email, user.name, user.role, user.passwordHash, user.isActive, user.createdAt]
  );
  return user;
}

async function insertProduct(db, product) {
  await db.query(
    `INSERT INTO products (id, name, price, category, stock)
     VALUES ($1, $2, $3, $4, $5)`,
    [product.id, product.name, product.price, product.category, product.stock]
  );
  return product;
}

async function insertOrder(db, order) {
  await db.query(
    `INSERT INTO orders (id, customer_id, status, subtotal, tax, total, currency, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [order.id, order.customerId, order.status, order.subtotal, order.tax, order.total, order.currency, order.createdAt]
  );
  for (const item of order.items) {
    await db.query(
      `INSERT INTO order_items (id, order_id, product_id, name, quantity, unit_price)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [faker.string.uuid(), order.id, item.productId, item.name, item.quantity, item.unitPrice]
    );
  }
  return order;
}

module.exports = { seedFullDataset };
```

### 5. Faker-Based Realistic Data Generation (Python)

```python
# tests/helpers/fake_data.py
"""Generate realistic test data using Faker."""

from faker import Faker
from dataclasses import dataclass, field
from typing import Optional
from decimal import Decimal
import uuid

fake = Faker()
# Seed for deterministic tests when needed.
# Faker.seed(12345)


@dataclass
class FakeAddress:
    street: str = field(default_factory=fake.street_address)
    city: str = field(default_factory=fake.city)
    state: str = field(default_factory=lambda: fake.state_abbr())
    zip_code: str = field(default_factory=fake.zipcode)
    country: str = "US"


@dataclass
class FakeUser:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    email: str = field(default_factory=fake.email)
    name: str = field(default_factory=fake.name)
    role: str = "viewer"
    phone: Optional[str] = field(default_factory=fake.phone_number)
    address: FakeAddress = field(default_factory=FakeAddress)

    def as_api_payload(self) -> dict:
        """Return the subset of fields needed for API creation."""
        return {
            "email": self.email,
            "name": self.name,
            "role": self.role,
            "password": "TestPass1!",
        }


@dataclass
class FakeProduct:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = field(default_factory=fake.catch_phrase)
    price: Decimal = field(
        default_factory=lambda: Decimal(fake.pydecimal(min_value=1, max_value=999, right_digits=2))
    )
    category: str = field(
        default_factory=lambda: fake.random_element(["electronics", "clothing", "home", "books"])
    )
    stock: int = field(default_factory=lambda: fake.random_int(min=0, max=500))

    def as_api_payload(self) -> dict:
        return {
            "name": self.name,
            "price": float(self.price),
            "category": self.category,
            "stock": self.stock,
        }


def fake_users(count: int, **overrides) -> list[FakeUser]:
    """Generate a list of fake users with optional field overrides."""
    return [FakeUser(**overrides) for _ in range(count)]


def fake_products(count: int, **overrides) -> list[FakeProduct]:
    return [FakeProduct(**overrides) for _ in range(count)]
```

**Usage:**

```python
from tests.helpers.fake_data import FakeUser, FakeProduct, fake_users

def test_bulk_import(client, auth_headers):
    users = fake_users(100, role="viewer")
    payloads = [u.as_api_payload() for u in users]

    res = client.post(
        "/api/users/bulk",
        json={"users": payloads},
        headers=auth_headers,
    )

    assert res.status_code == 201
    assert res.json()["imported"] == 100


def test_unicode_names_are_handled(client, auth_headers):
    # Faker can generate locale-specific names.
    localized = Faker("ja_JP")
    user = FakeUser(name=localized.name(), email=f"{uuid.uuid4().hex[:8]}@example.com")

    res = client.post("/api/users", json=user.as_api_payload(), headers=auth_headers)
    assert res.status_code == 201
    assert res.json()["data"]["name"] == user.name
```

### 6. Test Data Isolation via Transaction Rollback

```python
# tests/conftest.py
"""Pytest fixtures for database isolation using transaction rollback."""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base

TEST_DATABASE_URL = "postgresql://test:test@localhost:5432/testdb"


@pytest.fixture(scope="session")
def engine():
    """Create the test database engine once per test session."""
    eng = create_engine(TEST_DATABASE_URL)
    Base.metadata.create_all(eng)
    yield eng
    Base.metadata.drop_all(eng)
    eng.dispose()


@pytest.fixture(scope="function")
def db_session(engine):
    """
    Provide a transactional database session for each test.
    The transaction is rolled back after the test completes,
    ensuring complete isolation without the cost of truncation.
    """
    connection = engine.connect()
    transaction = connection.begin()
    session = sessionmaker(bind=connection)()

    yield session

    session.close()
    transaction.rollback()  # Undo all changes made during the test.
    connection.close()


@pytest.fixture(scope="function")
def client(db_session):
    """Provide a test client that uses the transactional session."""
    from app.main import create_app

    app = create_app(db_session=db_session)
    with app.test_client() as c:
        yield c
```
