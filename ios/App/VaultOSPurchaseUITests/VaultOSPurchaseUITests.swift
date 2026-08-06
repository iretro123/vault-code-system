import XCTest
import StoreKitTest

final class VaultOSPurchaseUITests: XCTestCase {
    private let bundleId = "com.vaulttradingacademy.vaultos"
    private let productId = "com.vaulttradingacademy.vaultos.fullaccess.monthly99v2"
    private let email = "appreview+1778972025@vault.dev"
    private let password = "VaultOSReview2026!"
    private let basicTestEmail = ProcessInfo.processInfo.environment["VAULTOS_BASIC_TEST_EMAIL"] ?? "codex-basic-signals-1784988264767@vault.dev"
    private let basicTestPassword = ProcessInfo.processInfo.environment["VAULTOS_BASIC_TEST_PASSWORD"] ?? "VaultOSBasic2026!"
    private let sandboxAppleId = ProcessInfo.processInfo.environment["VAULTOS_SANDBOX_APPLE_ID"] ?? ""
    private let sandboxPassword = ProcessInfo.processInfo.environment["VAULTOS_SANDBOX_APPLE_PASSWORD"] ?? ""
    private var storeKitSession: SKTestSession?

    override func setUpWithError() throws {
        continueAfterFailure = false
        storeKitSession = try makeStoreKitSession()
        storeKitSession?.resetToDefaultState()
        storeKitSession?.clearTransactions()
        storeKitSession?.askToBuyEnabled = false
        storeKitSession?.failTransactionsEnabled = false
        storeKitSession?.interruptedPurchasesEnabled = false
        storeKitSession?.disableDialogs = false
    }

    @available(iOS 17.0, *)
    func testLocalStoreKitConfigurationCanCreateTransaction() async throws {
        guard let storeKitSession else {
            XCTFail("Expected StoreKit test session to be configured.")
            return
        }

        storeKitSession.disableDialogs = true
        let transaction = try await storeKitSession.buyProduct(identifier: productId)
        XCTAssertEqual(transaction.productID, productId)
    }

    func testLocalStoreKitPaywallProductLoads() throws {
        let app = XCUIApplication(bundleIdentifier: bundleId)
        app.launch()
        wait(seconds: 4)
        attachScreenshot(named: "01_local_storekit_launch", app: app)

        recoverIfError(app)

        if !isOnPurchaseScreen(app) {
            tapFirstExisting(in: app, labels: [
                "View Full Access - $99/mo",
                "View Full Access — $99/mo",
                "View Full Access",
                "Upgrade $99/month",
                "Upgrade to full access for $99/month"
            ], timeout: 20)
            wait(seconds: 8)
        }
        attachScreenshot(named: "02_local_storekit_paywall", app: app)

        XCTAssertTrue(
            app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] '$99'")).firstMatch.waitForExistence(timeout: 20)
                || app.buttons.containing(NSPredicate(format: "label CONTAINS[c] '$99'")).firstMatch.waitForExistence(timeout: 20),
            "Expected the local StoreKit $99 subscription product/pricing to be visible before purchase."
        )

        addUIInterruptionMonitor(withDescription: "Local StoreKit purchase dialogs") { alert in
            for label in ["Subscribe", "Confirm", "Buy", "Continue", "OK", "Done"] {
                let button = alert.buttons[label]
                if button.exists {
                    button.tap()
                    return true
                }
            }
            return false
        }

        app.swipeUp()
        wait(seconds: 0.8)
        app.swipeUp()
        wait(seconds: 0.8)
        attachScreenshot(named: "03_local_storekit_purchase_cta", app: app)

        tapFirstExisting(in: app, labels: [
            "Start full access for $99.00",
            "Start full access for $99",
            "Start full access for $99/month",
            "Start full access for $99/mo",
            "Start full access for $99.00/month",
            "Start full access for $99.00/mo",
            "Upgrade $99/month",
            "Upgrade to full access for $99/month"
        ], timeout: 20)

