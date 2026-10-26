import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Animated,
  Dimensions
} from 'react-native';
import { PatientVitals } from '../server/src/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(360, SCREEN_WIDTH * 0.85);

export const TeleConsultScreen: React.FC<{
  userRole: 'pregnant_mother' | 'gynecologist';
  patientName: string;
  gestationalWeek: number;
  onEndCall: () => void;
}> = ({ userRole, patientName, gestationalWeek, onEndCall }) => {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [drawerAnim] = useState(new Animated.Value(0));
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [networkQuality, setNetworkQuality] = useState<'4G' | '3G' | '2G_AudioOnly'>('4G');

  // Real-time BLE Vitals State (Streamed via Socket.io)
  const [liveVitals, setLiveVitals] = useState<PatientVitals>({
    motherId: 'm1',
    systolicBp: 122,
    diastolicBp: 78,
    heartRateBpm: 76,
    fetalHeartRateBpm: 142,
    spo2Percentage: 98.5,
    bloodGlucoseMgDl: 94.0,
    isAbnormalAlert: false,
    recordedAt: new Date().toLocaleTimeString()
  });

  const toggleDrawer = () => {
    Animated.timing(drawerAnim, {
      toValue: drawerOpen ? -DRAWER_WIDTH : 0,
      duration: 250,
      useNativeDriver: true
    }).start();
    setDrawerOpen(!drawerOpen);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Video Stream Stage */}
      <View style={styles.videoStage}>
        {/* Remote Video Container */}
        <View style={styles.remoteVideoBox}>
          <Text style={styles.videoPlaceholderText}>
            📹 Live Remote Stream ({userRole === 'gynecologist' ? patientName : 'Dr. Maya Sharma'})
          </Text>
          <View style={styles.networkBadge}>
            <Text style={styles.networkBadgeText}>📶 Network: {networkQuality}</Text>
          </View>
        </View>

        {/* Local Self-View PiP (Picture in Picture) */}
        <View style={styles.localPipBox}>
          <Text style={styles.pipText}>You</Text>
        </View>

        {/* Floating Call Action Controls */}
        <View style={styles.controlsBar}>
          <TouchableOpacity
            style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
            onPress={() => setIsMuted(!isMuted)}
          >
            <Text style={styles.controlIcon}>{isMuted ? '🔇' : '🎙️'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlBtn, isVideoOff && styles.controlBtnActive]}
            onPress={() => setIsVideoOff(!isVideoOff)}
          >
            <Text style={styles.controlIcon}>{isVideoOff ? '🚫' : '📹'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.endCallBtn} onPress={onEndCall}>
            <Text style={styles.endCallText}>End Call</Text>
          </TouchableOpacity>

          {/* Clinician Drawer Toggle Button */}
          {userRole === 'gynecologist' && (
            <TouchableOpacity style={styles.vitalsToggleBtn} onPress={toggleDrawer}>
              <Text style={styles.vitalsToggleText}>🩺 Vitals</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Clinician Vitals & History Side-Drawer */}
      {userRole === 'gynecologist' && (
        <Animated.View
          style={[
            styles.drawerContainer,
            { transform: [{ translateX: drawerAnim }] }
          ]}
        >
          <View style={styles.drawerHeader}>
            <View>
              <Text style={styles.drawerTitle}>Patient Vitals &amp; Telemetry</Text>
              <Text style={styles.drawerSub}>
                {patientName} • Week {gestationalWeek}
              </Text>
            </View>
            <TouchableOpacity onPress={toggleDrawer} style={styles.closeDrawerBtn}>
              <Text style={styles.closeDrawerText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.drawerBody}>
            {/* Live BLE Vitals Stream Card */}
            <View style={styles.vitalsGrid}>
              
              {/* Fetal Doppler Heart Rate */}
              <View style={[styles.vitalCard, { borderColor: '#10B981' }]}>
                <Text style={styles.vitalLabel}>Fetal Heart Rate (FHR)</Text>
                <Text style={[styles.vitalValue, { color: '#059669' }]}>
                  {liveVitals.fetalHeartRateBpm} <Text style={styles.vitalUnit}>BPM</Text>
                </Text>
                <Text style={styles.vitalStatus}>Normal (110–160)</Text>
              </View>

              {/* Blood Pressure */}
              <View style={[styles.vitalCard, { borderColor: '#3B82F6' }]}>
                <Text style={styles.vitalLabel}>Maternal Blood Pressure</Text>
                <Text style={[styles.vitalValue, { color: '#1D4ED8' }]}>
                  {liveVitals.systolicBp}/{liveVitals.diastolicBp} <Text style={styles.vitalUnit}>mmHg</Text>
                </Text>
                <Text style={styles.vitalStatus}>Normotensive</Text>
              </View>

              {/* Maternal SpO2 & Pulse */}
              <View style={styles.vitalCard}>
                <Text style={styles.vitalLabel}>Oxygen Saturation (SpO2)</Text>
                <Text style={styles.vitalValue}>
                  {liveVitals.spo2Percentage}%
                </Text>
                <Text style={styles.vitalStatus}>Pulse: {liveVitals.heartRateBpm} bpm</Text>
              </View>

              {/* Blood Glucose */}
              <View style={styles.vitalCard}>
                <Text style={styles.vitalLabel}>Fasting Blood Sugar</Text>
                <Text style={styles.vitalValue}>
                  {liveVitals.bloodGlucoseMgDl} <Text style={styles.vitalUnit}>mg/dL</Text>
                </Text>
                <Text style={styles.vitalStatus}>Target &lt; 95 mg/dL</Text>
              </View>

            </View>

            {/* Quick Digital Prescription Action */}
            <View style={styles.prescriptionSection}>
              <Text style={styles.sectionHeading}>Clinical Actions</Text>
              <TouchableOpacity style={styles.eRxButton}>
                <Text style={styles.eRxButtonText}>📝 Issue Digital e-Prescription</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.labOrderButton}>
                <Text style={styles.labOrderButtonText}>🧪 Order Anomaly / Doppler Scan</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.telemetryFooter}>
              📡 Live BLE Telemetry Stream Synced • {liveVitals.recordedAt}
            </Text>
          </ScrollView>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', flexDirection: 'row' },
  videoStage: { flex: 1, position: 'relative' },
  remoteVideoBox: {
    flex: 1,
    backgroundColor: '#1C1917',
    alignItems: 'center',
    justifyContent: 'center'
  },
  videoPlaceholderText: { color: '#E7E5E4', fontSize: 16, fontWeight: '600' },
  networkBadge: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  networkBadgeText: { color: '#4ADE80', fontSize: 12, fontWeight: '700' },
  localPipBox: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 100,
    height: 140,
    backgroundColor: '#292524',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  pipText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  controlsBar: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16
  },
  controlBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  controlBtnActive: { backgroundColor: '#DC2626' },
  controlIcon: { fontSize: 22 },
  endCallBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 24,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center'
  },
  endCallText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  vitalsToggleBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center'
  },
  vitalsToggleText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  drawerContainer: {
    width: DRAWER_WIDTH,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    zIndex: 100
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderColor: '#F0ECE6'
  },
  drawerTitle: { fontSize: 17, fontWeight: '800', color: '#2D2723' },
  drawerSub: { fontSize: 13, color: '#706760', marginTop: 2 },
  closeDrawerBtn: { padding: 8 },
  closeDrawerText: { fontSize: 18, fontWeight: '700', color: '#78716C' },
  drawerBody: { flex: 1, padding: 16 },
  vitalsGrid: { gap: 12 },
  vitalCard: {
    backgroundColor: '#FAFAF8',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E7E2DA'
  },
  vitalLabel: { fontSize: 12, fontWeight: '700', color: '#78716C' },
  vitalValue: { fontSize: 24, fontWeight: '900', color: '#2D2723', marginVertical: 4 },
  vitalUnit: { fontSize: 13, fontWeight: '600', color: '#78716C' },
  vitalStatus: { fontSize: 11, fontWeight: '600', color: '#059669' },
  prescriptionSection: { marginTop: 20, gap: 10 },
  sectionHeading: { fontSize: 14, fontWeight: '800', color: '#2D2723' },
  eRxButton: {
    backgroundColor: '#2D2723',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center'
  },
  eRxButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  labOrderButton: {
    backgroundColor: '#F3EFEA',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center'
  },
  labOrderButtonText: { color: '#2D2723', fontWeight: '700', fontSize: 14 },
  telemetryFooter: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 40
  }
});
