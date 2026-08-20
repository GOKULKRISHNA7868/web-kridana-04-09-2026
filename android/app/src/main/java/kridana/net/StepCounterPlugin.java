package kridana.net;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.PowerManager;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.List;

@CapacitorPlugin(
        name = "StepCounter",
        permissions = {
                @Permission(
                        alias = "activityRecognition",
                        strings = { Manifest.permission.ACTIVITY_RECOGNITION }
                ),
                @Permission(
                        alias = "notifications",
                        strings = { Manifest.permission.POST_NOTIFICATIONS }
                )
        }
)
public class StepCounterPlugin extends Plugin implements SensorEventListener {

    private static final long MIN_STEP_GAP_MS = 280L;
    private static final float PEAK_THRESHOLD = 1.65f;
    private static final float VALLEY_THRESHOLD = 0.55f;

    private SensorManager sensorManager;
    private Sensor stepCounterSensor;
    private Sensor stepDetectorSensor;
    private Sensor linearAccelSensor;
    private Sensor accelerometerSensor;
    private PowerManager.WakeLock wakeLock;

    private float initialHardwareSteps = -1f;
    private int hardwareSteps = 0;
    private int motionSteps = 0;
    private boolean hardwareFired = false;
    private boolean isRunning = false;
    private String activeSensor = "none";

    private long lastMotionStepAt = 0L;
    private boolean peakArmed = false;
    private final float[] gravity = new float[3];
    private boolean gravityReady = false;

    @Override
    public void load() {
        super.load();
        discoverSensors();
    }

    private void discoverSensors() {
        Context context = getContext();
        if (context == null) return;

        sensorManager = (SensorManager) context.getSystemService(Context.SENSOR_SERVICE);
        if (sensorManager == null) return;

        stepCounterSensor = findSensor(Sensor.TYPE_STEP_COUNTER);
        stepDetectorSensor = findSensor(Sensor.TYPE_STEP_DETECTOR);
        linearAccelSensor = findSensor(Sensor.TYPE_LINEAR_ACCELERATION);
        accelerometerSensor = findSensor(Sensor.TYPE_ACCELEROMETER);
    }

    private Sensor findSensor(int type) {
        if (sensorManager == null) return null;
        Sensor preferred = sensorManager.getDefaultSensor(type);
        if (preferred != null) return preferred;
        List<Sensor> list = sensorManager.getSensorList(type);
        if (list == null || list.isEmpty()) return null;
        return list.get(0);
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        if (sensorManager == null) discoverSensors();
        JSObject result = permissionPayload();
        result.put("available", hasMotionHardware());
        result.put("sensor", bestSensorName());
        result.put("running", isRunning);
        call.resolve(result);
    }

    @PluginMethod
    @Override
    public void checkPermissions(PluginCall call) {
        if (sensorManager == null) discoverSensors();
        call.resolve(permissionPayload());
    }

    @PluginMethod
    @Override
    public void requestPermissions(PluginCall call) {
        if (sensorManager == null) discoverSensors();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
                && getPermissionState("activityRecognition") != PermissionState.GRANTED) {
            requestPermissionForAliases(
                    new String[]{"activityRecognition", "notifications"},
                    call,
                    "onPermissionResult"
            );
            return;
        }

