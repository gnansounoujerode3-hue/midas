package bj.midas.wallet

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.bluetooth.BluetoothStatusCodes
import android.bluetooth.le.BluetoothLeScanner
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.ParcelUuid
import android.provider.Settings
import android.webkit.JavascriptInterface
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

/** Android natif : biométrie, scan BLE et connexion réelle AMIS Watch5GTR. */
class MainActivity : FragmentActivity() {
    private lateinit var webView: WebView
    private val handler = Handler(Looper.getMainLooper())
    private val bluetoothManager by lazy { getSystemService(BluetoothManager::class.java) }
    private val locationManager by lazy { getSystemService(LocationManager::class.java) }
    private var scanner: BluetoothLeScanner? = null
    private var discoveredWatch: BluetoothDevice? = null
    private var gatt: BluetoothGatt? = null
    private var pendingBleAction: (() -> Unit)? = null

    private val amisName = "Amis Watch5GTR"
    private val advertisedAmisService = ParcelUuid.fromString("00000217-0000-1000-8000-00805f9b34fb")
    private val notifyCharacteristics = setOf(
        "6e40ab03-b5a3-f393-e0a9-e50e24dcca9e",
        "0000a202-0000-1000-8000-00805f9b34fb",
        "0000fea1-0000-1000-8000-00805f9b34fb",
        "00004a02-0000-1000-8000-00805f9b34fb",
        "c551c36a-0377-4a29-9657-74ffb655a188"
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestBiometricUnlock()
    }

