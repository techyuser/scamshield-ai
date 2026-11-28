package com.scamshield.ai;

import android.os.Bundle;
import android.view.View;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ScamShieldBridgePlugin.class);
        super.onCreate(savedInstanceState);
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().setVerticalScrollBarEnabled(false);
            getBridge().getWebView().setHorizontalScrollBarEnabled(false);
            getBridge().getWebView().setOverScrollMode(View.OVER_SCROLL_NEVER);
        }
    }
}
