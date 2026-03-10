# REST API Testing Fundamentals

## Principle
API tests validate the contract between client and server by asserting status codes, response schemas, headers, and business logic across the full CRUD lifecycle.

## Rationale
APIs are the backbone of modern applications. A broken endpoint can cascade failures
across web clients, mobile apps, partner integrations, and internal services
simultaneously. Unlike UI tests, API tests are fast, stable, and close to the business
logic, making them the highest-value automated tests in most systems.

Effective API testing goes beyond "does it return 200?" to validate response schemas
(ensuring no missing or extra fields), error responses (ensuring clients get actionable
error messages), edge cases (empty collections, maximum pagination), and cross-endpoint
workflows (create -> read -> update -> delete). Status code precision matters: a 201 for
creation, 204 for deletion, 422 for validation errors, and 409 for conflicts each carry
semantic meaning that clients depend on.

## Pattern Examples

### 1. Status Code and Response Structure Validation (JavaScript / Supertest)

```javascript
// tests/api/users.test.js
const request = require("supertest");
const app = require("../../src/app");

describe("GET /api/users", () => {
  it("returns 200 with an array of users", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${testToken}`)
      .expect("Content-Type", /json/)
      .expect(200);

    // Response body should be an array.
    expect(Array.isArray(res.body.data)).toBe(true);

    // Each user object should have the expected shape.
    if (res.body.data.length > 0) {
      const user = res.body.data[0];
      expect(user).toHaveProperty("id");
      expect(user).toHaveProperty("email");
      expect(user).toHaveProperty("createdAt");
      // Sensitive fields must NOT be exposed.
      expect(user).not.toHaveProperty("passwordHash");
      expect(user).not.toHaveProperty("ssn");
    }
  });

  it("returns 401 without a valid token", async () => {
    const res = await request(app)
      .get("/api/users")
      .expect(401);

    expect(res.body).toEqual({
      error: "Unauthorized",
      message: expect.any(String),
    });
  });

  it("returns 403 for a user without admin role", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${regularUserToken}`)
      .expect(403);

    expect(res.body.error).toBe("Forbidden");
  });
});
```

### 2. CRUD Lifecycle Test (JavaScript / Supertest)

```javascript
// tests/api/products-crud.test.js
const request = require("supertest");
const app = require("../../src/app");
const { setupTestDb, teardownTestDb } = require("../helpers/db");

describe("Products CRUD lifecycle", () => {
  let createdProductId;

  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  // Step 1: CREATE
  it("POST /api/products creates a new product", async () => {
    const payload = {
      name: "Widget Pro",
      price: 29.99,
      category: "electronics",
      stock: 100,
    };

    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(payload)
      .expect(201);

    // The response should echo back the created resource with an id.
    expect(res.body.data).toMatchObject({
      id: expect.any(String),
      name: "Widget Pro",
      price: 29.99,
      category: "electronics",
      stock: 100,
      createdAt: expect.any(String),
    });

    // Save the id for subsequent lifecycle steps.
    createdProductId = res.body.data.id;

    // Location header should point to the new resource.
    expect(res.headers.location).toBe(`/api/products/${createdProductId}`);
  });

  // Step 2: READ
  it("GET /api/products/:id retrieves the created product", async () => {
    const res = await request(app)
      .get(`/api/products/${createdProductId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.id).toBe(createdProductId);
    expect(res.body.data.name).toBe("Widget Pro");
  });

  // Step 3: UPDATE
  it("PATCH /api/products/:id updates the product", async () => {
    const res = await request(app)
      .patch(`/api/products/${createdProductId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ price: 24.99 })
      .expect(200);

    expect(res.body.data.price).toBe(24.99);
    // Unchanged fields should persist.
    expect(res.body.data.name).toBe("Widget Pro");
    // updatedAt should be set.
    expect(res.body.data.updatedAt).toBeDefined();
  });

  // Step 4: DELETE
  it("DELETE /api/products/:id removes the product", async () => {
    await request(app)
      .delete(`/api/products/${createdProductId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(204);

    // Subsequent GET should return 404.
    await request(app)
      .get(`/api/products/${createdProductId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(404);
  });
});
```

### 3. Response Schema Validation with JSON Schema (JavaScript)

```javascript
// tests/api/schema-validation.test.js
const request = require("supertest");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const app = require("../../src/app");

// Initialize AJV with format validation (email, date-time, uri, etc.).
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Define the expected response schema.
const userListSchema = {
  type: "object",
  required: ["data", "meta"],
  properties: {
    data: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "email", "name", "role", "createdAt"],
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          name: { type: "string", minLength: 1 },
          role: { type: "string", enum: ["admin", "editor", "viewer"] },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: ["string", "null"], format: "date-time" },
        },
        // No extra fields allowed.
        additionalProperties: false,
      },
    },
    meta: {
      type: "object",
      required: ["total", "page", "perPage"],
      properties: {
        total: { type: "integer", minimum: 0 },
        page: { type: "integer", minimum: 1 },
        perPage: { type: "integer", minimum: 1, maximum: 100 },
        totalPages: { type: "integer", minimum: 0 },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
};

const validate = ajv.compile(userListSchema);

describe("GET /api/users schema validation", () => {
  it("response matches the documented JSON schema", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    const valid = validate(res.body);

    if (!valid) {
      // Log detailed schema errors for debugging.
      console.error("Schema validation errors:", validate.errors);
    }

    expect(valid).toBe(true);
  });
});
```

### 4. Error Response Testing (JavaScript)

```javascript
// tests/api/error-responses.test.js
const request = require("supertest");
const app = require("../../src/app");

describe("API error responses", () => {
  // 400: Malformed request body.
  it("returns 400 for invalid JSON", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("Content-Type", "application/json")
      .send("{invalid json")
      .expect(400);

    expect(res.body).toMatchObject({
      error: "Bad Request",
      message: expect.stringContaining("JSON"),
    });
  });

  // 422: Valid JSON but fails business validation.
  it("returns 422 for a negative price", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Bad Product", price: -5, category: "misc" })
      .expect(422);

    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "price",
          message: expect.stringContaining("positive"),
        }),
      ])
    );
  });

  // 409: Conflict (e.g., duplicate unique field).
  it("returns 409 when creating a duplicate email", async () => {
    const user = { email: "existing@example.com", name: "Dupe", password: "S3cure!Pass" };

    // First creation succeeds.
    await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(user)
      .expect(201);

    // Second creation with same email conflicts.
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(user)
      .expect(409);

    expect(res.body.error).toBe("Conflict");
    expect(res.body.message).toContain("email");
  });

  // 404: Non-existent resource.
  it("returns 404 for a non-existent product", async () => {
    const res = await request(app)
      .get("/api/products/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(404);

    expect(res.body.error).toBe("Not Found");
  });

  // 405: Method not allowed.
  it("returns 405 for PUT on a collection endpoint", async () => {
    await request(app)
      .put("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({})
      .expect(405);
  });
});
```

### 5. Pagination Testing (JavaScript)

```javascript
// tests/api/pagination.test.js
const request = require("supertest");
const app = require("../../src/app");
const { seedProducts } = require("../helpers/seed");

describe("GET /api/products pagination", () => {
  beforeAll(async () => {
    // Seed 50 products for pagination testing.
    await seedProducts(50);
  });

  it("returns the first page with default page size", async () => {
    const res = await request(app)
      .get("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.data).toHaveLength(20); // Default page size.
    expect(res.body.meta).toMatchObject({
      page: 1,
      perPage: 20,
      total: 50,
      totalPages: 3,
    });
  });

  it("returns the requested page and page size", async () => {
    const res = await request(app)
      .get("/api/products?page=2&perPage=10")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.data).toHaveLength(10);
    expect(res.body.meta.page).toBe(2);
    expect(res.body.meta.perPage).toBe(10);
  });

  it("returns an empty array for a page beyond the last", async () => {
    const res = await request(app)
      .get("/api/products?page=100&perPage=20")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.data).toHaveLength(0);
    expect(res.body.meta.total).toBe(50);
  });

  it("caps perPage at the maximum allowed value", async () => {
    const res = await request(app)
      .get("/api/products?perPage=500")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    // Server should cap at 100, not return 500 items.
    expect(res.body.meta.perPage).toBeLessThanOrEqual(100);
  });

  it("rejects non-integer pagination parameters", async () => {
    await request(app)
      .get("/api/products?page=abc")
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
  });
});
```

### 6. Full CRUD Lifecycle Test (Python / pytest + requests)

```python
# tests/api/test_products_crud.py
"""Full CRUD lifecycle test for the products API."""

import pytest
import requests

BASE_URL = "http://localhost:8000/api"


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    """Provide authorization headers for all requests."""
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def admin_token():
    """Obtain an admin JWT token."""
    res = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": "admin@example.com", "password": "AdminPass1!"},
    )
    assert res.status_code == 200
    return res.json()["token"]


class TestProductCRUD:
    """Tests run in order, sharing state via class attribute."""

    product_id = None

    def test_create_product(self, auth_headers):
        payload = {
            "name": "Gadget X",
            "price": 49.99,
            "category": "electronics",
            "stock": 200,
        }

        res = requests.post(
            f"{BASE_URL}/products",
            json=payload,
            headers=auth_headers,
        )

        assert res.status_code == 201
        body = res.json()["data"]
        assert body["name"] == "Gadget X"
        assert body["price"] == 49.99
        assert "id" in body

        # Store for subsequent tests.
        TestProductCRUD.product_id = body["id"]

    def test_read_product(self, auth_headers):
        res = requests.get(
            f"{BASE_URL}/products/{self.product_id}",
            headers=auth_headers,
        )

        assert res.status_code == 200
        assert res.json()["data"]["id"] == self.product_id

    def test_update_product(self, auth_headers):
        res = requests.patch(
            f"{BASE_URL}/products/{self.product_id}",
            json={"price": 39.99},
            headers=auth_headers,
        )

        assert res.status_code == 200
        assert res.json()["data"]["price"] == 39.99
        # Unchanged fields persist.
        assert res.json()["data"]["name"] == "Gadget X"

    def test_delete_product(self, auth_headers):
        res = requests.delete(
            f"{BASE_URL}/products/{self.product_id}",
            headers=auth_headers,
        )
        assert res.status_code == 204

        # Confirm deletion.
        res = requests.get(
            f"{BASE_URL}/products/{self.product_id}",
            headers=auth_headers,
        )
        assert res.status_code == 404
```

### 7. Schema Validation and Error Testing (Python / pytest)

```python
# tests/api/test_error_responses.py
"""Validate error responses and schemas."""

import pytest
import requests
from jsonschema import validate, ValidationError

BASE_URL = "http://localhost:8000/api"

# JSON Schema for the error response format.
ERROR_SCHEMA = {
    "type": "object",
    "required": ["error", "message"],
    "properties": {
        "error": {"type": "string"},
        "message": {"type": "string"},
        "errors": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["field", "message"],
                "properties": {
                    "field": {"type": "string"},
                    "message": {"type": "string"},
                },
            },
        },
    },
    "additionalProperties": False,
}

USER_SCHEMA = {
    "type": "object",
    "required": ["id", "email", "name", "role", "createdAt"],
    "properties": {
        "id": {"type": "string", "format": "uuid"},
        "email": {"type": "string", "format": "email"},
        "name": {"type": "string", "minLength": 1},
        "role": {"type": "string", "enum": ["admin", "editor", "viewer"]},
        "createdAt": {"type": "string"},
        "updatedAt": {"type": ["string", "null"]},
    },
    "additionalProperties": False,
}


class TestErrorResponses:

    def test_validation_error_returns_422(self, auth_headers):
        res = requests.post(
            f"{BASE_URL}/products",
            json={"name": "", "price": -1, "category": ""},
            headers=auth_headers,
        )

        assert res.status_code == 422
        body = res.json()
        validate(instance=body, schema=ERROR_SCHEMA)
        assert len(body["errors"]) >= 2  # At least name and price errors.

    def test_not_found_returns_404(self, auth_headers):
        res = requests.get(
            f"{BASE_URL}/products/00000000-0000-0000-0000-000000000000",
            headers=auth_headers,
        )

        assert res.status_code == 404
        validate(instance=res.json(), schema=ERROR_SCHEMA)

    def test_unauthorized_returns_401(self):
        res = requests.get(f"{BASE_URL}/users")

        assert res.status_code == 401
        validate(instance=res.json(), schema=ERROR_SCHEMA)

    def test_user_response_matches_schema(self, auth_headers, seeded_user_id):
        res = requests.get(
            f"{BASE_URL}/users/{seeded_user_id}",
            headers=auth_headers,
        )

        assert res.status_code == 200
        validate(instance=res.json()["data"], schema=USER_SCHEMA)


class TestPagination:

    def test_default_pagination(self, auth_headers):
        res = requests.get(f"{BASE_URL}/products", headers=auth_headers)

        assert res.status_code == 200
        body = res.json()
        assert "data" in body
        assert "meta" in body
        assert body["meta"]["page"] == 1
        assert body["meta"]["perPage"] <= 100

    def test_custom_page_size(self, auth_headers):
        res = requests.get(
            f"{BASE_URL}/products?page=1&perPage=5",
            headers=auth_headers,
        )

        assert res.status_code == 200
        assert len(res.json()["data"]) <= 5
        assert res.json()["meta"]["perPage"] == 5

    def test_invalid_page_returns_400(self, auth_headers):
        res = requests.get(
            f"{BASE_URL}/products?page=-1",
            headers=auth_headers,
        )

        assert res.status_code == 400
```

### 8. API Testing Helper Utilities

```javascript
// tests/helpers/api-client.js
// Reusable API client that reduces boilerplate across test files.

const request = require("supertest");
const app = require("../../src/app");

class ApiClient {
  constructor(token = null) {
    this.token = token;
  }

  _req(method, path) {
    const req = request(app)[method](path);
    if (this.token) {
      req.set("Authorization", `Bearer ${this.token}`);
    }
    req.set("Accept", "application/json");
    return req;
  }

  get(path) { return this._req("get", path); }
  post(path, body) { return this._req("post", path).send(body); }
  patch(path, body) { return this._req("patch", path).send(body); }
  delete(path) { return this._req("delete", path); }

  // Convenience: create a resource and return just the id.
  async createAndGetId(path, body) {
    const res = await this.post(path, body).expect(201);
    return res.body.data.id;
  }
}

module.exports = { ApiClient };
```

```python
# tests/helpers/api_client.py
"""Reusable API client for Python test suites."""

import requests


class ApiClient:
    def __init__(self, base_url: str, token: str | None = None):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        if token:
            self.session.headers["Authorization"] = f"Bearer {token}"
        self.session.headers["Accept"] = "application/json"

    def get(self, path: str, **kwargs):
        return self.session.get(f"{self.base_url}{path}", **kwargs)

    def post(self, path: str, json=None, **kwargs):
        return self.session.post(f"{self.base_url}{path}", json=json, **kwargs)

    def patch(self, path: str, json=None, **kwargs):
        return self.session.patch(f"{self.base_url}{path}", json=json, **kwargs)

    def delete(self, path: str, **kwargs):
        return self.session.delete(f"{self.base_url}{path}", **kwargs)

    def create_and_get_id(self, path: str, json: dict) -> str:
        res = self.post(path, json=json)
        assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
        return res.json()["data"]["id"]
```
