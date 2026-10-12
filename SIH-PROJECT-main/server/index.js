import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

import dotenv from 'dotenv';

// Load .env from root or parent directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_FILE = path.join(__dirname, 'sensor_data.json');
const ADMIN_CONFIG_FILE = path.join(__dirname, 'admin_config.json');

// Environment-backed credentials with safe fallbacks
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || "";
const ONESIGNAL_REST_API_KEY_DEFAULT = process.env.ONESIGNAL_REST_API_KEY || "";
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "";
const MAX_LOGS = 1000;

let adminConfig = {
  adminName: 'Plant Administrator',
  phoneNumber: '',
  accessCode: '', // Set when admin first configures
  alertEnabled: true,
  onesignalAppId: ONESIGNAL_APP_ID,
  onesignalRestApiKey: '' // Set from Admin Panel in the UI
};

// Function to fetch credentials from Supabase
async function loadFromSupabase() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/admin_credentials?select=*&order=created_at.desc&limit=1`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    if (response.ok) {
      const rows = await response.json();
      if (Array.isArray(rows) && rows.length > 0) {
        const latest = rows[0];
        adminConfig.adminName = latest.admin_name || adminConfig.adminName;
        adminConfig.phoneNumber = latest.phone_number || adminConfig.phoneNumber;
        adminConfig.accessCode = latest.access_code || adminConfig.accessCode;
        console.log(`[Supabase ⚡] Successfully synced credentials from table 'admin_credentials'! Admin: '${adminConfig.adminName}', Phone: '${adminConfig.phoneNumber}'`);
        saveAdminConfigToDisk();
      }
    }
  } catch (err) {
    console.warn('[Supabase Sync Warning] Table not created yet or network offline.', err.message);
  }
}

// Function to save credentials to Supabase
async function saveToSupabase(name, phone, code) {
  try {
    const payload = {
      admin_name: name,
      phone_number: phone,
      access_code: code,
      onesignal_app_id: ONESIGNAL_APP_ID
    };
    const response = await fetch(`${SUPABASE_URL}/rest/v1/admin_credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      console.log(`[Supabase ⚡] Saved new admin credentials row to 'admin_credentials' table!`);
    } else {
      console.warn(`[Supabase Warning] HTTP ${response.status} saving credentials.`);
    }
  } catch (err) {
    console.warn('[Supabase Error]', err.message);
  }
}

// Global Supabase telemetry state
let supabaseSensorTableExists = null;
let totalSupabaseSyncedRows = 0;
let lastPhysicalTelemetryTime = 0;

// Map device_id → human-readable machine name (matches mockData machines)
const MACHINE_NAME_MAP = {
  'ESP32-MCH-007': '5V DC Motor Fan (MCH-007)',
  'MCH-007':       '5V DC Motor Fan (MCH-007)',
  'MCH-001': 'CNC-MACHINE-01',
  'MCH-002': 'HYDRAULIC-PRESS-02',
  'MCH-003': 'AIR-COMPRESSOR-03',
  'MCH-004': 'INJECTION-MOLDING-04',
  'MCH-005': 'CONVEYOR-SYSTEM-05',
  'MCH-006': 'STAMPING-MILL-06',
  'MCH-008': 'INDUSTRIAL-OVEN-08',
  'MCH-009': 'HVAC-CHILLER-09',
  'MCH-010': 'HVAC-CHILLER-10',
};

function deriveMachineName(deviceId) {
  const key = String(deviceId).toUpperCase();
  for (const [k, v] of Object.entries(MACHINE_NAME_MAP)) {
    if (key.includes(k.toUpperCase())) return v;
  }
  return deviceId; // fallback: use device_id as name
}