        wait(seconds: 3)
        app.tap()
        handleSpringBoardPurchasePrompts()
        attachScreenshot(named: "04_local_storekit_after_purchase_prompt", app: app)
    }

    func testSandboxPurchaseUnlockPersists() throws {
        let app = XCUIApplication(bundleIdentifier: bundleId)
        app.launch()
        wait(seconds: 4)
        attachScreenshot(named: "01_launch", app: app)

        recoverIfError(app)
        signInIfNeeded(app)

        if !isOnPurchaseScreen(app) {
            tapFirstExisting(in: app, labels: [
                "View Full Access - $99/mo",
                "View Full Access — $99/mo",
                "View Full Access",
                "Upgrade $99/month",
                "Upgrade to full access for $99/month"
            ], timeout: 20)
            wait(seconds: 8)
        }
        attachScreenshot(named: "02_paywall_loaded", app: app)

        XCTAssertTrue(
            app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] '$99'")).firstMatch.waitForExistence(timeout: 20)
                || app.buttons.containing(NSPredicate(format: "label CONTAINS[c] '$99'")).firstMatch.waitForExistence(timeout: 20),
            "Expected $99 subscription product/pricing to be visible before purchase."
        )

        addUIInterruptionMonitor(withDescription: "StoreKit purchase dialogs") { alert in
            if !self.sandboxAppleId.isEmpty && !self.sandboxPassword.isEmpty {
                if alert.textFields.count > 0 {
                    let field = alert.textFields.element(boundBy: 0)
                    if field.exists {
                        field.tap()
                        field.typeText(self.sandboxAppleId)
                    }
                }

                if alert.secureTextFields.count > 0 {
                    let field = alert.secureTextFields.element(boundBy: 0)
                    if field.exists {
                        field.tap()
                        field.typeText(self.sandboxPassword)
                    }
                }

                for label in ["Sign In", "Continue", "OK", "Try Again"] {
                    let button = alert.buttons[label]
                    if button.exists {
                        button.tap()
                        return true
                    }
                }
            }

            for label in ["Subscribe", "Confirm", "Buy", "Continue", "Done"] {
                let button = alert.buttons[label]
                if button.exists {
                    button.tap()
                    return true
                }
            }
            return false
        }

        app.swipeUp()
        wait(seconds: 0.8)
        app.swipeUp()
        wait(seconds: 0.8)
        attachScreenshot(named: "03_paywall_purchase_cta", app: app)

        tapFirstExisting(in: app, labels: [
            "Start full access for $99.00",
            "Start full access for $99",
            "Start full access for $99/month",
            "Start full access for $99/mo",
            "Start full access for $99.00/month",
            "Start full access for $99.00/mo",
            "View Full Access - $99/mo",
            "Upgrade $99/month",
            "Upgrade to full access for $99/month"
        ], timeout: 15)

        wait(seconds: 3)
        app.tap()
        handleSpringBoardPurchasePrompts()
        attachScreenshot(named: "04_after_purchase_prompt", app: app)

        wait(seconds: 18)
        handleSpringBoardPurchasePrompts()
        recoverIfError(app)
        attachScreenshot(named: "05_after_unlock_wait", app: app)

        let unlocked = app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'Home'")).firstMatch.exists
            || app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'Trade OS'")).firstMatch.exists
            || app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Home'")).firstMatch.exists
            || app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Trade OS'")).firstMatch.exists
            || app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'Learn'")).firstMatch.exists
        XCTAssertTrue(unlocked, "Expected app to navigate to unlocked/member area after purchase.")

        XCUIDevice.shared.press(.home)
        app.terminate()
        wait(seconds: 2)
        app.launch()
        wait(seconds: 8)
        recoverIfError(app)
        attachScreenshot(named: "06_after_relaunch", app: app)

        XCTAssertFalse(app.staticTexts["Courses is locked on this account"].exists, "Paid access should persist after relaunch.")
        XCTAssertFalse(app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'Upgrade to full access'")).firstMatch.exists, "Upgrade banner should disappear after paid unlock.")
    }

    func testLiveTabDoesNotTriggerRealtimeCallbackCrash() throws {
        let app = XCUIApplication(bundleIdentifier: bundleId)
        app.launch()
        wait(seconds: 5)
        recoverIfError(app)
        attachScreenshot(named: "live_01_after_launch", app: app)

        tapFirstExisting(in: app, labels: ["Menu"], timeout: 12)
        wait(seconds: 1.5)
        attachScreenshot(named: "live_02_sidebar_open", app: app)

        if !elementExists(in: app, labels: ["Live"], timeout: 3) {
            // Basic/free users intentionally do not see Live. Sign out and use
            // the full review account so this test verifies the member route.
            tapFirstExistingOrCoordinate(in: app, labels: ["Log out"], timeout: 5, normalizedX: 0.5, normalizedY: 0.88)
            wait(seconds: 3)
            signInIfNeeded(app)
            tapFirstExisting(in: app, labels: ["Menu"], timeout: 12)
            wait(seconds: 1.5)
            attachScreenshot(named: "live_02b_sidebar_full_account", app: app)
        }

        tapFirstExistingOrCoordinate(in: app, labels: ["Live"], timeout: 12, normalizedX: 0.18, normalizedY: 0.36)
        wait(seconds: 5)
        attachScreenshot(named: "live_03_after_live_tap", app: app)

        XCTAssertFalse(app.staticTexts["Something went wrong"].exists, "Live tab should not render the app error boundary.")
        XCTAssertFalse(
            app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'postgres_changes'")).firstMatch.exists,
            "Live tab should not crash with Supabase realtime callback reuse."
        )
        XCTAssertTrue(
            app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'Live'")).firstMatch.exists
                || app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'Live Sessions'")).firstMatch.exists,
            "Expected the Live section to render after tapping the sidebar Live item."
        )
    }

    func testEmojiPickerRendersNativeEmojiAndSearches() throws {
        let app = XCUIApplication(bundleIdentifier: bundleId)
        app.launch()
        wait(seconds: 5)
        recoverIfError(app)
        attachScreenshot(named: "emoji_01_after_launch", app: app)

        tapFirstExisting(in: app, labels: ["Chat"], timeout: 12)
        wait(seconds: 4)
        recoverIfError(app)
        attachScreenshot(named: "emoji_02_chat_open", app: app)

        tapFirstExistingOrCoordinate(in: app, labels: ["Emoji"], timeout: 12, normalizedX: 0.17, normalizedY: 0.84)
        wait(seconds: 1.5)
        attachScreenshot(named: "emoji_03_picker_open", app: app)

        XCTAssertFalse(
            app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] '�'")).firstMatch.exists,
            "Emoji picker should not render replacement glyphs."
        )

        let searchField = app.textFields["Search"].firstMatch
        XCTAssertTrue(searchField.waitForExistence(timeout: 8), "Expected emoji search field to exist.")
        searchField.tap()
        searchField.typeText("fire")
        wait(seconds: 1)
        attachScreenshot(named: "emoji_04_search_fire", app: app)

        XCTAssertTrue(
            app.buttons["Fire"].exists
                || app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Fire'")).firstMatch.exists,
            "Expected fire emoji search results to render."
        )

        app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Fire'")).firstMatch.tap()
        wait(seconds: 1)
        attachScreenshot(named: "emoji_05_after_fire_insert", app: app)
    }

    func testFreeAccountBootcampTabOpensLandingPage() throws {
        let app = XCUIApplication(bundleIdentifier: bundleId)
        app.launch()
        wait(seconds: 5)
        recoverIfError(app)
        attachScreenshot(named: "bootcamp_01_free_account_launch", app: app)

        tapFirstExisting(in: app, labels: ["Bootcamp"], timeout: 12)
        wait(seconds: 3)
        recoverIfError(app)
        attachScreenshot(named: "bootcamp_02_tab_opened", app: app)

        XCTAssertTrue(
            app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'Master the markets'")).firstMatch.exists
                || app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'Trade with confidence'")).firstMatch.exists
                || app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'Day Trading Bootcamp'")).firstMatch.exists,
            "Expected the free-account Bootcamp page to render after tapping the Bootcamp tab."
        )

        app.swipeUp()
        wait(seconds: 0.5)
        app.swipeUp()
        wait(seconds: 0.5)
        app.swipeUp()
        wait(seconds: 1)
        tapFirstExisting(in: app, labels: ["Reserve My Seat", "Reserve My Bootcamp Seat", "View Bootcamp Details"], timeout: 12)
        wait(seconds: 4)
        attachScreenshot(named: "bootcamp_03_after_cta_tap", app: app)

        let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
        let safariOpened = safari.wait(for: .runningForeground, timeout: 8)
        XCTAssertTrue(
            safariOpened
                || app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'vaulttradingacademy.com'")).firstMatch.exists
                || app.webViews.containing(NSPredicate(format: "label CONTAINS[c] 'vaulttradingacademy.com'")).firstMatch.exists,
            "Expected Bootcamp CTA to open the external bootcamp landing page."
        )
    }

    func testBasicSignalsTabShowsUpgradeGate() throws {
        let app = XCUIApplication(bundleIdentifier: bundleId)
        app.launch()
        wait(seconds: 5)
        recoverIfError(app)
        attachScreenshot(named: "signals_01_after_launch", app: app)

        if !basicTestEmail.isEmpty && !basicTestPassword.isEmpty {
            signInWithCredentials(app, email: basicTestEmail, password: basicTestPassword)
            wait(seconds: 5)
            recoverIfError(app)
            attachScreenshot(named: "signals_02_basic_account_signed_in", app: app)
        }

        tapFirstExisting(in: app, labels: ["Chat", "Community"], timeout: 12)
        wait(seconds: 3)
        recoverIfError(app)
        attachScreenshot(named: "signals_03_community_open", app: app)

        tapFirstExisting(in: app, labels: ["Signals"], timeout: 12)
        wait(seconds: 2)
        recoverIfError(app)
        attachScreenshot(named: "signals_04_upgrade_gate", app: app)

        XCTAssertTrue(
            app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'Full Access Signals'")).firstMatch.exists
                || app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'Unlock live trade signals'")).firstMatch.exists,
            "Expected the basic/free Signals tab to show the full-access upgrade gate."
        )
        XCTAssertTrue(
            app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'View Full Access'")).firstMatch.exists,
            "Expected the Signals upgrade gate to show the $99 full-access CTA."
        )
    }

    private func signInIfNeeded(_ app: XCUIApplication) {
        if app.staticTexts["Chat"].exists
            || app.staticTexts["Learn"].exists
            || app.buttons["Upgrade $99/month"].exists
            || app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'Upgrade to full access'")).firstMatch.exists {
            return
        }

        if app.staticTexts["Already have an account?"].exists || app.buttons["Log in"].exists || app.links["Log in"].exists {
            tapFirstExisting(in: app, labels: ["Log in", "Sign in"], timeout: 10)
            wait(seconds: 1)
        }

        let emailField = app.textFields.firstMatch
        if emailField.waitForExistence(timeout: 3) {
            emailField.tap()
            emailField.typeText(email)
        } else {
            return
        }

        let passwordField = app.secureTextFields.firstMatch
        if passwordField.waitForExistence(timeout: 10) {
            passwordField.tap()
            passwordField.typeText(password)
            app.keyboards.buttons["Return"].tapIfExists()
            app.keyboards.buttons["Done"].tapIfExists()
            app.swipeUp()
        }

        tapFirstExistingOrCoordinate(in: app, labels: ["Log in", "Sign in", "Sign In", "Continue"], timeout: 10, normalizedX: 0.5, normalizedY: 0.72)
        wait(seconds: 8)
    }

    private func signInWithCredentials(_ app: XCUIApplication, email: String, password: String) {
        if app.buttons["Chat"].exists
            || app.buttons["Menu"].exists
            || app.staticTexts["VaultAcademy"].exists {
            return
        }

        if app.staticTexts["Already have an account?"].exists || app.buttons["Log in"].exists || app.links["Log in"].exists {
            tapFirstExisting(in: app, labels: ["Log in", "Sign in"], timeout: 10)
            wait(seconds: 1)
        }

        let emailField = app.textFields.firstMatch
        XCTAssertTrue(emailField.waitForExistence(timeout: 12), "Expected login email field.")
        emailField.tap()
        emailField.typeText(email)

        let passwordField = app.secureTextFields.firstMatch
        XCTAssertTrue(passwordField.waitForExistence(timeout: 12), "Expected login password field.")
        passwordField.tap()
        passwordField.typeText(password)
        app.keyboards.buttons["Return"].tapIfExists()
        app.keyboards.buttons["Done"].tapIfExists()
        app.swipeUp()
        wait(seconds: 0.5)

        tapFirstExistingOrCoordinate(in: app, labels: ["Log in", "Sign in", "Sign In", "Continue"], timeout: 12, normalizedX: 0.5, normalizedY: 0.72)
    }

    private func recoverIfError(_ app: XCUIApplication) {
        if app.staticTexts["Something went wrong"].exists || app.buttons["Reload page"].exists {
            app.buttons["Reload page"].tap()
            wait(seconds: 5)
        }
    }

    private func isOnPurchaseScreen(_ app: XCUIApplication) -> Bool {
        app.buttons["Start full access for $99.00"].exists
            || app.buttons["Start full access for $99"].exists
            || app.staticTexts["Unlock Vault OS"].exists
            || app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'Required Subscription Information'")).firstMatch.exists
    }

    private func tapFirstExisting(in app: XCUIApplication, labels: [String], timeout: TimeInterval) {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            for label in labels {
                let button = app.buttons[label]
                if button.exists && button.isHittable {
                    button.tap()
                    return
                }

                let link = app.links[label]
                if link.exists && link.isHittable {
                    link.tap()
                    return
                }

                let staticText = app.staticTexts[label]
                if staticText.exists && staticText.isHittable {
                    staticText.tap()
                    return
                }

                let containsPredicate = NSPredicate(format: "label CONTAINS[c] %@", label)
                let matchingButton = app.buttons.containing(containsPredicate).firstMatch
                if matchingButton.exists && matchingButton.isHittable {
                    matchingButton.tap()
                    return
                }

                let matchingStaticText = app.staticTexts.containing(containsPredicate).firstMatch
                if matchingStaticText.exists && matchingStaticText.isHittable {
                    matchingStaticText.tap()
                    return
                }
            }
            wait(seconds: 0.4)
        }

        XCTFail("Could not find tappable element for labels: \(labels.joined(separator: ", "))")
    }

    private func elementExists(in app: XCUIApplication, labels: [String], timeout: TimeInterval) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            for label in labels {
                if app.buttons[label].exists
                    || app.links[label].exists
                    || app.staticTexts[label].exists
                    || app.buttons.containing(NSPredicate(format: "label CONTAINS[c] %@", label)).firstMatch.exists
                    || app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] %@", label)).firstMatch.exists {
                    return true
                }
            }
            wait(seconds: 0.4)
        }
        return false
    }

    private func tapFirstExistingOrCoordinate(in app: XCUIApplication, labels: [String], timeout: TimeInterval, normalizedX: CGFloat, normalizedY: CGFloat) {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            for label in labels {
                let button = app.buttons[label]
                if button.exists && button.isHittable {
                    button.tap()
                    return
                }

                let link = app.links[label]
                if link.exists && link.isHittable {
                    link.tap()
                    return
                }

                let containsPredicate = NSPredicate(format: "label CONTAINS[c] %@", label)
                let matchingButton = app.buttons.containing(containsPredicate).firstMatch
                if matchingButton.exists && matchingButton.isHittable {
                    matchingButton.tap()
                    return
                }
            }
            wait(seconds: 0.4)
        }

        app.coordinate(withNormalizedOffset: CGVector(dx: normalizedX, dy: normalizedY)).tap()
    }

    private func handleSpringBoardPurchasePrompts() {
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        for _ in 0..<20 {
            if !sandboxAppleId.isEmpty && !sandboxPassword.isEmpty {
                let textFields = springboard.textFields
                let secureFields = springboard.secureTextFields
                if textFields.count > 0 || secureFields.count > 0 {
                    if textFields.count > 0 {
                        let field = textFields.element(boundBy: 0)
                        if field.exists && field.isHittable {
                            field.tap()
                            field.typeText(sandboxAppleId)
                        }
                    }
                    if secureFields.count > 0 {
                        let field = secureFields.element(boundBy: 0)
                        if field.exists && field.isHittable {
                            field.tap()
                            field.typeText(sandboxPassword)
                        }
                    }
                    for label in ["Sign In", "Continue", "OK"] {
                        let button = springboard.buttons[label]
                        if button.exists && button.isHittable {
                            button.tap()
                            wait(seconds: 2)
                            return
                        }
                    }
                }
            }

            for label in ["Try Again", "Subscribe", "Confirm", "Buy", "Continue", "OK", "Done"] {
                let button = springboard.buttons[label]
                if button.exists && button.isHittable {
                    button.tap()
                    wait(seconds: 1)
                    return
                }
            }
            wait(seconds: 0.5)
        }
    }

    private func attachScreenshot(named name: String, app: XCUIApplication) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    private func wait(seconds: TimeInterval) {
        RunLoop.current.run(until: Date().addingTimeInterval(seconds))
    }

    private func makeStoreKitSession() throws -> SKTestSession {
        let sourceFile = URL(fileURLWithPath: #filePath)
        let projectStoreKitFile = sourceFile
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .appendingPathComponent("App/VaultOS.storekit")

        return try SKTestSession(contentsOf: projectStoreKitFile)
    }
}

private extension XCUIElement {
    func tapIfExists() {
        if exists && isHittable {
            tap()
        }
    }
}
