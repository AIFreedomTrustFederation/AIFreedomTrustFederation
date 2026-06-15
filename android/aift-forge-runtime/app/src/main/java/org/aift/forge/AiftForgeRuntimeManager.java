package org.aift.forge;

import android.content.Context;

import java.net.HttpURLConnection;
import java.net.URL;

public final class AiftForgeRuntimeManager {
    private static final String FORGE_READY_URL = "http://127.0.0.1:4177/api/health";
    private static final String DASHBOARD_READY_URL = "http://127.0.0.1:3001/api/dashboard-ready";

    private AiftForgeRuntimeManager() {}

    public static void startRuntime(Context context) {
        AiftForgeTermuxBridge.start(context);
    }

    public static void waitForForge(Runnable onReady) {
        waitFor(FORGE_READY_URL, onReady);
    }

    public static void waitForDashboard(Runnable onReady) {
        waitFor(DASHBOARD_READY_URL, onReady);
    }

    private static void waitFor(String url, Runnable onReady) {
        Thread thread = new Thread(() -> {
            for (int i = 0; i < 90; i++) {
                if (isReady(url)) {
                    onReady.run();
                    return;
                }
                try {
                    Thread.sleep(2000);
                } catch (InterruptedException ignored) {
                    Thread.currentThread().interrupt();
                    return;
                }
            }
        });
        thread.setDaemon(true);
        thread.start();
    }

    private static boolean isReady(String url) {
        try {
            HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
            connection.setConnectTimeout(1200);
            connection.setReadTimeout(1200);
            int code = connection.getResponseCode();
            return code >= 200 && code < 300;
        } catch (Exception ignored) {
            return false;
        }
    }
}
