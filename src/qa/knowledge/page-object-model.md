# Page Object Model Patterns

## Principle
Page Object Model encapsulates page-specific selectors and interactions behind a clean API, making tests readable, maintainable, and resilient to UI changes.

## Rationale
As UI test suites grow, raw selector usage scattered across test files becomes a maintenance nightmare. When a single button's data-testid changes, dozens of tests break. The Page Object Model solves this by centralizing selectors and interactions in dedicated classes, so a UI change requires updating only one file rather than every test that touches that element.

Beyond maintenance, POM encourages better test design. Tests read like user stories ("loginPage.submitCredentials(user, pass)") rather than low-level DOM manipulation. The pattern also enables composition: complex pages can be built from smaller component objects (navigation bar, data table, modal dialog), which are reused across multiple page objects. Modern frameworks like Playwright and Cypress each have idiomatic ways to implement POM, and choosing composition over deep inheritance hierarchies keeps the pattern flexible and testable.

## Pattern Examples

### 1. Playwright Page Objects with Composition

```typescript
// components/navigation-bar.component.ts
import { Page, Locator } from '@playwright/test';

export class NavigationBar {
  private readonly page: Page;
  readonly logo: Locator;
  readonly searchInput: Locator;
  readonly cartBadge: Locator;
  readonly userMenu: Locator;

  constructor(page: Page) {
    this.page = page;
    this.logo = page.locator('[data-testid="nav-logo"]');
    this.searchInput = page.locator('[data-testid="nav-search-input"]');
    this.cartBadge = page.locator('[data-testid="cart-badge"]');
    this.userMenu = page.locator('[data-testid="user-menu-trigger"]');
  }

  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    await this.page.waitForURL(/\/search\?q=/);
  }

  async openUserMenu(): Promise<void> {
    await this.userMenu.click();
    await this.page.locator('[data-testid="user-menu-dropdown"]').waitFor({ state: 'visible' });
  }

  async logout(): Promise<void> {
    await this.openUserMenu();
    await this.page.locator('[data-testid="logout-button"]').click();
    await this.page.waitForURL('/login');
  }

  async getCartCount(): Promise<number> {
    const text = await this.cartBadge.textContent();
    return text ? parseInt(text, 10) : 0;
  }
}

// components/data-table.component.ts
import { Page, Locator } from '@playwright/test';

export class DataTable {
  private readonly container: Locator;
  private readonly page: Page;

  constructor(page: Page, containerSelector: string) {
    this.page = page;
    this.container = page.locator(containerSelector);
  }

  get rows(): Locator {
    return this.container.locator('tbody tr');
  }

  get headers(): Locator {
    return this.container.locator('thead th');
  }

  async getRowCount(): Promise<number> {
    return this.rows.count();
  }

  async getCellText(row: number, col: number): Promise<string> {
    const cell = this.rows.nth(row).locator('td').nth(col);
    return (await cell.textContent()) ?? '';
  }

  async sortBy(columnName: string): Promise<void> {
    const header = this.container.locator('thead th', { hasText: columnName });
    await header.click();
    await this.page.waitForLoadState('networkidle');
  }

  async getColumnValues(colIndex: number): Promise<string[]> {
    const count = await this.getRowCount();
    const values: string[] = [];
    for (let i = 0; i < count; i++) {
      values.push(await this.getCellText(i, colIndex));
    }
    return values;
  }

  async clickRowAction(rowIndex: number, actionName: string): Promise<void> {
    const row = this.rows.nth(rowIndex);
    await row.locator(`[data-testid="action-${actionName}"]`).click();
  }
}

// components/modal-dialog.component.ts
import { Page, Locator } from '@playwright/test';

export class ModalDialog {
  private readonly page: Page;
  private readonly overlay: Locator;

  constructor(page: Page) {
    this.page = page;
    this.overlay = page.locator('[data-testid="modal-overlay"]');
  }

  get title(): Locator {
    return this.overlay.locator('[data-testid="modal-title"]');
  }

  get body(): Locator {
    return this.overlay.locator('[data-testid="modal-body"]');
  }

  get confirmButton(): Locator {
    return this.overlay.locator('[data-testid="modal-confirm"]');
  }

  get cancelButton(): Locator {
    return this.overlay.locator('[data-testid="modal-cancel"]');
  }

  async waitForOpen(): Promise<void> {
    await this.overlay.waitFor({ state: 'visible' });
  }

  async confirm(): Promise<void> {
    await this.confirmButton.click();
    await this.overlay.waitFor({ state: 'hidden' });
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
    await this.overlay.waitFor({ state: 'hidden' });
  }

  async isVisible(): Promise<boolean> {
    return this.overlay.isVisible();
  }
}

// pages/products.page.ts
import { Page, Locator } from '@playwright/test';
import { NavigationBar } from '../components/navigation-bar.component';
import { DataTable } from '../components/data-table.component';
import { ModalDialog } from '../components/modal-dialog.component';

export class ProductsPage {
  private readonly page: Page;
  readonly nav: NavigationBar;
  readonly table: DataTable;
  readonly modal: ModalDialog;
  readonly addProductButton: Locator;
  readonly filterDropdown: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nav = new NavigationBar(page);
    this.table = new DataTable(page, '[data-testid="products-table"]');
    this.modal = new ModalDialog(page);
    this.addProductButton = page.locator('[data-testid="add-product-btn"]');
    this.filterDropdown = page.locator('[data-testid="category-filter"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin/products');
    await this.page.waitForLoadState('networkidle');
  }

  async filterByCategory(category: string): Promise<void> {
    await this.filterDropdown.selectOption({ label: category });
    await this.page.waitForLoadState('networkidle');
  }

  async deleteProduct(rowIndex: number): Promise<void> {
    await this.table.clickRowAction(rowIndex, 'delete');
    await this.modal.waitForOpen();
    await this.modal.confirm();
  }

  async addProduct(product: {
    name: string;
    price: string;
    category: string;
    sku: string;
  }): Promise<void> {
    await this.addProductButton.click();
    await this.page.locator('[data-testid="product-name"]').fill(product.name);
    await this.page.locator('[data-testid="product-price"]').fill(product.price);
    await this.page.locator('[data-testid="product-category"]').selectOption(product.category);
    await this.page.locator('[data-testid="product-sku"]').fill(product.sku);
    await this.page.locator('[data-testid="save-product-btn"]').click();
    await this.page.waitForResponse((resp) =>
      resp.url().includes('/api/products') && resp.status() === 201,
    );
  }
}
```

