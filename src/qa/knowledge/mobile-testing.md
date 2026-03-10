# Mobile Testing with Appium

## Principle
Mobile testing with Appium provides cross-platform automation through a unified API, but requires specialized locator strategies, gesture handling, and device management to produce reliable tests.

## Rationale
Mobile applications present unique testing challenges that web-focused frameworks cannot address. Touch gestures like swipe, pinch, and long press have no keyboard-and-mouse equivalent. Native elements are identified differently than DOM elements: iOS uses accessibility identifiers and predicates, Android uses resource IDs and UI Automator selectors. Screen sizes, OS versions, and device capabilities vary enormously across the mobile ecosystem.

Appium bridges these differences by wrapping platform-specific automation frameworks (XCUITest for iOS, UiAutomator2 for Android) behind a WebDriver-compatible API. This allows teams to write tests in any language with WebDriver bindings. However, effective mobile testing requires understanding platform-specific locator strategies, implementing robust waits for asynchronous native UI updates, handling permission dialogs and system alerts, and managing test execution across physical devices or cloud-based device farms. Without this knowledge, mobile test suites become flaky and expensive to maintain.

## Pattern Examples

### 1. Appium Setup with Capabilities Configuration

```typescript
// config/appium.config.ts
import { remote, RemoteOptions } from 'webdriverio';

export interface DeviceConfig {
  platformName: 'iOS' | 'Android';
  deviceName: string;
  platformVersion: string;
  app: string;
  automationName: string;
  additionalCaps?: Record<string, any>;
}

export const devices: Record<string, DeviceConfig> = {
  'iphone-15': {
    platformName: 'iOS',
    deviceName: 'iPhone 15',
    platformVersion: '17.4',
    app: './apps/MyApp.app',
    automationName: 'XCUITest',
    additionalCaps: {
      'appium:language': 'en',
      'appium:locale': 'en_US',
      'appium:autoAcceptAlerts': true,
      'appium:showXcodeLog': false,
      'appium:wdaStartupRetries': 3,
      'appium:wdaStartupRetryInterval': 20000,
    },
  },
  'pixel-8': {
    platformName: 'Android',
    deviceName: 'Pixel 8',
    platformVersion: '14',
    app: './apps/MyApp.apk',
    automationName: 'UiAutomator2',
    additionalCaps: {
      'appium:appWaitActivity': 'com.myapp.MainActivity',
      'appium:autoGrantPermissions': true,
      'appium:disableWindowAnimation': true,
      'appium:uiautomator2ServerInstallTimeout': 60000,
      'appium:adbExecTimeout': 30000,
    },
  },
};

export async function createDriver(deviceKey: string) {
  const config = devices[deviceKey];
  if (!config) throw new Error(`Unknown device: ${deviceKey}`);

  const capabilities: RemoteOptions['capabilities'] = {
    platformName: config.platformName,
    'appium:deviceName': config.deviceName,
    'appium:platformVersion': config.platformVersion,
    'appium:app': config.app,
    'appium:automationName': config.automationName,
    'appium:newCommandTimeout': 300,
    'appium:noReset': false,
    'appium:fullReset': false,
    ...config.additionalCaps,
  };

  const driver = await remote({
    hostname: process.env.APPIUM_HOST || 'localhost',
    port: parseInt(process.env.APPIUM_PORT || '4723'),
    path: '/',
    capabilities,
    logLevel: 'warn',
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,
  });

  // Wait for app to be ready
  await driver.pause(2000);
  return driver;
}

// BrowserStack device farm configuration
export function createBrowserStackDriver(deviceKey: string) {
  const config = devices[deviceKey];

  return remote({
    hostname: 'hub-cloud.browserstack.com',
    port: 443,
    path: '/wd/hub',
    protocol: 'https',
    capabilities: {
      platformName: config.platformName,
      'appium:deviceName': config.deviceName,
      'appium:platformVersion': config.platformVersion,
      'appium:app': process.env.BROWSERSTACK_APP_URL!,
      'appium:automationName': config.automationName,
      'bstack:options': {
        userName: process.env.BROWSERSTACK_USERNAME!,
        accessKey: process.env.BROWSERSTACK_ACCESS_KEY!,
        projectName: 'MyApp',
        buildName: `Build ${process.env.CI_BUILD_NUMBER || 'local'}`,
        sessionName: `${deviceKey} Tests`,
        debug: true,
        networkLogs: true,
        video: true,
      },
    },
    logLevel: 'warn',
  });
}
```

### 2. Cross-Platform Locator Strategies and Page Objects

