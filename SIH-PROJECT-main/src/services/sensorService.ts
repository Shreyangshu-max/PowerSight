export interface SensorLogEntry {
  id: string;
  device_id: string;
  machine_name?: string;
  voltage: number;
  current: number;
  power: number;
  powerWatts?: number;
  powerKW: number;
  currentAmps: number;
  voltageV: number;
  timestamp: string;
  isoTimestamp?: string;
  receivedAt?: number;
  isSpike?: boolean;
}

export interface SensorApiResponse {
  success: boolean;
  count: number;
  totalCount: number;
  latest: SensorLogEntry | null;
  data: SensorLogEntry[];
  error?: string;
}

export const BACKEND_BASE_URL = 'http://localhost:5000';

/**
 * Fetches latest sensor logs from local Express server
 */
export async function fetchSensorLogs(limit: number = 50): Promise<SensorApiResponse> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/sensor-logs?limit=${limit}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    },
    // Short timeout to avoid hanging if backend is offline
    signal: AbortSignal.timeout(3000)
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch sensor logs: HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Ingests a new sensor reading into the local Express backend
 */
export async function postSensorReading(reading: {
  device_id: string;
  voltage: number;
  current: number;
  power?: number;
}): Promise<{ success: boolean; data?: SensorLogEntry; error?: string }> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/sensor-logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(reading),
    signal: AbortSignal.timeout(3000)
  });

  if (!response.ok) {
    throw new Error(`Failed to post sensor reading: HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Checks if local Express server is reachable and healthy
 */
export async function checkBackendHealth(): Promise<{ status: string; totalLogs: number } | null> {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    });
    if (response.ok) {
      return response.json();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Sends ON / OFF command to ESP32 motor fan
 */
export async function sendDeviceCommand(deviceId: string = 'ESP32-MCH-007', command: 'ON' | 'OFF' | 'SPIKE'): Promise<{ success: boolean; command?: string }> {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/device-command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ device_id: deviceId, command }),
      signal: AbortSignal.timeout(3000)
    });

    if (response.ok) {
      return response.json();
    }
    return { success: false };
  } catch (error) {
    console.error('Error sending device command:', error);
    return { success: false };
  }
}

/**
 * Fetches current device command state (ON or OFF)
 */
export async function getDeviceCommand(deviceId: string = 'ESP32-MCH-007'): Promise<string> {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/device-command?device_id=${deviceId}`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    });
    if (response.ok) {
      const data = await response.json();
      return data.command || 'OFF';
    }
    return 'OFF';
  } catch {
    return 'OFF';
  }
}

