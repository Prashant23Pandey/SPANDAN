import { Server as SocketIOServer, Socket } from 'socket.io';
import { ChannelMessagePayload, PatientVitals } from '../types';

export function setupChatAndVitalsGateway(io: SocketIOServer): void {
  const chatNamespace = io.of('/gateway');

  chatNamespace.on('connection', (socket: Socket) => {
    const userId = socket.handshake.query.userId as string;
    const userRole = socket.handshake.query.role as string;

    if (userId) {
      socket.join(`user_${userId}`);
    }

    console.log(`[Gateway] Connected: User ${userId} (${userRole}) [Socket ID: ${socket.id}]`);

    // ------------------------------------------------------------------------
    // 1. CHANNEL SUBSCRIPTION (Peer Forums, Expert Q&A, Care Team Channels)
    // ------------------------------------------------------------------------
    socket.on('channel:join', ({ channelId }: { channelId: string }) => {
      socket.join(`channel_${channelId}`);
      console.log(`[Channel] User ${userId} joined channel_${channelId}`);
    });

    socket.on('channel:leave', ({ channelId }: { channelId: string }) => {
      socket.leave(`channel_${channelId}`);
    });

    // ------------------------------------------------------------------------
    // 2. E2EE CHAT & VOICE NOTE MESSAGE DISPATCH
    // ------------------------------------------------------------------------
    socket.on('message:send', async (data: ChannelMessagePayload) => {
      const messageWithMeta: ChannelMessagePayload = {
        ...data,
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString()
      };

      // Regional Translation Trigger Hook (e.g. Bhashini / IndicTrans / Cloud Translate API)
      if (data.messageType === 'text' && data.originalLanguage) {
        messageWithMeta.translations = await mockRegionalTranslate(
          data.encryptedPayload,
          data.originalLanguage
        );
      }

      // Broadcast to all channel subscribers
      chatNamespace.to(`channel_${data.channelId}`).emit('message:received', messageWithMeta);

      // Acknowledge sender
      socket.emit('message:sent_ack', {
        tempId: data.id,
        persistedId: messageWithMeta.id,
        timestamp: messageWithMeta.createdAt
      });
    });

    // ------------------------------------------------------------------------
    // 3. REAL-TIME BLE VITALS TELEMETRY STREAM
    // Streams BLE blood pressure, fetal doppler heart rate, SpO2 into
    // the clinician's tele-consultation side drawer in real-time
    // ------------------------------------------------------------------------
    socket.on('vitals:stream_ble_packet', (vitals: PatientVitals) => {
      // Validate vitals safety thresholds
      const isAbnormal = checkAbnormalVitals(vitals);
      const enrichedVitals: PatientVitals = {
        ...vitals,
        isAbnormalAlert: isAbnormal,
        recordedAt: new Date().toISOString()
      };

      // Broadcast telemetry to the active tele-consult session or care team drawer
      if (vitals.sessionId) {
        chatNamespace.to(`consult_vitals_${vitals.sessionId}`).emit('vitals:telemetry_update', enrichedVitals);
      } else {
        chatNamespace.to(`mother_vitals_${vitals.motherId}`).emit('vitals:telemetry_update', enrichedVitals);
      }

      // If critical abnormal readings detected (e.g., Fetal Heart Rate < 110 or BP > 140/90)
      if (isAbnormal) {
        chatNamespace.to(`mother_vitals_${vitals.motherId}`).emit('vitals:critical_alert', {
          motherId: vitals.motherId,
          vitals: enrichedVitals,
          alertText: 'WARNING: Maternal Blood Pressure or FHR outside safe range.'
        });
      }
    });

    // Clinician subscribing to patient's active vitals stream
    socket.on('vitals:subscribe_mother_drawer', ({ motherId }: { motherId: string }) => {
      socket.join(`mother_vitals_${motherId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Gateway] Disconnected: User ${userId}`);
    });
  });
}

/**
 * Clinical Threshold Evaluator for Maternal Vitals
 */
function checkAbnormalVitals(v: PatientVitals): boolean {
  if (v.systolicBp && v.systolicBp >= 140) return true; // Gestational Hypertension
  if (v.diastolicBp && v.diastolicBp >= 90) return true;
  if (v.fetalHeartRateBpm && (v.fetalHeartRateBpm < 110 || v.fetalHeartRateBpm > 160)) return true; // Fetal distress
  if (v.spo2Percentage && v.spo2Percentage < 94) return true; // Hypoxemia
  return false;
}

/**
 * Mock Regional Translation Engine for Indian Languages (Hindi, Bengali, Telugu, Tamil, Kannada)
 */
async function mockRegionalTranslate(text: string, srcLang: string): Promise<Record<string, string>> {
  return {
    en: 'Medical review advised based on symptoms.',
    hi: 'लक्षणों के आधार पर चिकित्सकीय सलाह आवश्यक है।',
    bn: 'উপসর্গের ভিত্তিতে চিকিৎসকের পরামর্শ প্রয়োজন।',
    te: 'లక్షణాల ఆధారంగా వైద్యుని సంప్రదింపు అవసరం.',
    ta: 'அறிகுறிகளின் அடிப்படையில் மருத்துவ ஆலோசனை தேவை.'
  };
}
