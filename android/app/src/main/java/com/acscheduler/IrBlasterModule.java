package com.acscheduler;

import android.content.Context;
import android.hardware.ConsumerIrManager;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableArray;

public class IrBlasterModule extends ReactContextBaseJavaModule {
    private final ConsumerIrManager irManager;

    public IrBlasterModule(ReactApplicationContext context) {
        super(context);
        irManager = (ConsumerIrManager) context.getSystemService(Context.CONSUMER_IR_SERVICE);
    }

    @Override
    public String getName() {
        return "IrBlasterModule";
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    public boolean hasIrEmitter() {
        return irManager != null && irManager.hasIrEmitter();
    }

    @ReactMethod
    public void sendCommand(int frequency, ReadableArray pattern, Promise promise) {
        try {
            if (irManager == null || !irManager.hasIrEmitter()) {
                promise.reject("IR_NOT_SUPPORTED", "IR blaster not available on this device");
                return;
            }
            int[] pulses = new int[pattern.size()];
            for (int i = 0; i < pattern.size(); i++) {
                pulses[i] = pattern.getInt(i);
            }
            irManager.transmit(frequency, pulses);
            promise.resolve(null);
        } catch (Exception e) {
            promise.reject("IR_ERROR", e.getMessage());
        }
    }
}
