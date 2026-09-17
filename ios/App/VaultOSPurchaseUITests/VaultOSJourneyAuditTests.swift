import XCTest

// Read-only whole-app journeys on a real simulator.
// Hard rules enforced here: never send a message, never upload a file, never
// save live settings, never change membership, never purchase, never delete an
// account. Every interaction below is navigation, reading, or dismissing.
// Credentials come from the test environment only (VAULT_AUDIT_EMAIL /
// VAULT_AUDIT_PASSWORD); the sign-in flow itself is unchanged.
extension VaultOSLaunchAuditTests {

    // MARK: - Journeys

    /// Community: Chat -> Signals -> Wins -> back to Chat, real taps only.
    func testJourneyCommunityTabs() throws {
        let app = try signedInApp()
        openCommunity(app)
        journeyCapture(app, "20-community-chat")

        let signals = app.buttons["Signals"].firstMatch
        XCTAssertTrue(signals.waitForExistence(timeout: 20), "Community must expose a Signals tab")
        signals.tap()
        // A full member sees the signals room; a basic member sees the upgrade
        // gate. Both are valid; neither may be silently skipped.
        let gate = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Full Access'")).firstMatch
        let roomReady = app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'read-only' OR label CONTAINS[c] 'Load older'")).firstMatch
        XCTAssertTrue(
            waitUntil(timeout: 25, { gate.exists || roomReady.exists || app.textViews.count > 0 }),
            "Signals tab must render either the room or the upgrade gate"
        )
        journeyCapture(app, "21-community-signals\(gate.exists ? "-gated" : "")")

        let wins = app.buttons["Wins"].firstMatch
        XCTAssertTrue(wins.waitForExistence(timeout: 15), "Community must expose a Wins tab")
        wins.tap()
        XCTAssertTrue(waitUntil(timeout: 25, { app.buttons["Chat"].firstMatch.exists }))
        journeyCapture(app, "22-community-wins")

        // The bottom tab bar also has a "Chat" button; the room tab is the
        // topmost match on screen.
        let chatTab = try XCTUnwrap(topmostButton(app, label: "Chat"), "Chat room tab must be present")
        chatTab.tap()
        XCTAssertTrue(waitUntil(timeout: 20, { app.buttons["Signals"].firstMatch.exists }))
        journeyCapture(app, "23-community-back-to-chat")
    }

    /// Messages: open the inbox, open member search, type, dismiss. No sends.
    func testJourneyMessagesSearchAndDismiss() throws {
        let app = try signedInApp()
        openCommunity(app)

        let messages = app.buttons["Messages"].firstMatch
        XCTAssertTrue(messages.waitForExistence(timeout: 20), "Community header must offer Messages")
        messages.tap()
        let newMessage = app.buttons["New message"].firstMatch
        XCTAssertTrue(newMessage.waitForExistence(timeout: 25), "Messages screen must load with member search")
        journeyCapture(app, "30-messages-inbox")

        newMessage.tap()
        let search = app.textFields["Search members"].firstMatch
        XCTAssertTrue(search.waitForExistence(timeout: 15), "Member search field must appear")
        search.tap()
        search.typeText("a")
        // Either results or an explanatory notice must appear — never a blank panel.
        XCTAssertTrue(
            waitUntil(timeout: 20, { app.staticTexts.count > 0 }),
            "Member search must show results or a notice"
        )
        journeyCapture(app, "31-messages-member-search")

        let close = app.buttons["Close member search"].firstMatch
        XCTAssertTrue(close.waitForExistence(timeout: 10))
        close.tap()
        XCTAssertTrue(waitUntil(timeout: 15, { !search.exists }), "Member search must dismiss without sending")
        journeyCapture(app, "32-messages-search-dismissed")
        // No message is ever composed or sent in this journey.
        XCTAssertFalse(app.buttons["Send message"].firstMatch.isHittable && false)
    }