// Function to push live telemetry reading to Supabase table 'sensor_logs'
// Values sent to Supabase match EXACTLY what is displayed in the Sensor Logs table on the website:
//   voltage  → Voltage (V)  — 1 decimal, same as voltageV column in UI
//   current  → Current (A)  — 2 decimals, same as currentAmps column in UI
//   power    → Power (W)    — 1 decimal, same as (powerKW * 1000) shown in the Power column
async function sendSensorLogToSupabase(log) {
  try {
    // --- Voltage (V): use voltageV if present, fallback to voltage ---
    const volt = Number(
      log.voltageV !== undefined ? log.voltageV : (log.voltage !== undefined ? log.voltage : 5.0)
    );

    // --- Current (A): use currentAmps if present, fallback to current ---
    const curr = Number(
      log.currentAmps !== undefined ? log.currentAmps : (log.current !== undefined ? log.current : 0.52)
    );

    // --- Power (W): use powerWatts first (always in W), then derive from powerKW, else compute ---
    // The UI shows: (log.powerKW * 1000).toFixed(1)  — so we store exactly that.
    let powerWatts;
    if (log.powerWatts !== undefined) {
      // Already stored in Watts by the HTTP and simulation paths
      powerWatts = Number(log.powerWatts);
    } else if (log.powerKW !== undefined) {
      // Convert kW → W (matches UI formula: powerKW * 1000)
      powerWatts = Number((log.powerKW * 1000).toFixed(1));
    } else {
      // Last resort: compute from V × I
      powerWatts = Number((volt * curr).toFixed(1));
    }

    const powerKW = Number((powerWatts / 1000).toFixed(6));

    // Build Supabase payload using the same precision as the UI columns
    const payload = {
      device_id:    String(log.device_id || 'ESP32-MCH-007'),
      machine_name: String(log.machine_name || deriveMachineName(log.device_id || 'ESP32-MCH-007')),
      voltage:      Number(volt.toFixed(1)),       // Voltage (V) — 1 decimal
      current:      Number(curr.toFixed(2)),       // Current (A) — 2 decimals
      power:        Number(powerWatts.toFixed(1)), // Power (W)   — 1 decimal  ← matches UI
      power_kw:     powerKW,                       // Power (kW)  — 6 decimals
      current_amps: Number(curr.toFixed(2)),       // Current (A) — duplicate alias
      voltage_v:    Number(volt.toFixed(1)),       // Voltage (V) — duplicate alias
      is_spike:     Boolean(log.isSpike)
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/sensor_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      supabaseSensorTableExists = true;
      totalSupabaseSyncedRows++;
      console.log(
        `[Supabase ⚡] Row #${totalSupabaseSyncedRows} sent to 'sensor_logs'! ` +
        `Device: ${payload.device_id} | Voltage: ${payload.voltage.toFixed(1)}V | ` +
        `Current: ${payload.current.toFixed(2)}A | Power: ${payload.power.toFixed(1)}W` +
        `${payload.is_spike ? ' 🚨 SPIKE' : ''}`
      );
      return true;
    } else {
      const errText = await response.text();
      if (errText.includes('machine_name')) {
        // If machine_name column is missing in Supabase schema, retry insert without machine_name
        const fallbackPayload = { ...payload };
        delete fallbackPayload.machine_name;
        const retryResponse = await fetch(`${SUPABASE_URL}/rest/v1/sensor_logs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(fallbackPayload)
        });
        if (retryResponse.ok) {
          supabaseSensorTableExists = true;
          totalSupabaseSyncedRows++;
          console.log(
            `[Supabase ⚡] Row #${totalSupabaseSyncedRows} sent to 'sensor_logs' (without machine_name)! ` +
            `Run SQL: ALTER TABLE sensor_logs ADD COLUMN machine_name text;`
          );
          return true;
        }
      }
      if (response.status === 404 && supabaseSensorTableExists !== false) {
        supabaseSensorTableExists = false;
        console.warn(`[Supabase ⚠️] Table 'public.sensor_logs' does not exist yet. Please create it in Supabase SQL editor.`);
      } else if (response.status !== 404) {
        console.warn(`[Supabase ⚠️] HTTP ${response.status} writing to 'sensor_logs': ${errText}`);
      }
      return false;
    }
  } catch (err) {
    console.warn('[Supabase Sensor Sync Error]', err.message);
    return false;
  }
}

// Load admin config from disk if present
try {
  if (fs.existsSync(ADMIN_CONFIG_FILE)) {
    const rawAdminData = fs.readFileSync(ADMIN_CONFIG_FILE, 'utf-8');
    adminConfig = { ...adminConfig, ...JSON.parse(rawAdminData) };
    console.log(`[AdminConfig ⚙️] Loaded Admin: '${adminConfig.adminName}', Phone: '${adminConfig.phoneNumber}', Access Code Set: ${Boolean(adminConfig.accessCode)}`);
  }
} catch (err) {
  console.warn('[AdminConfig] Could not load admin config from disk.', err.message);
}

// Attempt initial Supabase load
loadFromSupabase();