    private fun requestBiometricUnlock() {
        val authenticators = BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.DEVICE_CREDENTIAL
        if (BiometricManager.from(this).canAuthenticate(authenticators) != BiometricManager.BIOMETRIC_SUCCESS) {
            loadPortfolio()
            return
        }
        BiometricPrompt(this, ContextCompat.getMainExecutor(this), object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) = loadPortfolio()
            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) = finish()
        }).authenticate(
            BiometricPrompt.PromptInfo.Builder()
                .setTitle("MIDAS-Bénin")
                .setSubtitle("Déverrouillez votre portefeuille citoyen")
                .setAllowedAuthenticators(authenticators)
                .build()
        )
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun loadPortfolio() {
        webView = WebView(this).apply {
            setBackgroundColor(Color.rgb(248, 250, 252))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.useWideViewPort = false
            settings.loadWithOverviewMode = false
            settings.textZoom = 100
            settings.cacheMode = WebSettings.LOAD_DEFAULT
            settings.allowFileAccess = true
            settings.allowContentAccess = false
            addJavascriptInterface(MidasNativeBridge(), "AndroidMIDAS")
            webViewClient = object : WebViewClient() {}
            loadUrl("file:///android_asset/midas/index.html")
        }
        setContentView(webView)
    }

    inner class MidasNativeBridge {
        // Ces méthodes sont appelées par le JavaScript de la WebView.
        @Suppress("unused") @JavascriptInterface fun scanAmisWatch() = runOnUiThread { withBlePermission { startWatchScan() } }
        @Suppress("unused") @JavascriptInterface fun connectAmisWatch() = runOnUiThread { withBlePermission { connectToWatch() } }
        @Suppress("unused") @JavascriptInterface fun disconnectAmisWatch() = runOnUiThread { withBlePermission { disconnectWatch() } }
        @Suppress("unused") @JavascriptInterface fun requestHeartRate() = runOnUiThread { withBlePermission { sendRdfitCommand("heart_rate", RdfitProtocol.heartRateRequest) } }
        @Suppress("unused") @JavascriptInterface fun requestSpo2() = runOnUiThread { withBlePermission { sendRdfitCommand("spo2", RdfitProtocol.spo2Request) } }
        @Suppress("unused") @JavascriptInterface fun requestBloodPressure() = runOnUiThread { withBlePermission { sendRdfitCommand("blood_pressure", RdfitProtocol.bloodPressureRequest) } }
        @Suppress("unused") @JavascriptInterface fun findAmisWatch() = runOnUiThread { withBlePermission { sendRdfitCommand("find_watch", RdfitProtocol.findWatchRequest) } }
        @Suppress("unused") @JavascriptInterface fun getBackendBaseUrl(): String = BuildConfig.BACKEND_URL
    }

    private val blePermissions = arrayOf(
        Manifest.permission.BLUETOOTH_SCAN,
        Manifest.permission.BLUETOOTH_CONNECT,
        Manifest.permission.ACCESS_FINE_LOCATION
    )

    private fun hasBlePermissions(): Boolean = blePermissions.all {
        ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED
    }

    private fun withBlePermission(action: () -> Unit) {
        if (hasBlePermissions()) action()
        else {
            pendingBleAction = action
            requestPermissions(blePermissions, 410)
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, results: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, results)
        if (requestCode == 410) {
            if (results.isNotEmpty() && results.all { it == PackageManager.PERMISSION_GRANTED }) pendingBleAction?.invoke()
            else emit("ble_error", JSONObject().put("message", "Permission Bluetooth refusée."))
            pendingBleAction = null
        }
    }

    private fun startWatchScan() {
        if (!hasBlePermissions()) { withBlePermission { startWatchScan() }; return }
        // Compatibilité Android/OEM : certaines implémentations BLE n'exposent
        // les annonces que lorsque le service de localisation est activé.
        if (!locationManager.isLocationEnabled) {
            emit("ble_error", JSONObject().put("message", "Activez la localisation du téléphone pour rechercher la montre BLE."))
            startActivity(Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS))
            return
        }
        val adapter = bluetoothManager.adapter
        if (adapter == null || !adapter.isEnabled) {
            emit("ble_error", JSONObject().put("message", "Activez le Bluetooth du téléphone.")); return
        }
        scanner = adapter.bluetoothLeScanner
        if (scanner == null) { emit("ble_error", JSONObject().put("message", "BLE indisponible sur ce téléphone.")); return }
        scanner?.stopScan(scanCallback)
        discoveredWatch = null
        scanner?.startScan(scanCallback)
        emit("ble_scanning", JSONObject().put("message", "Recherche de la montre AMIS…"))
        handler.postDelayed({
            scanner?.stopScan(scanCallback)
            if (discoveredWatch == null) {
                emit("ble_not_found", JSONObject().put("message", "AMIS Watch5GTR non détectée. Fermez RDFit, rapprochez la montre et relancez la recherche."))
            }
        }, 12_000)
    }

    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            if (!hasBlePermissions()) return
            val advertisedName = result.scanRecord?.deviceName.orEmpty()
            val deviceName = result.device.name.orEmpty()
            val advertisedServices = result.scanRecord?.serviceUuids.orEmpty()
            // La montre AMIS peut annoncer le nom complet, un nom tronqué, ou seulement 0x0217.
            val isAmisWatch = deviceName.contains("amis", true) ||
                advertisedName.contains("amis", true) ||
                advertisedServices.contains(advertisedAmisService)
            if (isAmisWatch) {
                discoveredWatch = result.device
                scanner?.stopScan(this)
                emit("ble_watch_found", JSONObject()
                    .put("name", if (advertisedName.isNotBlank()) advertisedName else if (deviceName.isNotBlank()) deviceName else amisName)
                    .put("address", result.device.address)
                    .put("rssi", result.rssi)
                    .put("message", "Montre AMIS détectée — appuyez sur Connecter."))
            }
        }
        override fun onScanFailed(errorCode: Int) = emit("ble_error", JSONObject().put("message", "Échec du scan BLE : $errorCode"))
    }

    private fun connectToWatch() {
        if (!hasBlePermissions()) { withBlePermission { connectToWatch() }; return }
        val device = discoveredWatch
        if (device == null) { startWatchScan(); return }
        gatt?.close()
        emit("ble_connecting", JSONObject().put("name", amisName).put("address", device.address))
        gatt = device.connectGatt(this, false, gattCallback, BluetoothDevice.TRANSPORT_LE)
    }

    private val gattCallback = object : BluetoothGattCallback() {
        override fun onConnectionStateChange(connection: BluetoothGatt, status: Int, newState: Int) {
            if (!hasBlePermissions()) { connection.close(); return }
            if (newState == BluetoothProfile.STATE_CONNECTED) {
                emit("ble_connected", JSONObject().put("name", amisName).put("address", connection.device.address))
                connection.discoverServices()
            } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                val reason = if (status == BluetoothGatt.GATT_SUCCESS) "La montre a fermé la connexion." else "Connexion GATT refusée ou interrompue (code $status)."
                emit("ble_disconnected", JSONObject().put("status", status).put("message", reason))
                connection.close()
            }
        }

        override fun onServicesDiscovered(connection: BluetoothGatt, status: Int) {
            if (!hasBlePermissions()) { connection.close(); return }
            if (status != BluetoothGatt.GATT_SUCCESS) { emit("ble_error", JSONObject().put("message", "Découverte GATT échouée : $status")); return }
            val services = JSONArray()
            connection.services.forEach { service ->
                services.put(service.uuid.toString())
                service.characteristics.forEach { characteristic ->
                    if (characteristic.uuid.toString().lowercase() in notifyCharacteristics) subscribe(connection, characteristic)
                }
            }
            emit("ble_services", JSONObject().put("services", services).put("message", "Services GATT découverts ; notifications activées."))
        }

        @Suppress("DEPRECATION")
        @Deprecated("Android API 33 provides the value directly; this overload supports Android 12.")
        override fun onCharacteristicChanged(connection: BluetoothGatt, characteristic: BluetoothGattCharacteristic) {
            emitMeasurementPacket(characteristic.uuid.toString(), characteristic.value ?: byteArrayOf())
        }

        override fun onCharacteristicChanged(connection: BluetoothGatt, characteristic: BluetoothGattCharacteristic, value: ByteArray) {
            emitMeasurementPacket(characteristic.uuid.toString(), value)
        }
    }

    private fun sendRdfitCommand(action: String, payload: ByteArray) {
        if (!hasBlePermissions()) { emit("ble_error", JSONObject().put("message", "Permission Bluetooth indisponible.")); return }
        val connection = gatt
        if (connection == null) { emit("ble_error", JSONObject().put("message", "Connectez d’abord la montre AMIS.")); return }
        val characteristic = connection.services
            .flatMap { it.characteristics }
            .firstOrNull { it.uuid.toString().equals(RdfitProtocol.WRITE_UUID, true) }
        if (characteristic == null) { emit("ble_error", JSONObject().put("message", "Canal RDFit d’écriture introuvable.")); return }
        val written = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            connection.writeCharacteristic(characteristic, payload, BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE) == BluetoothStatusCodes.SUCCESS
        } else writeCharacteristicLegacy(connection, characteristic, payload)
        if (written) emit("ble_command_sent", JSONObject().put("action", action).put("message", "Commande RDFit envoyée : $action"))
        else emit("ble_error", JSONObject().put("message", "Échec de l’envoi de la commande $action."))
    }

    @Suppress("DEPRECATION")
    private fun writeCharacteristicLegacy(connection: BluetoothGatt, characteristic: BluetoothGattCharacteristic, payload: ByteArray): Boolean {
        characteristic.writeType = BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE
        characteristic.value = payload
        return connection.writeCharacteristic(characteristic)
    }

    private fun subscribe(connection: BluetoothGatt, characteristic: BluetoothGattCharacteristic) {
        if (!hasBlePermissions()) return
        connection.setCharacteristicNotification(characteristic, true)
        val descriptor = characteristic.getDescriptor(UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")) ?: return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            connection.writeDescriptor(descriptor, BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE)
        } else {
            writeDescriptorLegacy(connection, descriptor)
        }
    }

    @Suppress("DEPRECATION")
    private fun writeDescriptorLegacy(connection: BluetoothGatt, descriptor: BluetoothGattDescriptor) {
        descriptor.value = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
        connection.writeDescriptor(descriptor)
    }

    private fun emitMeasurementPacket(uuid: String, bytes: ByteArray) {
        val hex = bytes.joinToString("") { "%02X".format(it) }
        emit("ble_packet", JSONObject()
            .put("uuid", uuid)
            .put("hex", hex)
            .put("timestamp", System.currentTimeMillis())
            .put("message", "Paquet BLE AMIS reçu"))
        RdfitProtocol.decode(bytes)?.let { measurement ->
            emit("ble_measurement", JSONObject()
                .put("type", measurement.type)
                .put("label", measurement.label)
                .put("value", measurement.value)
                .put("unit", measurement.unit)
                .put("timestamp", System.currentTimeMillis()))
        }
    }

    private fun disconnectWatch() {
        if (!hasBlePermissions()) { emit("ble_error", JSONObject().put("message", "Permission Bluetooth indisponible.")); return }
        gatt?.disconnect()
        gatt?.close()
        gatt = null
        emit("ble_disconnected", JSONObject().put("message", "Montre déconnectée"))
    }

    private fun emit(type: String, payload: JSONObject) {
        if (!::webView.isInitialized) return
        val event = JSONObject().put("type", type).put("payload", payload).toString()
        runOnUiThread { webView.evaluateJavascript("window.dispatchEvent(new CustomEvent('midas:ble', { detail: $event }));", null) }
    }

    override fun onDestroy() {
        if (hasBlePermissions()) {
            scanner?.stopScan(scanCallback)
            gatt?.close()
        }
        if (::webView.isInitialized) webView.destroy()
        super.onDestroy()
    }
}
