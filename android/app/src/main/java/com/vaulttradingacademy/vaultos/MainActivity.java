package com.vaulttradingacademy.vaultos;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(GooglePlayMembershipPlugin.class);
        registerPlugin(PushAvailabilityPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
