import { Server as SocketIOServer } from 'socket.io';
import { SOSEmergencyPayload, SOSState } from '../types';

export class SOSEmergencyService {
  private activeSOSEvents: Map<string, SOSEmergencyPayload> = new Map();

  /**
   * One-Touch SOS Trigger Initiator
   * Auto-bridges Mother -> Partner -> On-Call OB-GYN -> Hospital Desk
   */
  public async initiateEmergencySOS(
    io: SocketIOServer,
    payload: {
      motherId: string;
      motherName: string;
      phoneE164: string;
      latitude: number;
      longitude: number;
      careTeamId: string;
      partnerId?: string;
      onCallDoctorId: string;
      hospitalId: string;
      ashaWorkerId?: string;
    }
  ): Promise<SOSEmergencyPayload> {
    const sosEventId = `sos_${Date.now()}_${payload.motherId.slice(0, 8)}`;
    const webrtcRoom = `emergency_bridge_${sosEventId}`;

    const sosEvent: SOSEmergencyPayload = {
      sosEventId,
      motherId: payload.motherId,
      motherName: payload.motherName,
      phoneE164: payload.phoneE164,
      latitude: payload.latitude,
      longitude: payload.longitude,
      careTeamId: payload.careTeamId,
      webrtcRoom,
      state: 'triggered',
      escalationSequence: {
        partnerNotifiedAt: new Date().toISOString()
      }
    };

    this.activeSOSEvents.set(sosEventId, sosEvent);

    // STEP 1: Broadcast high-priority alarm to Mother's room & Care Team
    io.to(`care_team_${payload.careTeamId}`).emit('sos:alarm_triggered', {
      ...sosEvent,
      message: `CRITICAL ALERT: Emergency SOS triggered by ${payload.motherName}`
    });

    // STEP 2: Trigger urgent VoIP push to Partner
    if (payload.partnerId) {
      io.to(`user_${payload.partnerId}`).emit('sos:partner_bridge_call', {
        sosEventId,
        webrtcRoom,
        action: 'JOIN_EMERGENCY_BRIDGE',
        priority: 'MAXIMUM'
      });
      sosEvent.state = 'partner_notified';
    }

    // STEP 3: Auto-Escalate to On-Call Gynecologist (Priority 0)
    setTimeout(() => {
      sosEvent.state = 'doctor_bridged';
      sosEvent.escalationSequence.doctorBridgedAt = new Date().toISOString();
      
      io.to(`user_${payload.onCallDoctorId}`).emit('sos:clinician_override_call', {
        sosEventId,
        motherName: payload.motherName,
        phone: payload.phoneE164,
        webrtcRoom,
        gps: { lat: payload.latitude, lng: payload.longitude },
        audioAutoAnswer: true
      });
    }, 1500);

    // STEP 4: Notify Hospital Emergency Desk & Local ASHA Worker
    setTimeout(() => {
      sosEvent.state = 'ambulance_dispatched';
      sosEvent.escalationSequence.hospitalNotifiedAt = new Date().toISOString();
      sosEvent.escalationSequence.ambulanceAssignedAt = new Date().toISOString();

      io.to(`hospital_${payload.hospitalId}`).emit('sos:hospital_inbound_triage', {
        sosEventId,
        patientName: payload.motherName,
        contact: payload.phoneE164,
        etaMinutes: 12,
        gps: { lat: payload.latitude, lng: payload.longitude },
        bedRequirement: 'OB_EMERGENCY_OT'
      });

      if (payload.ashaWorkerId) {
        io.to(`user_${payload.ashaWorkerId}`).emit('sos:asha_field_dispatch', {
          sosEventId,
          patientName: payload.motherName,
          gps: { lat: payload.latitude, lng: payload.longitude }
        });
      }
    }, 3000);

    return sosEvent;
  }

  /**
   * Resolve an active SOS event with clinical notes
   */
  public resolveSOS(sosEventId: string, resolutionNotes: string): SOSEmergencyPayload | null {
    const event = this.activeSOSEvents.get(sosEventId);
    if (!event) return null;

    event.state = 'resolved';
    return event;
  }

  public getActiveSOS(sosEventId: string): SOSEmergencyPayload | undefined {
    return this.activeSOSEvents.get(sosEventId);
  }
}

export const sosEmergencyService = new SOSEmergencyService();