const saveAdminConfigToDisk = () => {
  try {
    fs.writeFileSync(ADMIN_CONFIG_FILE, JSON.stringify(adminConfig, null, 2));
  } catch (err) {
    console.error('[AdminConfig] Error saving admin config:', err.message);
  }
};

// -------------------------------------------------------------
// Function: Dispatch OneSignal Web Push Notification
// -------------------------------------------------------------
async function sendOneSignalPushNotification(spikeData = {}) {
  if (!adminConfig.alertEnabled) {
    console.log('[OneSignal] Alerts are currently disabled in Admin Config.');
    return;
  }

  const activeRestApiKey = adminConfig.onesignalRestApiKey || ONESIGNAL_REST_API_KEY_DEFAULT;

  if (!activeRestApiKey) {
    console.error('[OneSignal ❌] No REST API key available!');
    return;
  }

  // Build the notification body from real spike readings
  // power field is expected in Watts (W)
  const voltage  = spikeData.voltage  !== undefined ? `${Number(spikeData.voltage).toFixed(2)} V`  : 'N/A';
  const current  = spikeData.current  !== undefined ? `${Number(spikeData.current).toFixed(3)} A`  : 'N/A';
  // power comes in as Watts — display directly
  const powerW   = spikeData.power    !== undefined ? Number(spikeData.power)                      : null;
  const power    = powerW !== null ? `${powerW.toFixed(1)} W` : 'N/A';
  const device   = spikeData.device_id || 'ESP32-MCH-007';
  const machineName = spikeData.machine_name || deriveMachineName(device);

  const payload = {
    app_id: ONESIGNAL_APP_ID,
    target_channel: "push",
    included_segments: ["All"],
    headings: { en: `🚨 SPIKE ALERT — ${machineName}` },
    contents: { en: `${device} → ${voltage} | ${current} | ${power}` },
    url: "http://localhost:5173"
  };

  try {
    console.log(`[OneSignal 📲] Sending spike alert: ${device} (${machineName}) → ${voltage} | ${current} | ${power}`);
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Basic ${activeRestApiKey}`
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (data.errors) {
      console.error('[OneSignal ❌] API Error:', JSON.stringify(data.errors));
    } else {
      console.log(`[OneSignal ✅] Push sent! Recipients: ${data.recipients}, ID: ${data.id}`);
    }
    return data;
  } catch (error) {
    console.error('[OneSignal Error 🚨] Failed to send push notification:', error.message);
  }
}

// Enable CORS for all origins (React frontend, mobile, etc.)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON request bodies
app.use(express.json());

// In-memory storage for sensor data and device control commands
let sensorLogs = [];
let deviceCommands = {
  'ESP32-MCH-007': 'ON' // Default active state matching Sensor Logs
};

// Load existing logs if available
try {
  if (fs.existsSync(DATA_FILE)) {
    const rawData = fs.readFileSync(DATA_FILE, 'utf-8');
    sensorLogs = JSON.parse(rawData);
    console.log(`[Storage] Loaded ${sensorLogs.length} historical sensor logs from disk.`);
  }
} catch (err) {
  console.warn('[Storage] Could not load previous sensor logs, starting fresh.', err.message);
  sensorLogs = [];
}

// Helper to save logs asynchronously
const saveLogsToDisk = () => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(sensorLogs.slice(0, 100), null, 2));
  } catch (err) {
    console.error('[Storage] Error persisting sensor logs to disk:', err.message);
  }
};

// -------------------------------------------------------------
// Root & Health Check Endpoints
// -------------------------------------------------------------
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'PowerSight Sensor Telemetry Server',
    port: PORT,
    timestamp: new Date().toISOString(),
    endpoints: {
      postLog: 'POST /api/sensor-logs',
      getLogs: 'GET /api/sensor-logs',
      clearLogs: 'DELETE /api/sensor-logs',
      health: 'GET /api/health'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    totalLogs: sensorLogs.length,
    latestLog: sensorLogs[0] || null
  });
});

// -------------------------------------------------------------
// POST /api/sensor-logs: Ingest reading from ESP32 or IoT Gateway
// Expected Body: { device_id, voltage, current, power }
// -------------------------------------------------------------
app.post('/api/sensor-logs', (req, res) => {
  try {
    const { device_id, voltage, current, power, isSpike } = req.body;

    if (device_id === undefined || voltage === undefined || current === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: device_id, voltage, and current are required.'
      });
    }

    const currentCommand = deviceCommands[String(device_id)] || deviceCommands['ESP32-MCH-007'] || 'OFF';
    const isSpikeActive = currentCommand === 'SPIKE' || Boolean(isSpike);

    let numVoltage = Number(voltage);
    let numCurrent = Number(current);
    let numPower = power !== undefined ? Number(power) : Number(((numVoltage * numCurrent * 0.9) / 1000).toFixed(4));

    // Enforce 0.46A - 0.57A normal current range, and 0.60A - 0.63A max spike range
    if (isSpikeActive) {
      numCurrent = Number((0.60 + Math.random() * 0.03).toFixed(2)); // 0.60A - 0.63A max
      numPower = Number(((numVoltage * numCurrent) / 1000).toFixed(6));
    } else if (numCurrent < 0.40 || numCurrent > 1.0) {
      numCurrent = Number((0.46 + Math.random() * 0.11).toFixed(2)); // 0.46A - 0.57A normal
      numPower = Number(((numVoltage * numCurrent) / 1000).toFixed(6));
    }

    const isSpikeFlag = Boolean(isSpikeActive || numCurrent >= 0.60 || numPower >= 0.003);
    const powerW = Number((numVoltage * numCurrent).toFixed(1));

    const now = new Date();
    const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const machineName = deriveMachineName(String(device_id));
    const newLog = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      device_id: String(device_id),
      machine_name: machineName,
      voltage: Number(numVoltage.toFixed(1)),
      current: Number(numCurrent.toFixed(2)),
      power: powerW, // In Watts (W) — same unit as Sensor Logs
      powerWatts: powerW,
      powerKW: Number((powerW / 1000).toFixed(6)),
      currentAmps: Number(numCurrent.toFixed(2)),
      voltageV: Number(numVoltage.toFixed(1)),
      timestamp: timeFormatted,
      isoTimestamp: now.toISOString(),
      receivedAt: Date.now(),
      isSpike: isSpikeFlag
    };

    // Prepend to array (newest first)
    sensorLogs.unshift(newLog);

    // Limit buffer size to avoid unbounded memory usage
    if (sensorLogs.length > MAX_LOGS) {
      sensorLogs = sensorLogs.slice(0, MAX_LOGS);
    }

    // Persist to local JSON file periodically
    saveLogsToDisk();

    // Mark last hardware telemetry timestamp & stream to Supabase
    lastPhysicalTelemetryTime = Date.now();
    sendSensorLogToSupabase(newLog);

    // Pretty console log for live monitoring
    console.log(
      `[ESP32 -> Server] [${newLog.timestamp}] Device: ${newLog.device_id.padEnd(12)} | ` +
      `Voltage: ${numVoltage.toFixed(1).padStart(5)} V | ` +
      `Current: ${numCurrent.toFixed(2).padStart(5)} A | ` +
      `Power: ${powerW.toFixed(1).padStart(5)} W${isSpikeFlag ? ' 🚨 SPIKE' : ''}`
    );

    return res.status(201).json({
      success: true,
      message: 'Sensor reading received and logged successfully.',
      data: newLog,
      command: currentCommand
    });
  } catch (error) {
    console.error('[Server Error] Failed to process sensor log:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while logging sensor data.'
    });
  }
});

// -------------------------------------------------------------
// GET /api/sensor-logs: Fetch sensor readings for React dashboard
// Optional query: ?limit=50&device_id=ESP32-DEV-01
// -------------------------------------------------------------
app.get('/api/sensor-logs', (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 100;
    const deviceId = req.query.device_id;

    let results = sensorLogs;

    if (deviceId) {
      results = results.filter(log => log.device_id.toLowerCase() === String(deviceId).toLowerCase());
    }

    const trimmedResults = results.slice(0, limit);

    return res.json({
      success: true,
      count: trimmedResults.length,
      totalCount: results.length,
      latest: trimmedResults[0] || null,
      data: trimmedResults,
      deviceCommands
    });
  } catch (error) {
    console.error('[Server Error] Failed to fetch sensor logs:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while retrieving sensor logs.'
    });
  }
});

// -------------------------------------------------------------
// GET & POST /api/admin-config: Manage Admin Credentials & OneSignal Settings
// -------------------------------------------------------------
app.get('/api/admin-config', (req, res) => {
  return res.json({
    success: true,
    data: {
      adminName: adminConfig.adminName || 'Plant Administrator',
      phoneNumber: adminConfig.phoneNumber || '',
      hasAccessCode: Boolean(adminConfig.accessCode),
      alertEnabled: adminConfig.alertEnabled,
      onesignalAppId: adminConfig.onesignalAppId,
      hasRestApiKey: Boolean(adminConfig.onesignalRestApiKey)
    }
  });
});

app.post('/api/admin-config', (req, res) => {
  try {
    const { adminName, phoneNumber, accessCode, alertEnabled, onesignalRestApiKey } = req.body;
    if (adminName !== undefined) {
      adminConfig.adminName = String(adminName).trim();
    }
    if (phoneNumber !== undefined) {
      adminConfig.phoneNumber = String(phoneNumber).trim();
    }
    if (accessCode !== undefined && String(accessCode).trim() !== '') {
      adminConfig.accessCode = String(accessCode).trim();
    }
    if (alertEnabled !== undefined) {
      adminConfig.alertEnabled = Boolean(alertEnabled);
    }
    if (onesignalRestApiKey !== undefined && String(onesignalRestApiKey).trim() !== '') {
      adminConfig.onesignalRestApiKey = String(onesignalRestApiKey).trim();
      console.log('[OneSignal ✅] REST API Key updated successfully!');
    }

    saveAdminConfigToDisk();
    saveToSupabase(adminConfig.adminName, adminConfig.phoneNumber, adminConfig.accessCode);
    console.log(`[AdminConfig ⚙️] Saved Admin: '${adminConfig.adminName}', Phone: '${adminConfig.phoneNumber}', Access Code Set: true`);

    return res.json({
      success: true,
      message: 'Admin credentials saved successfully.',
      data: {
        adminName: adminConfig.adminName,
        phoneNumber: adminConfig.phoneNumber,
        hasAccessCode: Boolean(adminConfig.accessCode),
        alertEnabled: adminConfig.alertEnabled
      }
    });
  } catch (error) {
    console.error('[AdminConfig Error]', error);
    return res.status(500).json({ success: false, error: 'Failed to update admin config' });
  }
});

// POST /api/admin-verify-code: Verify enter access code
app.post('/api/admin-verify-code', (req, res) => {
  try {
    const { accessCode } = req.body;
    if (!adminConfig.accessCode) {
      // No code set yet
      return res.json({ success: true, verified: true, isFirstTime: true });
    }

    if (String(accessCode).trim() === String(adminConfig.accessCode).trim()) {
      return res.json({ success: true, verified: true });
    } else {
      return res.status(401).json({ success: false, verified: false, error: 'Invalid Access Code' });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/test-push: Manual push test from Admin panel
app.post('/api/test-push', async (req, res) => {
  try {
    const result = await sendOneSignalPushNotification('Manual test alert dispatched from PowerSight Admin Panel.');
    return res.json({ success: true, message: 'Test OneSignal push notification dispatched!', result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/trigger-spike: Execute Spike button trigger & broadcast push notification
app.post('/api/trigger-spike', async (req, res) => {
  try {
    deviceCommands['ESP32-MCH-007'] = 'SPIKE';
    // Use the latest real sensor reading if available
    const latest = sensorLogs[0] || {};
    const spikeCurrent = 0.63;
    const spikePowerW = 3.15; // 5.0V × 0.63A = 3.15 W  (in Watts, not kW)
    const result = await sendOneSignalPushNotification({
      device_id: latest.device_id || 'ESP32-MCH-007',
      machine_name: latest.machine_name || deriveMachineName(latest.device_id || 'ESP32-MCH-007'),
      voltage: latest.voltage ?? 5.0,
      current: spikeCurrent,
      power: spikePowerW
    });
    return res.json({
      success: true,
      message: 'Spike triggered! Push notification sent to all subscribed browsers.',
      result
    });
  } catch (err) {
    console.error('[Spike Trigger Error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// POST /api/device-command: Send ON / OFF / SPIKE command to motor fan
// Expected Body: { device_id, command }  e.g. { device_id: "ESP32-MCH-007", command: "ON" }
// -------------------------------------------------------------
app.post('/api/device-command', (req, res) => {
  try {
    const { device_id, command } = req.body;
    const targetDevice = device_id || 'ESP32-MCH-007';
    const cmdUpper = String(command).toUpperCase();
    const newCommand = (cmdUpper === 'SPIKE') ? 'SPIKE' : (cmdUpper === 'ON') ? 'ON' : 'OFF';

    deviceCommands[targetDevice] = newCommand;

    if (newCommand === 'SPIKE') {
      // Trigger OneSignal web push notification with live spike readings
      const latest = sensorLogs.find(l => l.device_id === targetDevice) || {};
      const spikeCurrent = 0.63;
      const spikePowerW = Number(((latest.voltageV || 5.0) * spikeCurrent).toFixed(1)); // Watts
      sendOneSignalPushNotification({
        device_id: targetDevice,
        machine_name: deriveMachineName(targetDevice),
        voltage: latest.voltageV || 5.0,
        current: spikeCurrent,
        power: spikePowerW
      });
    } else if (newCommand === 'ON') {
      // When normalizing (ON), clear isSpike flag on all in-memory logs immediately
      sensorLogs = sensorLogs.map(log => ({
        ...log,
        isSpike: false,
        current: log.current > 0.58 ? Number((0.46 + Math.random() * 0.11).toFixed(2)) : log.current,
        currentAmps: log.currentAmps > 0.58 ? Number((0.46 + Math.random() * 0.11).toFixed(2)) : log.currentAmps
      }));
      console.log(`[Normalize ✅] Cleared isSpike flag on all ${sensorLogs.length} logs and reset current to 0.46-0.57A range.`);
    }

    console.log(`[Remote Control ⚡] Set device '${targetDevice}' command to: ${newCommand}`);

    return res.json({
      success: true,
      device_id: targetDevice,
      command: newCommand,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Server Error] Failed to set device command:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error setting device command.'
    });
  }
});

// -------------------------------------------------------------
// GET /api/device-command: Fast poll endpoint for ESP32 hardware
// Optional query: ?device_id=ESP32-MCH-007
// -------------------------------------------------------------
app.get('/api/device-command', (req, res) => {
  const deviceId = req.query.device_id || 'ESP32-MCH-007';
  const command = deviceCommands[deviceId] || deviceCommands['ESP32-MCH-007'] || 'OFF';
  return res.json({
    success: true,
    device_id: deviceId,
    command: command
  });
});

// -------------------------------------------------------------
// DELETE /api/sensor-logs: Clear stored readings (for testing)
// -------------------------------------------------------------
app.delete('/api/sensor-logs', (req, res) => {
  sensorLogs = [];
  saveLogsToDisk();
  console.log('[Storage] All sensor logs have been cleared.');
  return res.json({
    success: true,
    message: 'All sensor logs have been cleared.'
  });
});

// -------------------------------------------------------------
// USB Serial Bridge: Ingest telemetry directly from USB cable if connected
// -------------------------------------------------------------
const startSerialBridge = () => {
  const psScript = `
    while ($true) {
      $ports = [System.IO.Ports.SerialPort]::GetPortNames()
      $targetPort = $null
      if ($ports -contains "COM9") {
        $targetPort = "COM9"
      } else {
        foreach ($p in $ports) {
          if ($p -notmatch "COM[3-8]") { # Skip bluetooth links
            $targetPort = $p
            break
          }
        }
      }

      if ($targetPort) {
        $port = $null
        try {
          $port = New-Object System.IO.Ports.SerialPort $targetPort, 115200, "None", 8, "One"
          $port.ReadTimeout = 200
          $port.Open()
          Write-Output "[BRIDGE] $targetPort opened successfully"
          while ($true) {
            try {
              $line = $port.ReadLine()
              Write-Output $line
            } catch [System.TimeoutException] {
              # Normal timeout - just keep looping
            } catch {
              Write-Output "[BRIDGE-RESET] ESP32 reset detected, reconnecting..."
              break
            }
          }
        } catch {
          # Quiet retry
        } finally {
          if ($port -and $port.IsOpen) { $port.Close() }
        }
      }
      Start-Sleep -Seconds 3
    }
  `;

  const child = spawn('powershell', ['-Command', psScript]);

  child.stdout.on('data', (chunk) => {
    const rawStr = chunk.toString();
    const lines = rawStr.split('\n');
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      // Always log ALL ESP32 output to server console
      console.log('[ESP32-SERIAL]', line);

      // Parse JSON data lines
      const jsonStart = line.indexOf('{');
      const jsonEnd = line.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        try {
          const payload = JSON.parse(line.substring(jsonStart, jsonEnd + 1));
          if (payload.device_id || payload.voltage !== undefined) {
            const devId = payload.device_id || 'ESP32-MCH-007';
            const currentCommand = deviceCommands[devId] || deviceCommands['ESP32-MCH-007'] || 'OFF';
            const isSpikeActive = currentCommand === 'SPIKE';

            let voltage = parseFloat(payload.voltage) || 0.0;
            let current = parseFloat(payload.current) || 0.0;
            let power = parseFloat(payload.power) || (voltage * current / 1000.0);

            if (isSpikeActive) {
              current = Number((0.60 + Math.random() * 0.03).toFixed(2));
              power = Number(((voltage * current) / 1000).toFixed(6));
            } else if (current < 0.40 || current > 1.0) {
              current = Number((0.46 + Math.random() * 0.11).toFixed(2));
              power = Number(((voltage * current) / 1000).toFixed(6));
            }

            const isSpikeFlag = Boolean(isSpikeActive || current >= 0.60 || power >= 0.003);

            // power variable from USB serial is in kW — convert to Watts for UI/Supabase consistency
            const powerW_serial = Number((power * 1000).toFixed(1)); // kW → W (matches UI display)
            const timeStr = new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const newEntry = {
              id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              device_id: devId,
              voltage:      Number(voltage.toFixed(1)),    // V — 1 decimal (matches UI)
              current:      Number(current.toFixed(2)),    // A — 2 decimals (matches UI)
              power:        powerW_serial,                 // W — 1 decimal (matches UI Power column)
              powerWatts:   powerW_serial,                 // W — alias used by sendSensorLogToSupabase
              powerKW:      Number(power.toFixed(6)),      // kW — original value kept
              currentAmps:  Number(current.toFixed(2)),    // A — alias (matches UI)
              voltageV:     Number(voltage.toFixed(1)),    // V — alias (matches UI)
              timestamp: timeStr,
              isoTimestamp: new Date().toISOString(),
              receivedAt: Date.now(),
              isSpike: isSpikeFlag
            };

            sensorLogs.unshift(newEntry);
            if (sensorLogs.length > MAX_LOGS) sensorLogs.pop();
            saveLogsToDisk();
            lastPhysicalTelemetryTime = Date.now();
            sendSensorLogToSupabase(newEntry);
            console.log(`[USB-DATA] V:${voltage.toFixed(2)}V | I:${current.toFixed(3)}A | P:${power.toFixed(4)}kW${isSpikeFlag ? ' 🚨 SPIKE' : ''}`);
          }
        } catch (e) {}
      }
    }
  });

  child.stderr.on('data', () => {});
  child.on('exit', () => {
    setTimeout(startSerialBridge, 3000);
  });
};

// Continuous 2-second telemetry loop:
// If hardware ESP32 is not currently sending, continuously streams 2-second readings to Supabase & memory.
// Automatically yields when physical ESP32 data arrives.
setInterval(() => {
  const elapsedSinceHardware = Date.now() - lastPhysicalTelemetryTime;
  if (elapsedSinceHardware >= 3500) {
    const targetDevice = 'ESP32-MCH-007';
    const currentCommand = deviceCommands[targetDevice] || 'OFF';
    const noiseV = ((Math.random() - 0.5) * 0.1);
    const noiseI = ((Math.random() - 0.5) * 0.04);

    let v = Number((5.00 + noiseV).toFixed(1));
    let i = 0.0;
    let powerW = 0.0;
    let isSpike = false;

    if (currentCommand === 'SPIKE') {
      i = Number((0.60 + Math.random() * 0.03).toFixed(2));
      powerW = Number((v * i).toFixed(1));
      isSpike = true;
    } else if (currentCommand === 'ON') {
      i = Number((0.46 + Math.random() * 0.11 + noiseI).toFixed(2));
      powerW = Number((v * i).toFixed(1));
    } else {
      v = 5.0;
      i = 0.00;
      powerW = 0.0;
    }

    const powerKW = Number((powerW / 1000).toFixed(6));
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const machineName = deriveMachineName(targetDevice);
    const newLog = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      device_id: targetDevice,
      machine_name: machineName,
      voltage: v,
      current: i,
      power: powerW, // In Watts (W) — same unit as Sensor Logs
      powerWatts: powerW,
      powerKW: powerKW,
      currentAmps: i,
      voltageV: v,
      timestamp: timeFormatted,
      isoTimestamp: now.toISOString(),
      receivedAt: Date.now(),
      isSpike: isSpike
    };

    sensorLogs.unshift(newLog);
    if (sensorLogs.length > MAX_LOGS) {
      sensorLogs = sensorLogs.slice(0, MAX_LOGS);
    }
    saveLogsToDisk();
    sendSensorLogToSupabase(newLog);
  }
}, 2000);

// ─────────────────────────────────────────────────────────────────────────────
// Simulation loops for industrial machines (MCH-001 CNC, MCH-002 Hydraulic Press)
// These generate realistic 415V industrial sensor logs every 3 seconds.
// ─────────────────────────────────────────────────────────────────────────────
const INDUSTRIAL_MACHINES = [
  { device_id: 'MCH-001', machine_name: 'CNC-MACHINE-01',       baseV: 415, baseI: 42.5, noiseI: 4.0, ratedW: 30000 },
  { device_id: 'MCH-002', machine_name: 'HYDRAULIC-PRESS-02',   baseV: 415, baseI: 68.0, noiseI: 6.0, ratedW: 48000 },
];

setInterval(() => {
  const now = new Date();
  const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  for (const machine of INDUSTRIAL_MACHINES) {
    const currentCommand = deviceCommands[machine.device_id] || 'ON'; // industrial machines default ON
    const noiseV = ((Math.random() - 0.5) * 3);   // ±1.5V noise on 415V supply
    const noiseI = ((Math.random() - 0.5) * machine.noiseI);

    let v = Number((machine.baseV + noiseV).toFixed(1));
    let i = 0.0;
    let powerW = 0.0;
    let isSpike = false;

    if (currentCommand === 'SPIKE') {
      // Industrial spike: +25-35% overcurrent
      i = Number((machine.baseI * (1.28 + Math.random() * 0.08)).toFixed(1));
      powerW = Number((v * i * 1.732 * 0.88).toFixed(0)); // 3-phase power estimate
      isSpike = true;
    } else if (currentCommand === 'OFF') {
      v = machine.baseV;
      i = 0.0;
      powerW = 0.0;
    } else {
      // Normal operation with realistic noise
      i = Number((machine.baseI + noiseI).toFixed(1));
      if (i < machine.baseI * 0.7) i = Number((machine.baseI * 0.72).toFixed(1));
      if (i > machine.baseI * 1.2) i = Number((machine.baseI * 1.18).toFixed(1));
      powerW = Number((v * i * 1.732 * 0.88).toFixed(0)); // 3-phase
    }

    const powerKW = Number((powerW / 1000).toFixed(4));

    const newLog = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      device_id: machine.device_id,
      machine_name: machine.machine_name,
      voltage:      Number(v.toFixed(1)),
      current:      Number(i.toFixed(1)),
      power:        powerW,
      powerWatts:   powerW,
      powerKW:      powerKW,
      currentAmps:  Number(i.toFixed(1)),
      voltageV:     Number(v.toFixed(1)),
      timestamp:    timeFormatted,
      isoTimestamp: now.toISOString(),
      receivedAt:   Date.now(),
      isSpike:      isSpike,
    };

    sensorLogs.unshift(newLog);
    if (sensorLogs.length > MAX_LOGS) sensorLogs = sensorLogs.slice(0, MAX_LOGS);
    sendSensorLogToSupabase(newLog);
  }
}, 3000);

// Endpoint to inspect Supabase telemetry integration status
app.get('/api/supabase-status', (req, res) => {
  res.json({
    success: true,
    supabaseUrl: SUPABASE_URL,
    tableExists: supabaseSensorTableExists,
    totalSyncedRows: totalSupabaseSyncedRows,
    targetTable: 'sensor_logs',
    lastPhysicalTelemetryTime
  });
});

// Start Express Server
app.listen(PORT, '0.0.0.0', () => {
  console.log('====================================================');
  console.log(`⚡ PowerSight Backend Server is running on port ${PORT}`);
  console.log(`📡 Local URL:      http://localhost:${PORT}`);
  console.log(`🌐 Network URL:    http://0.0.0.0:${PORT}`);
  console.log(`📥 Ingest API:     POST http://localhost:${PORT}/api/sensor-logs`);
  console.log(`📊 Supabase Table: ${SUPABASE_URL} -> public.sensor_logs (Every 2s)`);
  console.log('====================================================');

  startSerialBridge();
});
