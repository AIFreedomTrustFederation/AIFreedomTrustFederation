package org.aift.forge;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;

public class AiftForgeRuntimeService extends Service {
    private static final String CHANNEL_ID = "aift-forge-runtime";

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(this, CHANNEL_ID)
                : new Notification.Builder(this);
        Notification notification = builder
                .setContentTitle("AIFT Forge runtime")
                .setContentText("Preparing local Forge and node routes")
                .setSmallIcon(android.R.drawable.stat_sys_upload_done)
                .build();
        startForeground(1002, notification);
        AiftForgeRuntimeManager.startRuntime(this);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        AiftForgeRuntimeManager.startRuntime(this);
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "AIFT Forge Runtime", NotificationManager.IMPORTANCE_LOW);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }
}