### 2. Cypress Page Objects with Custom Commands

```typescript
// cypress/support/pages/checkout.page.ts
export class CheckoutPage {
  private selectors = {
    shippingForm: {
      firstName: '[data-cy="shipping-first-name"]',
      lastName: '[data-cy="shipping-last-name"]',
      address: '[data-cy="shipping-address"]',
      city: '[data-cy="shipping-city"]',
      state: '[data-cy="shipping-state"]',
      zip: '[data-cy="shipping-zip"]',
      continueButton: '[data-cy="shipping-continue"]',
    },
    paymentForm: {
      cardNumber: '[data-cy="card-number"]',
      expiry: '[data-cy="card-expiry"]',
      cvv: '[data-cy="card-cvv"]',
      payButton: '[data-cy="place-order"]',
    },
    orderSummary: {
      items: '[data-cy="order-item"]',
      subtotal: '[data-cy="order-subtotal"]',
      shipping: '[data-cy="order-shipping"]',
      tax: '[data-cy="order-tax"]',
      total: '[data-cy="order-total"]',
    },
    confirmation: {
      orderId: '[data-cy="confirmation-order-id"]',
      message: '[data-cy="confirmation-message"]',
    },
  };

  visit(): this {
    cy.visit('/checkout');
    cy.get(this.selectors.shippingForm.firstName).should('be.visible');
    return this;
  }

  fillShippingInfo(info: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  }): this {
    const s = this.selectors.shippingForm;
    cy.get(s.firstName).clear().type(info.firstName);
    cy.get(s.lastName).clear().type(info.lastName);
    cy.get(s.address).clear().type(info.address);
    cy.get(s.city).clear().type(info.city);
    cy.get(s.state).select(info.state);
    cy.get(s.zip).clear().type(info.zip);
    return this;
  }

  continueToPayment(): this {
    cy.get(this.selectors.shippingForm.continueButton).click();
    cy.get(this.selectors.paymentForm.cardNumber).should('be.visible');
    return this;
  }

  fillPaymentInfo(card: {
    number: string;
    expiry: string;
    cvv: string;
  }): this {
    const s = this.selectors.paymentForm;
    cy.get(s.cardNumber).clear().type(card.number);
    cy.get(s.expiry).clear().type(card.expiry);
    cy.get(s.cvv).clear().type(card.cvv);
    return this;
  }

  placeOrder(): this {
    cy.intercept('POST', '/api/orders').as('createOrder');
    cy.get(this.selectors.paymentForm.payButton).click();
    cy.wait('@createOrder').its('response.statusCode').should('eq', 201);
    return this;
  }

  verifyOrderConfirmation(): this {
    cy.get(this.selectors.confirmation.orderId).should('be.visible');
    cy.get(this.selectors.confirmation.message).should('contain', 'Thank you');
    return this;
  }

  getOrderTotal(): Cypress.Chainable<string> {
    return cy.get(this.selectors.orderSummary.total).invoke('text');
  }

  verifyItemCount(expected: number): this {
    cy.get(this.selectors.orderSummary.items).should('have.length', expected);
    return this;
  }
}

// cypress/e2e/checkout.cy.ts
import { CheckoutPage } from '../support/pages/checkout.page';

describe('Checkout Flow', () => {
  const checkout = new CheckoutPage();

  beforeEach(() => {
    cy.loginAsUser('test@example.com');
    cy.addToCart('prod-100', 2);
    cy.addToCart('prod-200', 1);
  });

  it('completes a full checkout with valid information', () => {
    checkout
      .visit()
      .verifyItemCount(2)
      .fillShippingInfo({
        firstName: 'Jane',
        lastName: 'Doe',
        address: '456 Oak Ave',
        city: 'Seattle',
        state: 'WA',
        zip: '98101',
      })
      .continueToPayment()
      .fillPaymentInfo({
        number: '4111111111111111',
        expiry: '12/28',
        cvv: '123',
      })
      .placeOrder()
      .verifyOrderConfirmation();
  });
});
```

