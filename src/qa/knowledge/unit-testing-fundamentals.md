# Unit Testing Fundamentals

## Principle

Unit tests verify individual functions, methods, and classes in complete isolation from external dependencies. They are the fastest, most reliable layer of the test pyramid and form the foundation of a healthy test suite.

## Rationale

Unit tests catch logic bugs early, run in milliseconds, and provide precise failure feedback. A codebase with strong unit coverage gives developers confidence to refactor, ship faster, and catch regressions before they propagate to integration or E2E layers.

## Core Patterns

### Arrange-Act-Assert (AAA)

Every unit test follows three phases:

```javascript
test('should calculate total with tax', () => {
  // Arrange — set up inputs and expected values
  const price = 100;
  const taxRate = 0.2;

  // Act — call the function under test
  const result = calculateTotal(price, taxRate);

  // Assert — verify the output
  expect(result).toBe(120);
});
```

### One Assertion Focus

Each test verifies one behavior. Multiple assertions are fine if they validate the same logical outcome.

```javascript
// GOOD — one behavior, two assertions on the same result
test('should return user with normalized email', () => {
  const user = createUser({ email: '  Alice@Example.COM  ' });
  expect(user.email).toBe('alice@example.com');
  expect(user.emailVerified).toBe(false);
});

// BAD — testing unrelated behaviors
test('should create user correctly', () => {
  const user = createUser({ name: 'Alice' });
  expect(user.name).toBe('Alice');
  expect(user.id).toBeDefined();           // different concern
  expect(sendWelcomeEmail).toHaveBeenCalled(); // different concern
});
```

### Dependency Injection for Testability

Design functions to accept dependencies as parameters rather than importing them directly:

```python
# GOOD — injectable dependency
class OrderService:
    def __init__(self, payment_gateway, email_sender):
        self.payment_gateway = payment_gateway
        self.email_sender = email_sender

    def place_order(self, order):
        self.payment_gateway.charge(order.total)
        self.email_sender.send_confirmation(order)

# Test with mocks
def test_place_order_charges_payment():
    mock_gateway = Mock()
    mock_email = Mock()
    service = OrderService(mock_gateway, mock_email)

    service.place_order(Order(total=100))

    mock_gateway.charge.assert_called_once_with(100)
```

### Test Data Factories

Generate test data programmatically instead of hardcoding:

```javascript
// helpers/factories.js
function createUser(overrides = {}) {
  return {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
    createdAt: new Date('2024-01-01'),
    ...overrides,
  };
}

// Usage
const admin = createUser({ role: 'admin' });
const noEmail = createUser({ email: '' });
```

### Parameterized Tests

Test multiple input/output combinations without duplicating test code:

```javascript
test.each([
  [0, 0, 0],
  [1, 2, 3],
  [-1, 1, 0],
  [100, 200, 300],
])('add(%i, %i) should return %i', (a, b, expected) => {
  expect(add(a, b)).toBe(expected);
});
```

```python
@pytest.mark.parametrize("input,expected", [
    ("hello", "HELLO"),
    ("", ""),
    ("Hello World", "HELLO WORLD"),
    ("123", "123"),
])
def test_to_uppercase(input, expected):
    assert to_uppercase(input) == expected
```

### Mocking Boundaries (Not Internals)

Mock external dependencies (DB, API, filesystem). Never mock the function you're testing or pure internal helpers.

```javascript
// GOOD — mock the external boundary
jest.mock('../repositories/userRepository');
const { findById } = require('../repositories/userRepository');

test('should return user profile', async () => {
  findById.mockResolvedValue({ id: 1, name: 'Alice' });
  const profile = await getUserProfile(1);
  expect(profile.name).toBe('Alice');
});

// BAD — mocking internal pure function
jest.mock('../utils/formatName'); // Don't mock this, just use it
```

### Testing Error Paths

Always test that errors are thrown correctly:

```javascript
test('should throw ValidationError for negative price', () => {
  expect(() => calculateTotal(-1, 0.2)).toThrow(ValidationError);
  expect(() => calculateTotal(-1, 0.2)).toThrow('Price must be non-negative');
});

test('should reject with NotFoundError when user missing', async () => {
  findById.mockResolvedValue(null);
  await expect(getUserProfile(999)).rejects.toThrow(NotFoundError);
});
```

### Coverage as a Guide

Coverage measures lines executed, not correctness. Aim for high coverage on business logic, but don't chase 100% everywhere.

**High coverage priority:**
- Business logic, calculations, validators
- State management, reducers
- Data transformation and parsing

**Low coverage priority:**
- Simple getters/setters without logic
- Framework boilerplate
- Auto-generated code

**Coverage thresholds:**
| Metric | Target |
|--------|--------|
| Lines | > 80% |
| Branches | > 80% |
| Functions | > 90% |
| Statements | > 80% |

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| Testing implementation | Breaks on refactor | Test behavior/output instead |
| Shared mutable state | Order-dependent tests | Reset state in beforeEach |
| Testing private methods | Tight coupling to internals | Test via public interface |
| Snapshot overuse | Brittle, meaningless diffs | Use specific assertions |
| No error path tests | Misses real-world failures | Add negative test cases |
| Hardcoded test data | Unclear what matters | Use factories with overrides |
