import { AccessToken } from 'livekit-server-sdk';
import { CareUser, WebRTCConnectionProfile, UserRole } from '../types';

export class LiveKitTeleConsultService {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly livekitHost: string;

  constructor() {
    this.apiKey = process.env.LIVEKIT_API_KEY || 'devkey_maacare_clinical';
    this.apiSecret = process.env.LIVEKIT_API_SECRET || 'secret_9f8d7c6b5a4e3d2c1b0a';
    this.livekitHost = process.env.LIVEKIT_HOST || 'wss://teleconsult.maacare.org';
  }

  /**
   * Generates a secure, role-permissioned WebRTC Access Token for tele-consultation
   */
  public async generateConsultToken(
    user: CareUser,
    roomName: string,
    networkQuality: '2g' | '3g' | '4g_5g' = '4g_5g'
  ): Promise<{ token: string; serverUrl: string; profile: WebRTCConnectionProfile }> {
    const token = new AccessToken(this.apiKey, this.apiSecret, {
      identity: user.id,
      name: user.fullName,
      metadata: JSON.stringify({
        role: user.role,
        isVerifiedBadge: user.isVerifiedBadge,
        gestationalWeek: user.gestationalWeek,
        networkMode: networkQuality
      })
    });

    // Clinical permissions: Gynecologist is room admin / publisher
    const isClinician = user.role === 'gynecologist';
    const isMother = user.role === 'pregnant_mother';

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: isClinician, // Clinician can mute/moderate audio/video
      roomRecord: isClinician  // Only clinician can trigger DISHA compliant recording with consent
    });

    const jwtToken = await token.toJwt();
    const profile = this.getAdaptiveNetworkProfile(networkQuality, user.role);

    return {
      token: jwtToken,
      serverUrl: this.livekitHost,
      profile
    };
  }

  /**
   * 2G/3G Low-Bandwidth Network Optimization Strategy
   * Prioritizes clinical audio fidelity and falls back to audio-only on 2G rural connections
   */
  public getAdaptiveNetworkProfile(
    networkQuality: '2g' | '3g' | '4g_5g',
    role: UserRole
  ): WebRTCConnectionProfile {
    switch (networkQuality) {
      case '2g':
        // Rural 2G / Edge Profile: Audio-first, Opus 16kbps, zero video bandwidth waste
        return {
          maxBitrateKbps: 24,
          resolution: '240p',
          simulcast: false,
          audioOnlyFallback: true,
          adaptivePliIntervalMs: 5000
        };

      case '3g':
        // 3G Profile: 360p video, 15fps, Opus 32kbps
        return {
          maxBitrateKbps: 180,
          resolution: '480p',
          simulcast: true,
          audioOnlyFallback: false,
          adaptivePliIntervalMs: 2500
        };

      case '4g_5g':
      default:
        // High Speed 4G/5G/Broadband: 720p 30fps Simulcast
        return {
          maxBitrateKbps: 1200,
          resolution: '720p',
          simulcast: true,
          audioOnlyFallback: false,
          adaptivePliIntervalMs: 1000
        };
    }
  }
}

export const teleConsultService = new LiveKitTeleConsultService();