### 3. Inheritance vs Composition Decision Guide

```typescript
// ANTI-PATTERN: Deep inheritance hierarchy
// This becomes fragile and hard to modify
abstract class BasePage {
  abstract url: string;
  async goto() { /* ... */ }
  async getTitle() { /* ... */ }
}

abstract class AuthenticatedPage extends BasePage {
  async logout() { /* ... */ }
  async getUsername() { /* ... */ }
}

abstract class AdminPage extends AuthenticatedPage {
  async openSidebar() { /* ... */ }
  async navigateToSection(name: string) { /* ... */ }
}

// DashboardPage now inherits 3 levels deep
// What if a page needs admin sidebar but not authentication?
class DashboardPage extends AdminPage {
  url = '/admin/dashboard';
}

// PREFERRED: Composition with mixins
// components/sidebar.component.ts
import { Page, Locator } from '@playwright/test';

export class Sidebar {
  private readonly page: Page;
  private readonly container: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.locator('[data-testid="sidebar"]');
  }

  async navigateTo(section: string): Promise<void> {
    await this.container.locator(`[data-testid="sidebar-link-${section}"]`).click();
  }

  async isCollapsed(): Promise<boolean> {
    return this.container.evaluate((el) => el.classList.contains('collapsed'));
  }

  async toggle(): Promise<void> {
    await this.page.locator('[data-testid="sidebar-toggle"]').click();
  }
}

// components/form-section.component.ts
import { Page, Locator } from '@playwright/test';

interface FormField {
  name: string;
  type: 'text' | 'select' | 'checkbox' | 'textarea';
  value: string;
}

export class FormSection {
  private readonly page: Page;
  private readonly container: Locator;

  constructor(page: Page, containerSelector: string) {
    this.page = page;
    this.container = page.locator(containerSelector);
  }

  async fillFields(fields: FormField[]): Promise<void> {
    for (const field of fields) {
      const locator = this.container.locator(`[data-testid="field-${field.name}"]`);
      switch (field.type) {
        case 'text':
          await locator.fill(field.value);
          break;
        case 'select':
          await locator.selectOption(field.value);
          break;
        case 'checkbox':
          if (field.value === 'true') await locator.check();
          else await locator.uncheck();
          break;
        case 'textarea':
          await locator.fill(field.value);
          break;
      }
    }
  }

  async submit(): Promise<void> {
    await this.container.locator('[type="submit"]').click();
  }

  async getValidationErrors(): Promise<string[]> {
    const errors = this.container.locator('.field-error');
    const count = await errors.count();
    const messages: string[] = [];
    for (let i = 0; i < count; i++) {
      messages.push((await errors.nth(i).textContent()) ?? '');
    }
    return messages;
  }
}

// pages/settings.page.ts - composed from components
import { Page } from '@playwright/test';
import { NavigationBar } from '../components/navigation-bar.component';
import { Sidebar } from '../components/sidebar.component';
import { FormSection } from '../components/form-section.component';

export class SettingsPage {
  readonly page: Page;
  readonly nav: NavigationBar;
  readonly sidebar: Sidebar;
  readonly profileForm: FormSection;
  readonly notificationForm: FormSection;

  constructor(page: Page) {
    this.page = page;
    this.nav = new NavigationBar(page);
    this.sidebar = new Sidebar(page);
    this.profileForm = new FormSection(page, '[data-testid="profile-section"]');
    this.notificationForm = new FormSection(page, '[data-testid="notifications-section"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/settings');
  }

  async updateProfile(firstName: string, lastName: string, bio: string): Promise<void> {
    await this.sidebar.navigateTo('profile');
    await this.profileForm.fillFields([
      { name: 'firstName', type: 'text', value: firstName },
      { name: 'lastName', type: 'text', value: lastName },
      { name: 'bio', type: 'textarea', value: bio },
    ]);
    await this.profileForm.submit();
  }

  async toggleEmailNotifications(enabled: boolean): Promise<void> {
    await this.sidebar.navigateTo('notifications');
    await this.notificationForm.fillFields([
      { name: 'emailEnabled', type: 'checkbox', value: String(enabled) },
    ]);
    await this.notificationForm.submit();
  }
}
```
