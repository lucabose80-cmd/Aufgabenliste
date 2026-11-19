package de.lucabose.aufgabenliste;

import android.graphics.Color;
import android.os.Bundle;
import android.view.Window;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeWidgetsPlugin.class);
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        if (window != null) {
            int darkBg = Color.parseColor("#131314");
            window.setStatusBarColor(darkBg);
            window.setNavigationBarColor(darkBg);
        }
    }
}
