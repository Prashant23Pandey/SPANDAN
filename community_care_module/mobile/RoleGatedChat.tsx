import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { ChannelMessagePayload, UserRole } from '../server/src/types';

export const RoleGatedChat: React.FC<{
  channelTitle: string;
  currentUserRole: UserRole;
  currentUserId: string;
  onBack: () => void;
}> = ({ channelTitle, currentUserRole, currentUserId, onBack }) => {
  const [inputText, setInputText] = useState('');
  const [selectedLang, setSelectedLang] = useState<'en' | 'hi' | 'bn' | 'te'>('en');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);

  const [messages, setMessages] = useState<ChannelMessagePayload[]>([
    {
      id: 'm1',
      channelId: 'care_team_1',
      senderId: 'dr_maya',
      senderName: 'Dr. Maya Sharma',
      senderRole: 'gynecologist',
      senderBadge: true,
      messageType: 'text',
      encryptedPayload: 'Your Anomaly Scan looks reassuring. Fetal growth is consistent with 24 weeks.',
      originalLanguage: 'en',
      translations: {
        hi: 'आपका अनोमली स्कैन बहुत अच्छा है। भ्रूण का विकास 24 सप्ताह के अनुसार बिल्कुल सामान्य है।',
        bn: 'আপনার অসঙ্গতি স্ক্যান সন্তোষজনক। ভ্রূণের বৃদ্ধি ২৪ সপ্তাহের সাথে সামঞ্জস্যপূর্ণ।'
      },
      createdAt: '10:30 AM'
    },
    {
      id: 'm2',
      channelId: 'care_team_1',
      senderId: 'asha_sunita',
      senderName: 'Sunita Devi',
      senderRole: 'asha_worker',
      senderBadge: true,
      messageType: 'audio_voice_note',
      encryptedPayload: 'Voice note: Local PHC TT booster schedule confirmed for Tuesday.',
      durationSeconds: 18,
      originalLanguage: 'hi',
      createdAt: '10:34 AM'
    }
  ]);

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const newMsg: ChannelMessagePayload = {
      id: `msg_${Date.now()}`,
      channelId: 'care_team_1',
      senderId: currentUserId,
      senderName: currentUserRole === 'pregnant_mother' ? 'Sarah (Mom)' : 'David (Partner)',
      senderRole: currentUserRole,
      senderBadge: false,
      messageType: 'text',
      encryptedPayload: inputText,
      originalLanguage: selectedLang,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages([...messages, newMsg]);
    setInputText('');
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'gynecologist':
        return { label: '✓ Dr. OB-GYN', bg: '#D1FAE5', text: '#065F46' };
      case 'nutritionist':
        return { label: '✓ Dietitian', bg: '#FEF3C7', text: '#92400E' };
      case 'asha_worker':
        return { label: '✓ ASHA Worker', bg: '#EDE9FE', text: '#5B21B6' };
      case 'hospital_admin':
        return { label: '✓ Hospital Desk', bg: '#E0F2FE', text: '#0369A1' };
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Chat Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>{channelTitle}</Text>
            <Text style={styles.headerSub}>End-to-End Encrypted (AES-256) • DISHA Compliant</Text>
          </View>

          {/* Regional Translation Pill Switcher */}
          <View style={styles.langPill}>
            <TouchableOpacity onPress={() => setSelectedLang(selectedLang === 'en' ? 'hi' : 'en')}>
              <Text style={styles.langPillText}>🌐 {selectedLang.toUpperCase()}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Message Thread */}
        <FlatList
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messageList}
          renderItem={({ item }) => {
            const isMe = item.senderId === currentUserId;
            const badge = getRoleBadge(item.senderRole);
            const displayText = item.translations && item.translations[selectedLang]
              ? item.translations[selectedLang]
              : item.encryptedPayload;

            return (
              <View style={[styles.msgWrapper, isMe ? styles.msgWrapperMe : styles.msgWrapperOther]}>
                {!isMe && (
                  <View style={styles.senderHeader}>
                    <Text style={styles.senderName}>{item.senderName}</Text>
                    {badge && (
                      <View style={[styles.roleBadgeBox, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.roleBadgeText, { color: badge.text }]}>
                          {badge.label}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                  {item.messageType === 'audio_voice_note' ? (
                    <View style={styles.voiceNoteBox}>
                      <Text style={styles.playIcon}>▶️</Text>
                      <View style={styles.waveform}>
                        <Text style={styles.voiceDuration}>
                          Voice Note • {item.durationSeconds || 15}s
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <Text style={[styles.msgText, isMe && styles.msgTextMe]}>
                      {displayText}
                    </Text>
                  )}
                  <Text style={[styles.timeText, isMe && styles.timeTextMe]}>
                    {item.createdAt}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        {/* Composer Bar */}
        <View style={styles.composerBar}>
          <TouchableOpacity style={styles.attachBtn}>
            <Text style={styles.attachIcon}>📎</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder={`Message care team in ${selectedLang.toUpperCase()}...`}
            placeholderTextColor="#9CA3AF"
          />

          <TouchableOpacity
            style={[styles.micBtn, isRecordingVoice && styles.micBtnRecording]}
            onPress={() => setIsRecordingVoice(!isRecordingVoice)}
          >
            <Text style={styles.micIcon}>{isRecordingVoice ? '⏹️' : '🎙️'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sendBtn} onPress={handleSendMessage}>
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FBF9F5' },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#F0ECE6'
  },
  backBtn: { paddingRight: 12 },
  backText: { fontSize: 28, fontWeight: '700', color: '#2D2723' },
  headerTitleWrap: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#2D2723' },
  headerSub: { fontSize: 11, color: '#059669', fontWeight: '600' },
  langPill: {
    backgroundColor: '#F3EFEA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14
  },
  langPillText: { fontSize: 12, fontWeight: '800', color: '#2D2723' },
  messageList: { padding: 16, gap: 12 },
  msgWrapper: { maxWidth: '82%', marginBottom: 12 },
  msgWrapperMe: { alignSelf: 'flex-end' },
  msgWrapperOther: { alignSelf: 'flex-start' },
  senderHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  senderName: { fontSize: 12, fontWeight: '700', color: '#57534E' },
  roleBadgeBox: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  roleBadgeText: { fontSize: 9, fontWeight: '800' },
  bubble: { borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12 },
  bubbleMe: { backgroundColor: '#E07A5F', borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#F0ECE6' },
  msgText: { fontSize: 14, color: '#2D2723', lineHeight: 20 },
  msgTextMe: { color: '#FFFFFF' },
  timeText: { fontSize: 10, color: '#A8A29E', alignSelf: 'flex-end', marginTop: 4 },
  timeTextMe: { color: 'rgba(255,255,255,0.75)' },
  voiceNoteBox: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  playIcon: { fontSize: 20 },
  waveform: { flex: 1 },
  voiceDuration: { fontSize: 13, fontWeight: '700', color: '#2D2723' },
  composerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderColor: '#F0ECE6',
    gap: 8
  },
  attachBtn: { padding: 8 },
  attachIcon: { fontSize: 20 },
  textInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#FAFAF8',
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#2D2723',
    borderWidth: 1,
    borderColor: '#E7E2DA'
  },
  micBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3EFEA',
    alignItems: 'center',
    justifyContent: 'center'
  },
  micBtnRecording: { backgroundColor: '#DC2626' },
  micIcon: { fontSize: 18 },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E07A5F',
    alignItems: 'center',
    justifyContent: 'center'
  },
  sendIcon: { fontSize: 16, color: '#FFFFFF' }
});