```typescript
// pages/login.page.ts
import type { Browser } from 'webdriverio';

export class LoginPage {
  private driver: Browser;

  constructor(driver: Browser) {
    this.driver = driver;
  }

  // Platform-adaptive locators
  private get emailInput() {
    return this.driver.isIOS
      ? this.driver.$('-ios predicate string:type == "XCUIElementTypeTextField" AND name == "Email"')
      : this.driver.$('android=new UiSelector().resourceId("com.myapp:id/email_input")');
  }

  private get passwordInput() {
    return this.driver.isIOS
      ? this.driver.$('-ios predicate string:type == "XCUIElementTypeSecureTextField"')
      : this.driver.$('android=new UiSelector().resourceId("com.myapp:id/password_input")');
  }

  private get loginButton() {
    return this.driver.isIOS
      ? this.driver.$('~login-button') // accessibility id
      : this.driver.$('android=new UiSelector().resourceId("com.myapp:id/login_btn")');
  }

  private get errorMessage() {
    return this.driver.isIOS
      ? this.driver.$('~error-message')
      : this.driver.$('android=new UiSelector().resourceId("com.myapp:id/error_text")');
  }

  private get biometricButton() {
    return this.driver.isIOS
      ? this.driver.$('~biometric-login')
      : this.driver.$('android=new UiSelector().description("Fingerprint login")');
  }

  async login(email: string, password: string): Promise<void> {
    const emailField = await this.emailInput;
    await emailField.waitForDisplayed({ timeout: 10000 });
    await emailField.clearValue();
    await emailField.setValue(email);

    const passwordField = await this.passwordInput;
    await passwordField.clearValue();
    await passwordField.setValue(password);

    // Hide keyboard before tapping login
    if (await this.driver.isKeyboardShown()) {
      if (this.driver.isIOS) {
        await this.driver.execute('mobile: hideKeyboard', { strategy: 'pressKey', key: 'Done' });
      } else {
        await this.driver.hideKeyboard();
      }
    }

    await (await this.loginButton).click();
  }

  async getErrorText(): Promise<string> {
    const error = await this.errorMessage;
    await error.waitForDisplayed({ timeout: 5000 });
    return error.getText();
  }

  async isLoginButtonEnabled(): Promise<boolean> {
    return (await this.loginButton).isEnabled();
  }

  async isBiometricAvailable(): Promise<boolean> {
    return (await this.biometricButton).isExisting();
  }

  async waitForPageLoad(): Promise<void> {
    const email = await this.emailInput;
    await email.waitForDisplayed({ timeout: 15000 });
  }
}

// pages/home.page.ts
export class HomePage {
  private driver: Browser;

  constructor(driver: Browser) {
    this.driver = driver;
  }

  private get welcomeText() {
    return this.driver.isIOS
      ? this.driver.$('~welcome-message')
      : this.driver.$('android=new UiSelector().resourceId("com.myapp:id/welcome_text")');
  }

  private get productList() {
    return this.driver.isIOS
      ? this.driver.$('-ios class chain:**/XCUIElementTypeCollectionView')
      : this.driver.$('android=new UiSelector().resourceId("com.myapp:id/product_list")');
  }

  private get profileTab() {
    return this.driver.isIOS
      ? this.driver.$('~tab-profile')
      : this.driver.$('android=new UiSelector().description("Profile tab")');
  }

  async getWelcomeMessage(): Promise<string> {
    const welcome = await this.welcomeText;
    await welcome.waitForDisplayed({ timeout: 10000 });
    return welcome.getText();
  }

  async isProductListVisible(): Promise<boolean> {
    const list = await this.productList;
    return list.isDisplayed();
  }

  async navigateToProfile(): Promise<void> {
    await (await this.profileTab).click();
  }

  async waitForHomeScreen(): Promise<void> {
    const welcome = await this.welcomeText;
    await welcome.waitForDisplayed({ timeout: 15000 });
  }
}
```

### 3. Gesture Testing and Device-Specific Interactions

