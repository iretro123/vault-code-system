import XCTest

// Read-only whole-app journeys on a real simulator.
// Hard rules enforced here: never send a message, never upload a file, never
// save live settings, never change membership, never purchase, never delete an
// account. Every interaction below is navigation, reading, or dismissing.
// Credentials come from the test environment only (VAULT_AUDIT_EMAIL /
// VAULT_AUDIT_PASSWORD); the sign-in flow itself is unchanged.
struct JourneyFailure: Error, CustomStringConvertible {
    let message: String
    var description: String { message }
}

extension VaultOSLaunchAuditTests {

    // MARK: - Journeys

    /// Read-only chart attachment regression: bounded preview, full-size viewing, exit.
    func testCommunityChartPreview() throws {
        let app = try signedInApp()
        openCommunity(app)
        try requireFeedSettled(app, context: "Chart preview room")
        let chart = app.buttons.containing(NSPredicate(format: "label BEGINSWITH 'Enlarge Screenshot 2026-09-18 at 10.43.48'")).firstMatch
        for _ in 0..<15 {
            if chart.exists && chart.isHittable && chart.frame.minY > 250 && chart.frame.maxY < app.frame.height - 120 { break }
            let towardEarlier = chart.exists && chart.frame.minY < 250
            app.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.55))
                .press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: towardEarlier ? 0.68 : 0.42)))
        }
        XCTAssertTrue(chart.exists, "The real chart attachment must be loaded")
        XCTAssertLessThanOrEqual(chart.frame.height, 380, "Chart and caption must stay compact")
        journeyCapture(app, "chart-bounded-preview")
        chart.tap()
        let zoom = app.descendants(matching: .any).matching(NSPredicate(format: "label == 'Actual size'")).firstMatch
        XCTAssertTrue(zoom.waitForExistence(timeout: 10))
        XCTAssertGreaterThan(zoom.frame.minY, 40, "Viewer controls must clear the status area")
        journeyCapture(app, "chart-fit-viewer")
        zoom.tap()
        let fit = app.descendants(matching: .any).matching(NSPredicate(format: "label == 'Fit to screen'")).firstMatch
        XCTAssertTrue(fit.exists)
        journeyCapture(app, "chart-original-resolution")
        fit.tap()
        app.buttons["Close preview"].firstMatch.tap()
        XCTAssertTrue(app.buttons["Signals"].firstMatch.exists)
    }

    /// Repeated process launches; preserves the signed-in user's data.
    func testRepeatedStartup() throws {
        let app = try signedInApp()
        for run in 1...3 {
            app.terminate()
            let started = Date()
            app.launch()
            try require(app.buttons["Chat"].firstMatch.waitForExistence(timeout: 25), "Startup must restore signed-in navigation", app)
            print("VAULT_STARTUP run=\(run) navigationSeconds=\(Date().timeIntervalSince(started))")
            journeyCapture(app, "startup-\(run)-ready")
        }
    }

    /// Community: Chat -> Signals -> Wins -> back to Chat, real taps only.
    func testJourneyCommunityTabs() throws {
        let app = try signedInApp()
        openCommunity(app)
        // The room must reach a real result — messages or its own empty state.
        // A skeleton that never resolves, or a load error, is a failure.
        try requireFeedSettled(app, context: "Chat room")
        journeyCapture(app, "20-community-chat")

        let signals = app.buttons["Signals"].firstMatch
        try require(signals.waitForExistence(timeout: 20), "Community must expose a Signals tab", app, signals)
        try tapWhenReady(app, signals, name: "Signals tab")
        journeyCapture(app, "20a-signals-transition")
        // A full member sees the signals room; a basic member sees the upgrade
        // gate. Both are valid; neither may be silently skipped.
        let gate = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Full Access'")).firstMatch
        try require(
            waitUntil(timeout: 25, { gate.exists || self.feedStateLabel(app) != nil || self.feedErrorVisible(app) }),
            "Signals tab must render either the signals room or the upgrade gate",
            app
        )
        if !gate.exists { try requireFeedSettled(app, context: "Signals room") }
        journeyCapture(app, "21-community-signals\(gate.exists ? "-gated" : "")")

        let wins = app.buttons["Wins"].firstMatch
        try require(wins.waitForExistence(timeout: 15), "Community must expose a Wins tab", app, wins)
        try tapWhenReady(app, wins, name: "Wins tab")
        journeyCapture(app, "21a-wins-transition")
        // Wins is a real room: it must reach a settled feed state, not merely
        // keep the tab bar on screen.
        try requireFeedSettled(app, context: "Wins room")
        journeyCapture(app, "22-community-wins")

        // The bottom tab bar also has a "Chat" button; the room tab is the
        // topmost match on screen.
        let chatTab = try XCTUnwrap(topmostButton(app, label: "Chat"), "Chat room tab must be present")
        try tapWhenReady(app, chatTab, name: "Chat room tab")
        journeyCapture(app, "22a-chat-transition")
        try require(waitUntil(timeout: 20, { app.buttons["Signals"].firstMatch.exists }), "Chat tab must restore the room tab bar", app)
        try requireFeedSettled(app, context: "Chat room after returning")
        journeyCapture(app, "23-community-back-to-chat")
    }

    /// Messages: open the inbox, open member search, type, dismiss. No sends.
    func testJourneyMessagesSearchAndDismiss() throws {
        let app = try signedInApp()
        openCommunity(app)

        let messages = app.buttons["Messages"].firstMatch
        try require(messages.waitForExistence(timeout: 20), "Community header must offer Messages", app, messages)
        try tapWhenReady(app, messages, name: "Messages")
        let newMessage = app.buttons["New message"].firstMatch
        try require(newMessage.waitForExistence(timeout: 25), "Messages screen must load with member search", app, newMessage)
        journeyCapture(app, "30-messages-inbox")

        try tapWhenReady(app, newMessage, name: "New message")
        let search = app.textFields["Search members"].firstMatch
        try require(search.waitForExistence(timeout: 15), "Member search field must appear", app, search)
        let dialogTitle = app.staticTexts["New message"].firstMatch
        let close = app.buttons["Close member search"].firstMatch
        try require(
            elementsWhollyVisible(app, dialogTitle, close, search),
            "New message heading, close control and search field must be wholly visible",
            app,
            dialogTitle,
            close,
            search
        )
        try tapWhenReady(app, search, name: "Search members field")
        search.typeText("a")
        try require(
            elementsWhollyVisible(app, dialogTitle, close, search),
            "New message heading and close control must remain wholly visible with the keyboard open",
            app,
            dialogTitle,
            close,
            search
        )
        // Either a member row or an explicit notice must appear — an empty panel
        // is a failure, so assert on real search output, not element counts.
        let noMembersNotice = app.staticTexts.containing(
            NSPredicate(format: "label CONTAINS[c] 'No members found' OR label CONTAINS[c] 'No recent members'")
        ).firstMatch
        // Member rows carry their own accessible name; never match a generic button.
        let memberRow = app.buttons.matching(
            NSPredicate(format: "label BEGINSWITH 'Open conversation with '")
        ).firstMatch
        let stillLoading = app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'Loading members'")).firstMatch
        try require(
            waitUntil(timeout: 20, { (noMembersNotice.exists || memberRow.exists) && !stillLoading.exists }),
            "Member search must settle on a named member row or an explicit no-results notice",
            app,
            noMembersNotice,
            memberRow,
            stillLoading
        )
        journeyCapture(app, "31-messages-member-search")

        try require(close.waitForExistence(timeout: 10), "Member search must offer a close control", app, close)
        try tapWhenReady(app, close, name: "Close member search")
        try require(waitUntil(timeout: 15, { !search.exists }), "Member search must dismiss without sending", app)
        journeyCapture(app, "32-messages-search-dismissed")
    }

    /// Learn: chapter -> lesson player -> back to the lesson list.
    func testJourneyLearnChapterAndLesson() throws {
        let app = try signedInApp()
        let learn = app.buttons["Learn"].firstMatch
        try require(learn.waitForExistence(timeout: 25), "Bottom navigation must offer Learn", app, learn)
        try tapWhenReady(app, learn, name: "Learn")

        let chapter = app.buttons.containing(
            NSPredicate(format: "label BEGINSWITH 'Start ' OR label BEGINSWITH 'Continue ' OR label BEGINSWITH 'Review '")
        ).firstMatch
        try require(chapter.waitForExistence(timeout: 30), "Learn must list at least one openable chapter", app, chapter)
        journeyCapture(app, "40-learn-chapters")
        // Chapter cards sit low in the scrolling list and can fall under the
        // bottom navigation, so scroll the web content until the card is
        // actually hittable before tapping it.
        try tapWhenReady(app, chapter, name: "Chapter card")

        let allCourses = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'All courses'")).firstMatch
        try require(allCourses.waitForExistence(timeout: 25), "Chapter curriculum must open", app, allCourses)
        journeyCapture(app, "41-learn-curriculum")

        // Lesson rows are numbered 01, 02, ... or show a Completed check.
        // A chapter with no lesson row is a real failure, never a skip.
        let lesson = app.buttons.containing(
            NSPredicate(format: "label MATCHES '^0[0-9].*' OR label CONTAINS[c] 'Completed'")
        ).firstMatch
        try require(lesson.waitForExistence(timeout: 20), "Chapter must list at least one lesson row", app, lesson)
        try tapWhenReady(app, lesson, name: "Lesson row")

        let backToLessons = app.buttons["Back to lessons"].firstMatch
        try require(backToLessons.waitForExistence(timeout: 25), "Lesson player must open with a back control", app, backToLessons)
        let markComplete = app.buttons["Mark Complete"].firstMatch
        let nextLesson = app.buttons["Next Lesson"].firstMatch
        let finishCourse = app.buttons["Finish Course"].firstMatch
        let forwardControl = nextLesson.exists ? nextLesson : finishCourse
        let mobileNavigation = bottommostButton(app, label: "Learn")
        let usableBottom = mobileNavigation?.frame.minY ?? app.frame.maxY
        try require(
            scrollIntoView(app, forwardControl)
                && elementsWhollyVisible(app, below: app.frame.minY, above: usableBottom, [forwardControl]),
            "Lesson footer controls must be wholly visible above mobile navigation",
            app,
            markComplete,
            forwardControl
        )
        journeyCapture(app, "42-learn-lesson-player")
        try tapWhenReady(app, backToLessons, name: "Back to lessons")
        try require(waitUntil(timeout: 20, { allCourses.exists }), "Back must return to the lesson list", app)
        journeyCapture(app, "43-learn-back-to-curriculum")
    }

    /// Settings: every visible section opens; profile social fields are present.
    /// Nothing is saved.
    func testJourneySettingsSectionsReadOnly() throws {
        let app = try signedInApp()
        try openFromMenu(app, label: "Settings")

        // The section switcher is a WebKit combobox: depending on the iOS
        // version it surfaces as a button, a pop-up button, an other element or
        // a combo box. Never assume one type.
        let picker = labelledElement(app, label: "Settings page")
        let profileHeading = labelledElement(app, label: "My profile")
        try require(
            waitUntil(timeout: 25, { picker.exists || profileHeading.exists }),
            "Settings must load its section navigation (accessible 'Settings page' switcher or the My profile panel)",
            app,
            picker,
            profileHeading
        )
        journeyCapture(app, "50-settings-profile")

        // Profile identity + social fields (read only, never saved).
        let socialLinks = labelledElement(app, label: "Social links")
        try require(scrollIntoView(app, socialLinks), "Profile must show Social links", app, socialLinks)
        for field in ["Instagram", "YouTube"] {
            let element = labelledElement(app, label: field)
            try require(scrollIntoView(app, element), "Profile must expose the \(field) field", app, element)
        }
        journeyCapture(app, "51-settings-profile-socials")

        let sections = ["Account", "Password & security", "Notifications", "Trading preferences", "Privacy & data", "Help & support"]
        for (index, section) in sections.enumerated() {
            let heading = try openSettingsSection(app, named: section, picker: picker)
            try require(heading, "Settings section '\(section)' must open and show its own heading", app, picker)
            journeyCapture(app, "52-settings-\(index)-\(section)")
        }

        // Back out through the app's own control, not a swipe.
        let back = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] 'Back to Vault'")).firstMatch
        if back.exists {
            try tapWhenReady(app, back, name: "Back to Vault")
        } else {
            let home = app.buttons["Home"].firstMatch
            try require(home.waitForExistence(timeout: 10), "Settings must offer a way back", app, home)
            try tapWhenReady(app, home, name: "Home")
        }
        try require(waitUntil(timeout: 20, { app.buttons["Menu"].firstMatch.exists }), "Settings must exit cleanly", app)
        journeyCapture(app, "53-settings-exit")
    }

    /// Coach drawer and the 1:1 support page: open, read, close.
    func testJourneyCoachAndSupportPanels() throws {
        let app = try signedInApp()
        try openFromMenu(app, label: "Ask Coach")
        try require(
            waitUntil(timeout: 25, { app.staticTexts["Vault AI"].firstMatch.exists || app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] 'mentor'")).firstMatch.exists }),
            "Ask Coach must open a coach panel",
            app
        )
        journeyCapture(app, "60-coach-open")

        // Switching between the AI and human coach tabs is read-only.
        let humanTab = app.buttons.containing(NSPredicate(format: "label BEGINSWITH 'Coach'")).firstMatch
        if humanTab.exists && humanTab.isHittable {
            humanTab.tap()
            journeyCapture(app, "61-coach-human-tab")
        }

        let close = app.buttons["Close coach"].firstMatch
        try require(close.waitForExistence(timeout: 15), "Coach panel must offer a close control", app, close)
        try require(
            elementsWhollyVisible(app, close),
            "Coach close control must sit wholly below the native status area",
            app,
            close
        )
        try tapWhenReady(app, close, name: "Close coach")
        try require(waitUntil(timeout: 15, { !close.exists }), "Coach panel must close", app)
        journeyCapture(app, "62-coach-closed")

        try openFromMenu(app, label: "Schedule 1:1")
        let supportBody = app.descendants(matching: .any).containing(
            NSPredicate(format: "label CONTAINS[c] '1:1' OR label CONTAINS[c] 'session' OR label CONTAINS[c] 'coach'")
        ).firstMatch
        try require(
            waitUntil(timeout: 25, { supportBody.exists && app.buttons["Menu"].firstMatch.exists }),
            "Support page must render its own 1:1 content",
            app,
            supportBody
        )
        journeyCapture(app, "63-support-page")
        let home = app.buttons["Home"].firstMatch
        try require(home.waitForExistence(timeout: 10), "Support page must offer Home", app, home)
        try tapWhenReady(app, home, name: "Home")
        try require(waitUntil(timeout: 20, { app.buttons["Menu"].firstMatch.exists }), "Returning home must restore navigation", app)
    }

    // MARK: - Helpers (adaptive waits only, no blanket sleeps)

    /// Accessible marker the room renders once loading has finished:
    /// "Chat feed ready" or "Chat feed empty". Nil while still skeletonised.
    private func feedStateLabel(_ app: XCUIApplication) -> String? {
        let predicate = NSPredicate(format: "label == 'Chat feed ready' OR label == 'Chat feed empty'")
        for query in [app.staticTexts, app.otherElements] {
            let match = query.matching(predicate).firstMatch
            if match.exists { return match.label }
        }
        return nil
    }

    private func feedErrorVisible(_ app: XCUIApplication) -> Bool {
        app.descendants(matching: .any).containing(
            NSPredicate(format: "label CONTAINS[c] 'Chat feed error' OR label CONTAINS[c] 'Messages couldn'")
        ).firstMatch.exists
    }

    private func feedSkeletonVisible(_ app: XCUIApplication) -> Bool {
        app.descendants(matching: .any).matching(
            NSPredicate(format: "label == 'Loading messages'")
        ).firstMatch.exists
    }

    /// Passes only when the room reports a real result. A load error, or a
    /// skeleton that never resolves inside the timeout, is a hard failure.
    private func requireFeedSettled(
        _ app: XCUIApplication,
        context: String,
        timeout: TimeInterval = 30,
        file: StaticString = #filePath,
        line: UInt = #line
    ) throws {
        let settled = waitUntil(timeout: timeout, {
            self.feedErrorVisible(app) || (self.feedStateLabel(app) != nil && !self.feedSkeletonVisible(app))
        })
        try require(
            settled && !feedErrorVisible(app),
            feedErrorVisible(app)
                ? "\(context) reported a message load error"
                : "\(context) never left the loading skeleton (no 'Chat feed ready'/'Chat feed empty' result)",
            app,
            file: file,
            line: line
        )
    }

    private func waitUntil(timeout: TimeInterval, _ condition: () -> Bool) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if condition() { return true }
            RunLoop.current.run(until: Date().addingTimeInterval(0.25))
        }
        return condition()
    }

    private func journeyCapture(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    /// Hittability is insufficient when WebKit reports a partly clipped control.
    /// Compare the complete frame with the usable app window instead.
    private func elementsWhollyVisible(_ app: XCUIApplication, _ elements: XCUIElement...) -> Bool {
        elementsWhollyVisible(app, below: nativeUsableTop(app), above: app.frame.maxY, elements)
    }

    /// Top of the area the app may actually draw controls in: below the native
    /// status bar / notch when the system exposes it, otherwise the app frame.
    private func nativeUsableTop(_ app: XCUIApplication) -> CGFloat {
        let statusBar = XCUIApplication(bundleIdentifier: "com.apple.springboard").statusBars.firstMatch
        if statusBar.exists, !statusBar.frame.isEmpty {
            return max(app.frame.minY, statusBar.frame.maxY)
        }
        let inAppStatusBar = app.statusBars.firstMatch
        if inAppStatusBar.exists, !inAppStatusBar.frame.isEmpty {
            return max(app.frame.minY, inAppStatusBar.frame.maxY)
        }
        return app.frame.minY
    }

    private func elementsWhollyVisible(
        _ app: XCUIApplication,
        below usableTop: CGFloat,
        above usableBottom: CGFloat,
        _ elements: [XCUIElement]
    ) -> Bool {
        let bounds = CGRect(
            x: app.frame.minX,
            y: usableTop,
            width: app.frame.width,
            height: max(0, usableBottom - usableTop)
        )
        return elements.allSatisfy { element in
            guard element.exists, !element.frame.isEmpty else { return false }
            let intersection = bounds.intersection(element.frame)
            return !intersection.isNull
                && abs(intersection.width - element.frame.width) < 1
                && abs(intersection.height - element.frame.height) < 1
        }
    }

    /// Fails with a screenshot plus the element/app debugDescription so a real
    /// layout problem can be told apart from a wrong selector.
    private func require(
        _ condition: Bool,
        _ message: String,
        _ app: XCUIApplication,
        _ elements: XCUIElement...,
        file: StaticString = #filePath,
        line: UInt = #line
    ) throws {
        if condition { return }
        journeyCapture(app, "FAIL-\(message.prefix(48))")
        var dump = "FAILURE: \(message)\n"
        for element in elements {
            dump += "\n--- element ---\nexists=\(element.exists) hittable=\(element.exists ? String(element.isHittable) : "n/a") frame=\(element.exists ? String(describing: element.frame) : "n/a")\n\(element.debugDescription)\n"
        }
        dump += "\n--- app tree ---\n\(app.debugDescription)"
        let attachment = XCTAttachment(string: dump)
        attachment.name = "debug-\(message.prefix(48))"
        attachment.lifetime = .keepAlways
        add(attachment)
        XCTFail(message, file: file, line: line)
        throw JourneyFailure(message: message)
    }

    /// Finds an element by accessibility label across every XCUI type WebKit may
    /// use for it (button, link, pop-up button, combo box, static text, field).
    private func labelledElement(_ app: XCUIApplication, label: String) -> XCUIElement {
        let predicate = NSPredicate(format: "label == %@", label)
        let queries: [XCUIElementQuery] = [
            app.buttons, app.popUpButtons, app.comboBoxes, app.links,
            app.staticTexts, app.textFields, app.secureTextFields, app.otherElements
        ]
        for query in queries {
            let match = query.matching(predicate).firstMatch
            if match.exists { return match }
        }
        return app.descendants(matching: .any).matching(predicate).firstMatch
    }

    /// Scrolls the web content until the element is hittable. Bounded, adaptive,
    /// no blanket sleeps.
    @discardableResult
    private func scrollIntoView(_ app: XCUIApplication, _ element: XCUIElement, attempts: Int = 8) -> Bool {
        if !waitUntil(timeout: 10, { element.exists }) { return false }
        if element.isHittable { return true }
        let container = app.webViews.firstMatch.exists ? app.webViews.firstMatch
            : (app.scrollViews.firstMatch.exists ? app.scrollViews.firstMatch : app)
        for _ in 0..<attempts {
            if element.isHittable { return true }
            let frame = element.frame
            let window = app.frame
            if frame.midY > window.midY {
                container.swipeUp(velocity: .slow)
            } else {
                container.swipeDown(velocity: .slow)
            }
            _ = waitUntil(timeout: 1.5, { element.isHittable })
        }
        return element.isHittable
    }

    /// Scrolls the element into view and taps it; falls back to a coordinate tap
    /// on the element itself when WebKit still reports it as not hittable.
    private func tapWhenReady(
        _ app: XCUIApplication,
        _ element: XCUIElement,
        name: String,
        file: StaticString = #filePath,
        line: UInt = #line
    ) throws {
        if scrollIntoView(app, element) {
            element.tap()
            return
        }
        try require(element.exists, "\(name) must exist before tapping", app, element, file: file, line: line)
        journeyCapture(app, "not-hittable-\(name)")
        element.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
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
        try require(menu.waitForExistence(timeout: 25), "Navigation menu must be reachable", app, menu)
        try tapWhenReady(app, menu, name: "Menu")
        let item = app.descendants(matching: .any).matching(
            NSPredicate(format: "label == %@ AND (elementType == %d OR elementType == %d)", label, XCUIElement.ElementType.button.rawValue, XCUIElement.ElementType.link.rawValue)
        ).firstMatch
        try require(item.waitForExistence(timeout: 15), "Menu must contain '\(label)'", app, item)
        try tapWhenReady(app, item, name: "Menu item \(label)")
    }

    /// Opens a settings section via the desktop list or the mobile combobox and
    /// verifies the section's own heading is shown.
    private func openSettingsSection(_ app: XCUIApplication, named section: String, picker: XCUIElement) throws -> Bool {
        let direct = app.buttons[section].firstMatch
        if direct.exists && scrollIntoView(app, direct) {
            direct.tap()
            return waitUntil(timeout: 20, { self.sectionHeadingVisible(app, section) })
        }
        guard picker.exists else { return false }
        try tapWhenReady(app, picker, name: "Settings page switcher")
        let option = labelledElement(app, label: section)
        guard option.waitForExistence(timeout: 10) else {
            // Dismiss the switcher rather than leaving it open for the next step.
            app.tap()
            return false
        }
        try tapWhenReady(app, option, name: "Settings option \(section)")
        return waitUntil(timeout: 20, { self.sectionHeadingVisible(app, section) })
    }

    /// A section is open only when its own heading/panel label is on screen.
    private func sectionHeadingVisible(_ app: XCUIApplication, _ section: String) -> Bool {
        let predicate = NSPredicate(format: "label == %@", section)
        return app.staticTexts.matching(predicate).firstMatch.exists
            || app.otherElements.matching(predicate).firstMatch.exists
            || app.popUpButtons.matching(predicate).firstMatch.exists
            || app.comboBoxes.matching(predicate).firstMatch.exists
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
