package com.vaulttradingacademy.vaultos;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.FirebaseApp;

/** Push is optional at runtime: absent Firebase configuration must not crash login. */
@CapacitorPlugin(name = "PushAvailability")
public class PushAvailabilityPlugin extends Plugin {
    @PluginMethod
    public void check(PluginCall call) {
        boolean configured = false;
        try {
            FirebaseApp.getInstance();
            configured = true;
        } catch (IllegalStateException missingConfiguration) {
            // google-services configuration has not initialized the default app.
        }
        JSObject result = new JSObject();
        result.put("configured", configured);
        call.resolve(result);
    }
}