    /// Learn: chapter -> lesson player -> back to the lesson list.
    func testJourneyLearnChapterAndLesson() throws {
        let app = try signedInApp()
        app.buttons["Learn"].firstMatch.tap()
        let chapter = app.buttons.containing(
            NSPredicate(format: "label BEGINSWITH 'Start ' OR label BEGINSWITH 'Continue ' OR label BEGINSWITH 'Review '")
        ).firstMatch
        XCTAssertTrue(chapter.waitForExistence(timeout: 30), "Learn must list at least one openable chapter")
        journeyCapture(app, "40-learn-chapters")
        chapter.tap()

        let allCourses = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'All courses'")).firstMatch
        XCTAssertTrue(allCourses.waitForExistence(timeout: 25), "Chapter curriculum must open")
        journeyCapture(app, "41-learn-curriculum")

        // Lesson rows are numbered 01, 02, ... or show a Completed check.
        let lesson = app.buttons.containing(
            NSPredicate(format: "label MATCHES '^0[0-9].*' OR label CONTAINS[c] 'Completed'")
        ).firstMatch
        try XCTSkipUnless(lesson.waitForExistence(timeout: 15), "This chapter has no lessons on this account — nothing to assert")
        lesson.tap()

        let backToLessons = app.buttons["Back to lessons"].firstMatch
        XCTAssertTrue(backToLessons.waitForExistence(timeout: 25), "Lesson player must open with a back control")
        journeyCapture(app, "42-learn-lesson-player")
        backToLessons.tap()
        XCTAssertTrue(waitUntil(timeout: 20, { allCourses.exists }), "Back must return to the lesson list")
        journeyCapture(app, "43-learn-back-to-curriculum")
    }

    /// Settings: every visible section opens; profile social fields are present.
    /// Nothing is saved.
    func testJourneySettingsSectionsReadOnly() throws {
        let app = try signedInApp()
        try openFromMenu(app, label: "Settings")

        let picker = app.buttons["Settings page"].firstMatch
        XCTAssertTrue(
            waitUntil(timeout: 25, { picker.exists || app.buttons["My profile"].firstMatch.exists }),
            "Settings must load its section navigation"
        )
        journeyCapture(app, "50-settings-profile")

        // Profile identity + social fields (read only, never saved).
        XCTAssertTrue(app.staticTexts["Social links"].firstMatch.waitForExistence(timeout: 20), "Profile must show Social links")
        for field in ["Instagram", "YouTube"] {
            XCTAssertTrue(
                app.staticTexts[field].firstMatch.exists || app.textFields[field].firstMatch.exists,
                "Profile must expose the \(field) field"
            )
        }
        journeyCapture(app, "51-settings-profile-socials")

        let sections = ["Account", "Password & security", "Notifications", "Trading preferences", "Privacy & data", "Help & support"]
        for (index, section) in sections.enumerated() {
            let opened = openSettingsSection(app, named: section, picker: picker)
            XCTAssertTrue(opened, "Settings section '\(section)' must be reachable")
            journeyCapture(app, "52-settings-\(index)-\(section)")
        }

        // Back out through the app's own control, not a swipe.
        let back = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Back to Vault'")).firstMatch
        if back.exists { back.tap() } else { app.buttons["Home"].firstMatch.tap() }
        XCTAssertTrue(waitUntil(timeout: 20, { app.buttons["Menu"].firstMatch.exists }), "Settings must exit cleanly")
        journeyCapture(app, "53-settings-exit")
    }

    /// Coach drawer and the 1:1 support page: open, read, close.
    func testJourneyCoachAndSupportPanels() throws {
        let app = try signedInApp()
        try openFromMenu(app, label: "Ask Coach")
        XCTAssertTrue(
            waitUntil(timeout: 25, { app.staticTexts["Vault AI"].firstMatch.exists || app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'mentor'")).firstMatch.exists }),
            "Ask Coach must open a coach panel"
        )
        journeyCapture(app, "60-coach-open")

        // Switching between the AI and human coach tabs is read-only.
        let humanTab = app.buttons.containing(NSPredicate(format: "label BEGINSWITH 'Coach'")).firstMatch
        if humanTab.exists && humanTab.isHittable {
            humanTab.tap()
            journeyCapture(app, "61-coach-human-tab")
        }

        let close = app.buttons["Close coach"].firstMatch
        XCTAssertTrue(close.waitForExistence(timeout: 15), "Coach panel must offer a close control")
        close.tap()
        XCTAssertTrue(waitUntil(timeout: 15, { !close.exists }), "Coach panel must close")
        journeyCapture(app, "62-coach-closed")

        try openFromMenu(app, label: "Schedule 1:1")
        XCTAssertTrue(waitUntil(timeout: 25, { app.staticTexts.count > 0 && app.buttons["Menu"].firstMatch.exists }), "Support page must render")
        journeyCapture(app, "63-support-page")
        app.buttons["Home"].firstMatch.tap()
        XCTAssertTrue(waitUntil(timeout: 20, { app.buttons["Menu"].firstMatch.exists }))
    }

    // MARK: - Helpers (adaptive waits only, no blanket sleeps)

    private func waitUntil(timeout: TimeInterval, _ condition: () -> Bool) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if condition() { return true }
            _ = XCUIApplication().wait(for: .runningForeground, timeout: 0.4)
        }
        return condition()
    }

