/**
 * Device Information Parser
 * Extracts browser, OS, and device information from user-agent string
 */

export interface DeviceInfo {
  userAgent: string;
  browser?: string;
  os?: string;
  device?: string;
}

/**
 * Parse user-agent string to extract device information
 */
export function parseUserAgent(userAgent: string): DeviceInfo {
  const deviceInfo: DeviceInfo = {
    userAgent,
  };

  // Detect browser
  if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) {
    deviceInfo.browser = "Chrome";
  } else if (userAgent.includes("Firefox")) {
    deviceInfo.browser = "Firefox";
  } else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
    deviceInfo.browser = "Safari";
  } else if (userAgent.includes("Edg")) {
    deviceInfo.browser = "Edge";
  } else if (userAgent.includes("OPR") || userAgent.includes("Opera")) {
    deviceInfo.browser = "Opera";
  } else {
    deviceInfo.browser = "Unknown Browser";
  }

  // Detect OS
  if (userAgent.includes("Windows NT 10.0")) {
    deviceInfo.os = "Windows 10/11";
  } else if (userAgent.includes("Windows NT")) {
    deviceInfo.os = "Windows";
  } else if (userAgent.includes("Mac OS X")) {
    const match = userAgent.match(/Mac OS X ([0-9_]+)/);
    deviceInfo.os = match ? `macOS ${match[1].replace(/_/g, ".")}` : "macOS";
  } else if (userAgent.includes("Linux")) {
    deviceInfo.os = "Linux";
  } else if (userAgent.includes("Android")) {
    deviceInfo.os = "Android";
  } else if (
    userAgent.includes("iOS") ||
    userAgent.includes("iPhone") ||
    userAgent.includes("iPad")
  ) {
    deviceInfo.os = "iOS";
  } else {
    deviceInfo.os = "Unknown OS";
  }

  // Detect device type
  if (
    userAgent.includes("Mobile") ||
    userAgent.includes("Android") ||
    userAgent.includes("iPhone")
  ) {
    deviceInfo.device = "Mobile";
  } else if (userAgent.includes("Tablet") || userAgent.includes("iPad")) {
    deviceInfo.device = "Tablet";
  } else {
    deviceInfo.device = "Desktop";
  }

  return deviceInfo;
}

/**
 * Get a human-readable device description
 */
export function getDeviceDescription(deviceInfo: DeviceInfo): string {
  const parts: string[] = [];

  if (deviceInfo.browser) {
    parts.push(deviceInfo.browser);
  }

  if (deviceInfo.os) {
    parts.push(`on ${deviceInfo.os}`);
  }

  if (deviceInfo.device && deviceInfo.device !== "Desktop") {
    parts.push(`(${deviceInfo.device})`);
  }

  return parts.join(" ") || "Unknown Device";
}

/**
 * Get IP address from request headers
 */
export function getIpAddress(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

/**
 * Get location from IP address (simple version - can be enhanced with MaxMind or ipapi.co)
 * For now, returns undefined. You can integrate a geolocation service later.
 */
export async function getLocationFromIp(
  ipAddress: string
): Promise<{ city?: string; country?: string } | undefined> {
  // Skip for localhost
  if (
    ipAddress === "unknown" ||
    ipAddress === "127.0.0.1" ||
    ipAddress.startsWith("192.168.") ||
    ipAddress.startsWith("10.")
  ) {
    return undefined;
  }

  try {
    // Option 1: Use free ipapi.co service (100 requests/day)
    // Uncomment to enable:
    /*
    const response = await fetch(`https://ipapi.co/${ipAddress}/json/`, {
      headers: { 'User-Agent': 'SpendTracker/1.0' }
    });

    if (response.ok) {
      const data = await response.json();
      return {
        city: data.city,
        country: data.country_name
      };
    }
    */

    // Option 2: Return undefined for now
    return undefined;
  } catch (error) {    return undefined;
  }
}
