package com.vaulttradingacademy.vaultos;

import static org.junit.Assert.assertTrue;

import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.Test;
import org.junit.runner.RunWith;

/** Read-only launch check: no login submission, purchases, or changes to member data. */
@RunWith(AndroidJUnit4.class)
public class VaultLaunchSmokeTest {
    @Test
    public void bundledWebAppReachesAnEntryOrMemberScreen() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(45);
            AtomicBoolean rendered = new AtomicBoolean(false);
            while (System.nanoTime() < deadline && !rendered.get()) {
                CountDownLatch evaluated = new CountDownLatch(1);
                scenario.onActivity(activity -> activity.getBridge().getWebView().evaluateJavascript(
                    "Boolean(document.body && document.body.classList.contains('native-capacitor') && " +
                    "(document.querySelector('a[href=\"/auth\"], input[name=\"email\"]') || " +
                    "Array.from(document.querySelectorAll('button')).some(b => b.textContent.trim() === 'Chat')))",
                    value -> { rendered.set("true".equals(value)); evaluated.countDown(); }
                ));
                assertTrue("WebView must respond to inspection", evaluated.await(5, TimeUnit.SECONDS));
                if (!rendered.get()) Thread.sleep(200);
            }
            assertTrue("Bundled app must render welcome, login, or member navigation within 45 seconds", rendered.get());
        }
    }
}