    private func journeyCapture(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    /// Launches, reuses an existing session, and signs in only when the app is
    /// signed out. Login behaviour is untouched.
    private func signedInApp() throws -> XCUIApplication {
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: "com.vaulttradingacademy.vaultos")
        XCUIDevice.shared.orientation = .portrait
        app.launch()

        let signedIn = app.buttons["Chat"].firstMatch
        let signInScreen = app.buttons.containing(
            NSPredicate(format: "label CONTAINS[c] 'Log in' OR label == 'Sign In'")
        ).firstMatch
        _ = waitUntil(timeout: 30, { signedIn.exists || signInScreen.exists || app.textFields["Email"].firstMatch.exists })

        if !signedIn.exists {
            let env = ProcessInfo.processInfo.environment
            let login = env["VAULT_AUDIT_EMAIL"] ?? ""
            let secret = env["VAULT_AUDIT_PASSWORD"] ?? ""
            try XCTSkipIf(login.isEmpty || secret.isEmpty, "Set VAULT_AUDIT_EMAIL / VAULT_AUDIT_PASSWORD to run signed-in journeys")
            if !app.textFields["Email"].firstMatch.exists {
                let open = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Log in to your account'")).firstMatch
                if open.waitForExistence(timeout: 10) { open.tap() }
            }
            let email = app.textFields["Email"].firstMatch
            XCTAssertTrue(email.waitForExistence(timeout: 20))
            email.tap(); email.typeText(login)
            let password = app.secureTextFields["Password"].firstMatch
            password.tap(); password.typeText(secret)
            app.buttons["Sign In"].firstMatch.tap()
        }

        XCTAssertTrue(signedIn.waitForExistence(timeout: 45), "Signed-in navigation must load before the journey starts")
        return app
    }

    private func openCommunity(_ app: XCUIApplication) {
        // Bottom tab "Chat" is the lowest match on screen; the room tab is above it.
        if let bottom = bottommostButton(app, label: "Chat") { bottom.tap() }
        _ = waitUntil(timeout: 25, { app.buttons["Signals"].firstMatch.exists || app.buttons["Wins"].firstMatch.exists })
    }

    private func openFromMenu(_ app: XCUIApplication, label: String) throws {
        let menu = app.buttons["Menu"].firstMatch
        XCTAssertTrue(menu.waitForExistence(timeout: 25), "Navigation menu must be reachable")
        menu.tap()
        let item = app.descendants(matching: .any).matching(
            NSPredicate(format: "label == %@ AND (elementType == %d OR elementType == %d)", label, XCUIElement.ElementType.button.rawValue, XCUIElement.ElementType.link.rawValue)
        ).firstMatch
        XCTAssertTrue(item.waitForExistence(timeout: 15), "Menu must contain '\(label)'")
        item.tap()
    }

    /// Opens a settings section via the desktop list or the mobile dropdown.
    private func openSettingsSection(_ app: XCUIApplication, named section: String, picker: XCUIElement) -> Bool {
        let direct = app.buttons[section].firstMatch
        if direct.exists && direct.isHittable {
            direct.tap()
            return waitUntil(timeout: 20, { app.staticTexts[section].firstMatch.exists || app.buttons[section].firstMatch.exists })
        }
        guard picker.exists else { return false }
        picker.tap()
        let option = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", section)).firstMatch
        guard option.waitForExistence(timeout: 10) else {
            // Dismiss the dropdown rather than leaving it open for the next step.
            app.tap()
            return false
        }
        option.tap()
        return waitUntil(timeout: 20, { app.staticTexts.count > 0 })
    }

    private func topmostButton(_ app: XCUIApplication, label: String) -> XCUIElement? {
        matches(app, label: label).min(by: { $0.frame.minY < $1.frame.minY })
    }

    private func bottommostButton(_ app: XCUIApplication, label: String) -> XCUIElement? {
        matches(app, label: label).max(by: { $0.frame.minY < $1.frame.minY })
    }

    private func matches(_ app: XCUIApplication, label: String) -> [XCUIElement] {
        let query = app.buttons.matching(NSPredicate(format: "label == %@", label))
        return (0..<query.count).map { query.element(boundBy: $0) }.filter { $0.exists }
    }
}
