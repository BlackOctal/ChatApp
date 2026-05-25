export function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [];

  // STUN servers
  const stunList = (process.env.NEXT_PUBLIC_STUN_SERVERS ?? "stun:stun.l.google.com:19302").split(",");
  servers.push({ urls: stunList.map((s) => s.trim()) });

  // TURN server (optional)
  if (process.env.NEXT_PUBLIC_TURN_SERVER_URL) {
    servers.push({
      urls: process.env.NEXT_PUBLIC_TURN_SERVER_URL,
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
    });
  }

  return servers;
}

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [],
  iceTransportPolicy: "all",
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
};
