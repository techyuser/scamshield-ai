package com.scamshield.ai;

import android.Manifest;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final Handler MAIN_HANDLER = new Handler(Looper.getMainLooper());
    private static Runnable pendingBarUpdate = null;

    public static void applySystemBarAppearance(android.app.Activity activity, String themeMode) {
        applySystemBarAppearance(activity, themeMode, false);
    }

    public static void applySystemBarAppearance(android.app.Activity activity, String themeMode, boolean animate) {
        if (activity == null || activity.getWindow() == null) return;
        boolean isLight;
        if ("light".equals(themeMode)) {
            isLight = true;
        } else if ("system".equals(themeMode)) {
            int nightMode = activity.getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
            isLight = nightMode != Configuration.UI_MODE_NIGHT_YES;
        } else {
            isLight = false;
        }

        if (pendingBarUpdate != null) {
            MAIN_HANDLER.removeCallbacks(pendingBarUpdate);
            pendingBarUpdate = null;
        }

        final Runnable applyTask = () -> {
            if (activity.isFinishing() || activity.isDestroyed() || activity.getWindow() == null) return;
            View decor = activity.getWindow().getDecorView();
            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(activity.getWindow(), decor);
            controller.setAppearanceLightStatusBars(isLight);
            controller.setAppearanceLightNavigationBars(isLight);
            int targetBg = isLight ? Color.parseColor("#F3F5FB") : Color.parseColor("#06070C");
            decor.setBackgroundColor(targetBg);
            activity.getWindow().setStatusBarColor(targetBg);
            activity.getWindow().setNavigationBarColor(targetBg);
        };

        if (animate) {
            // Single update at ~140ms (during the 420ms WebView crossfade) prevents per-frame WindowManager IPC stutters.
            pendingBarUpdate = applyTask;
            MAIN_HANDLER.postDelayed(applyTask, 140L);
        } else {
            applyTask.run();
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ScamShieldBridgePlugin.class);
        super.onCreate(savedInstanceState);
        SharedPreferences prefs = getSharedPreferences(ScamShieldNotificationService.PREFS_NAME, MODE_PRIVATE);
        if (!prefs.getBoolean("threshold_migrated_v26", false)) {
            SharedPreferences.Editor ed = prefs.edit().putBoolean("threshold_migrated_v26", true);
            if (prefs.getInt(ScamShieldNotificationService.KEY_ALERT_THRESHOLD, 26) == 51) {
                ed.putInt(ScamShieldNotificationService.KEY_ALERT_THRESHOLD, 26);
            }
            ed.apply();
        }
        String savedTheme = prefs.getString("app_theme", "dark");
        applySystemBarAppearance(this, savedTheme);

        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().post(() -> applySystemBarAppearance(this, prefs.getString("app_theme", "dark")));
            getBridge().getWebView().setVerticalScrollBarEnabled(false);
            getBridge().getWebView().setHorizontalScrollBarEnabled(false);
            getBridge().getWebView().setOverScrollMode(View.OVER_SCROLL_NEVER);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                        this,
                        new String[]{Manifest.permission.POST_NOTIFICATIONS},
                        1001
                );
            }
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        SharedPreferences prefs = getSharedPreferences(ScamShieldNotificationService.PREFS_NAME, MODE_PRIVATE);
        String savedTheme = prefs.getString("app_theme", "dark");
        applySystemBarAppearance(this, savedTheme);
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().post(() -> applySystemBarAppearance(this, prefs.getString("app_theme", "dark")));
        }
    }
}