        if (Build.VERSION.SDK_INT >= 33
                && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "onPermissionResult");
            return;
        }

        call.resolve(permissionPayload());
    }

    @PermissionCallback
    private void onPermissionResult(PluginCall call) {
        call.resolve(permissionPayload());
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (sensorManager == null) discoverSensors();

        if (sensorManager == null) {
            call.reject("NO_STEP_SENSOR");
            return;
        }

        if (!hasMotionHardware()) {
            call.reject("NO_STEP_SENSOR");
            return;
        }

        resetSession();

        if (isRunning) {
            emitSteps(displayedSteps(), false);
            call.resolve(statusObject());
            return;
        }

        boolean registered = registerAvailableSensors();
        if (!registered) {
            call.reject("NO_STEP_SENSOR");
            return;
        }

        isRunning = true;
        startForegroundTracking();
        acquireWakeLock();
        emitSteps(0, false);
        call.resolve(statusObject());
    }

    @PluginMethod
    public void stop(PluginCall call) {
        stopSensor();
        call.resolve();
    }

    private boolean registerAvailableSensors() {
        boolean any = false;
        boolean canUseHardwareSteps = hasActivityPermission() || Build.VERSION.SDK_INT < Build.VERSION_CODES.Q;

        if (canUseHardwareSteps && stepCounterSensor != null) {
            if (register(stepCounterSensor, SensorManager.SENSOR_DELAY_NORMAL)) {
                any = true;
                activeSensor = "step_counter";
            }
        }

        if (canUseHardwareSteps && !any && stepDetectorSensor != null) {
            if (register(stepDetectorSensor, SensorManager.SENSOR_DELAY_NORMAL)) {
                any = true;
                activeSensor = "step_detector";
            }
        }

        Sensor motion = linearAccelSensor != null ? linearAccelSensor : accelerometerSensor;
        if (motion != null) {
            if (register(motion, SensorManager.SENSOR_DELAY_GAME)) {
                any = true;
                if ("none".equals(activeSensor) || activeSensor.isEmpty()) {
                    activeSensor = sensorTypeName(motion);
                }
            }
        }

        return any;
    }

    private boolean register(Sensor sensor, int delay) {
        try {
            return sensorManager.registerListener(this, sensor, delay);
        } catch (Exception ignored) {
            return false;
        }
    }

    private boolean hasMotionHardware() {
        return stepCounterSensor != null
                || stepDetectorSensor != null
                || linearAccelSensor != null
                || accelerometerSensor != null;
    }

    private String bestSensorName() {
        if (isRunning && activeSensor != null && !"none".equals(activeSensor)) {
            return activeSensor;
        }
        if (stepCounterSensor != null && hasActivityPermission()) return "step_counter";
        if (stepDetectorSensor != null && hasActivityPermission()) return "step_detector";
        if (linearAccelSensor != null) return "linear_acceleration";
        if (accelerometerSensor != null) return "accelerometer";
        return "none";
    }

    private String sensorTypeName(Sensor sensor) {
        if (sensor == null) return "none";
        int type = sensor.getType();
        if (type == Sensor.TYPE_STEP_COUNTER) return "step_counter";
        if (type == Sensor.TYPE_STEP_DETECTOR) return "step_detector";
        if (type == Sensor.TYPE_LINEAR_ACCELERATION) return "linear_acceleration";
        if (type == Sensor.TYPE_ACCELEROMETER) return "accelerometer";
        return "motion";
    }

    private void resetSession() {
        initialHardwareSteps = -1f;
        hardwareSteps = 0;
        motionSteps = 0;
        hardwareFired = false;
        lastMotionStepAt = 0L;
        peakArmed = false;
        gravity[0] = 0f;
        gravity[1] = 0f;
        gravity[2] = 0f;
        gravityReady = false;
        activeSensor = "none";
    }

    private int displayedSteps() {
        if (hardwareFired && hardwareSteps > 0) return hardwareSteps;
        return Math.max(hardwareSteps, motionSteps);
    }

    private void stopSensor() {
        if (sensorManager != null && isRunning) {
            try {
                sensorManager.unregisterListener(this);
            } catch (Exception ignored) {
            }
        }

        isRunning = false;
        activeSensor = "none";
        resetSession();
        releaseWakeLock();
        stopForegroundTracking();
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (!isRunning || event == null || event.sensor == null || event.values == null) {
            return;
        }

        int type = event.sensor.getType();

        if (type == Sensor.TYPE_STEP_COUNTER && event.values.length > 0) {
            handleStepCounter(event.values[0]);
            return;
        }

        if (type == Sensor.TYPE_STEP_DETECTOR) {
            hardwareFired = true;
            hardwareSteps += 1;
            activeSensor = "step_detector";
            emitSteps(displayedSteps(), true);
            return;
        }

        if ((type == Sensor.TYPE_LINEAR_ACCELERATION || type == Sensor.TYPE_ACCELEROMETER)
                && event.values.length >= 3) {
            handleMotion(type, event.values[0], event.values[1], event.values[2]);
        }
    }

    private void handleStepCounter(float totalSteps) {
        if (initialHardwareSteps < 0) {
            initialHardwareSteps = totalSteps;
            emitSteps(displayedSteps(), false);
            return;
        }

        int next = Math.max(0, Math.round(totalSteps - initialHardwareSteps));
        if (next == hardwareSteps) return;

        hardwareFired = true;
        boolean moved = next > hardwareSteps;
        hardwareSteps = next;
        activeSensor = "step_counter";
        emitSteps(displayedSteps(), moved);
    }

    private void handleMotion(int type, float x, float y, float z) {
        float magnitude;

        if (type == Sensor.TYPE_LINEAR_ACCELERATION) {
            magnitude = (float) Math.sqrt(x * x + y * y + z * z);
        } else {
            if (!gravityReady) {
                gravity[0] = x;
                gravity[1] = y;
                gravity[2] = z;
                gravityReady = true;
            } else {
                final float alpha = 0.8f;
                gravity[0] = alpha * gravity[0] + (1f - alpha) * x;
                gravity[1] = alpha * gravity[1] + (1f - alpha) * y;
                gravity[2] = alpha * gravity[2] + (1f - alpha) * z;
            }
            float lx = x - gravity[0];
            float ly = y - gravity[1];
            float lz = z - gravity[2];
            magnitude = (float) Math.sqrt(lx * lx + ly * ly + lz * lz);
        }

        long now = System.currentTimeMillis();

        if (!peakArmed && magnitude >= PEAK_THRESHOLD) {
            peakArmed = true;
            return;
        }

        if (peakArmed && magnitude <= VALLEY_THRESHOLD) {
            peakArmed = false;
            if (now - lastMotionStepAt >= MIN_STEP_GAP_MS) {
                lastMotionStepAt = now;
                motionSteps += 1;
                if (!hardwareFired) {
                    activeSensor = type == Sensor.TYPE_LINEAR_ACCELERATION
                            ? "linear_acceleration"
                            : "accelerometer";
                }
                emitSteps(displayedSteps(), true);
            }
        }
    }

    private void emitSteps(int steps, boolean moving) {
        JSObject data = new JSObject();
        data.put("steps", Math.max(0, steps));
        data.put("moving", moving);
        data.put("sensor", activeSensor);
        notifyListeners("stepChanged", data);
    }

    private void startForegroundTracking() {
        try {
            Intent intent = new Intent(getContext(), WalkForegroundService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(intent);
            } else {
                getContext().startService(intent);
            }
        } catch (Exception ignored) {
        }
    }

    private void stopForegroundTracking() {
        try {
            getContext().stopService(new Intent(getContext(), WalkForegroundService.class));
        } catch (Exception ignored) {
        }
    }

    private void acquireWakeLock() {
        try {
            PowerManager powerManager = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            if (powerManager == null) return;
            wakeLock = powerManager.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK,
                    "kridana:walk"
            );
            wakeLock.setReferenceCounted(false);
            wakeLock.acquire(2 * 60 * 60 * 1000L);
        } catch (Exception ignored) {
        }
    }

    private void releaseWakeLock() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
        } catch (Exception ignored) {
        } finally {
            wakeLock = null;
        }
    }

    private boolean hasActivityPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return true;
        try {
            return ContextCompat.checkSelfPermission(
                    getContext(),
                    Manifest.permission.ACTIVITY_RECOGNITION
            ) == PackageManager.PERMISSION_GRANTED;
        } catch (Exception ignored) {
            return false;
        }
    }

    private JSObject permissionPayload() {
        JSObject result = new JSObject();
        String activity = hasActivityPermission() ? "granted" : "denied";
        String notifications = "granted";

        if (Build.VERSION.SDK_INT >= 33) {
            notifications = getPermissionState("notifications") == PermissionState.GRANTED
                    ? "granted"
                    : "denied";
        }

        result.put("activityRecognition", activity);
        result.put("notifications", notifications);
        result.put("available", hasMotionHardware());
        result.put("sensor", bestSensorName());
        return result;
    }

    private JSObject statusObject() {
        JSObject result = permissionPayload();
        result.put("running", isRunning);
        result.put("sensor", activeSensor.equals("none") ? bestSensorName() : activeSensor);
        result.put("available", true);
        return result;
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
    }

    @Override
    protected void handleOnDestroy() {
        stopSensor();
        super.handleOnDestroy();
    }
}