```typescript
// tests/gestures.spec.ts
import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import { createDriver } from '../config/appium.config';
import type { Browser } from 'webdriverio';

const DEVICE = process.env.TEST_DEVICE || 'pixel-8';

describe('Gesture Interactions', () => {
  let driver: Browser;

  before(async function () {
    this.timeout(120000);
    driver = await createDriver(DEVICE);
    // Navigate to gesture test screen
    await performLogin(driver);
  });

  after(async () => {
    if (driver) await driver.deleteSession();
  });

  it('swipes left to reveal delete action on list item', async () => {
    const listItem = driver.isIOS
      ? await driver.$('~list-item-0')
      : await driver.$('android=new UiSelector().resourceId("com.myapp:id/list_item_0")');

    await listItem.waitForDisplayed();
    const { x, y, width, height } = await listItem.getLocation();
    const size = await listItem.getSize();

    // Swipe left on the list item
    await driver.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x: x + size.width - 20, y: y + size.height / 2 },
          { type: 'pointerDown', button: 0 },
          { type: 'pause', duration: 100 },
          { type: 'pointerMove', duration: 300, x: x + 20, y: y + size.height / 2 },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ]);

    // Verify delete button appears
    const deleteBtn = driver.isIOS
      ? await driver.$('~delete-action')
      : await driver.$('android=new UiSelector().text("Delete")');

    expect(await deleteBtn.isDisplayed()).to.be.true;
  });

  it('pinch to zoom on image', async () => {
    const image = driver.isIOS
      ? await driver.$('~zoomable-image')
      : await driver.$('android=new UiSelector().resourceId("com.myapp:id/zoomable_image")');

    await image.waitForDisplayed();
    const location = await image.getLocation();
    const size = await image.getSize();
    const centerX = location.x + size.width / 2;
    const centerY = location.y + size.height / 2;

    // Pinch out (zoom in) with two fingers
    await driver.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x: centerX - 10, y: centerY },
          { type: 'pointerDown', button: 0 },
          { type: 'pause', duration: 100 },
          { type: 'pointerMove', duration: 500, x: centerX - 150, y: centerY },
          { type: 'pointerUp', button: 0 },
        ],
      },
      {
        type: 'pointer',
        id: 'finger2',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x: centerX + 10, y: centerY },
          { type: 'pointerDown', button: 0 },
          { type: 'pause', duration: 100 },
          { type: 'pointerMove', duration: 500, x: centerX + 150, y: centerY },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ]);

    // Verify zoom level changed (app-specific assertion)
    const zoomIndicator = driver.isIOS
      ? await driver.$('~zoom-level')
      : await driver.$('android=new UiSelector().resourceId("com.myapp:id/zoom_level")');

    if (await zoomIndicator.isExisting()) {
      const zoomText = await zoomIndicator.getText();
      const zoomPercent = parseInt(zoomText.replace('%', ''));
      expect(zoomPercent).to.be.greaterThan(100);
    }
  });

  it('long press opens context menu', async () => {
    const listItem = driver.isIOS
      ? await driver.$('~list-item-1')
      : await driver.$('android=new UiSelector().resourceId("com.myapp:id/list_item_1")');

    await listItem.waitForDisplayed();
    const location = await listItem.getLocation();
    const size = await listItem.getSize();

    // Long press
    await driver.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x: location.x + size.width / 2, y: location.y + size.height / 2 },
          { type: 'pointerDown', button: 0 },
          { type: 'pause', duration: 1500 }, // hold for 1.5 seconds
          { type: 'pointerUp', button: 0 },
        ],
      },
    ]);

    // Verify context menu appears
    const contextMenu = driver.isIOS
      ? await driver.$('-ios class chain:**/XCUIElementTypeMenu')
      : await driver.$('android=new UiSelector().resourceId("com.myapp:id/context_menu")');

    expect(await contextMenu.isDisplayed()).to.be.true;
  });

  it('pull to refresh loads new data', async () => {
    const list = driver.isIOS
      ? await driver.$('-ios class chain:**/XCUIElementTypeTable')
      : await driver.$('android=new UiSelector().resourceId("com.myapp:id/product_list")');

    await list.waitForDisplayed();
    const location = await list.getLocation();
    const size = await list.getSize();

    const startX = location.x + size.width / 2;
    const startY = location.y + 50;
    const endY = location.y + size.height / 2;

    // Pull down gesture
    await driver.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x: startX, y: startY },
          { type: 'pointerDown', button: 0 },
          { type: 'pause', duration: 100 },
          { type: 'pointerMove', duration: 500, x: startX, y: endY },
          { type: 'pause', duration: 500 }, // hold to trigger refresh
          { type: 'pointerUp', button: 0 },
        ],
      },
    ]);

    // Wait for refresh to complete
    const spinner = driver.isIOS
      ? await driver.$('-ios class chain:**/XCUIElementTypeActivityIndicator')
      : await driver.$('android=new UiSelector().className("android.widget.ProgressBar")');

    // Spinner should appear then disappear
    if (await spinner.isExisting()) {
      await spinner.waitForDisplayed({ timeout: 5000, reverse: true });
    }
  });

  it('handles device rotation', async () => {
    // Set to portrait
    await driver.setOrientation('PORTRAIT');
    await driver.pause(500);

    const portraitLayout = driver.isIOS
      ? await driver.$('~main-layout')
      : await driver.$('android=new UiSelector().resourceId("com.myapp:id/main_layout")');

    const portraitSize = await portraitLayout.getSize();

    // Rotate to landscape
    await driver.setOrientation('LANDSCAPE');
    await driver.pause(1000);

    const landscapeSize = await portraitLayout.getSize();

    // Width and height should swap (approximately)
    expect(landscapeSize.width).to.be.greaterThan(portraitSize.width);

    // Verify content is still visible after rotation
    expect(await portraitLayout.isDisplayed()).to.be.true;

    // Reset to portrait
    await driver.setOrientation('PORTRAIT');
  });
});

async function performLogin(driver: Browser): Promise<void> {
  const { LoginPage } = await import('../pages/login.page');
  const { HomePage } = await import('../pages/home.page');

  const loginPage = new LoginPage(driver);
  await loginPage.waitForPageLoad();
  await loginPage.login('test@example.com', 'password123');

  const homePage = new HomePage(driver);
  await homePage.waitForHomeScreen();
}
```
