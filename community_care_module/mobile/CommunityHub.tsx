import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Modal,
  Alert
} from 'react-native';

interface ForumPost {
  id: string;
  author: string;
  authorTag: string;
  trimester: string;
  title: string;
  body: string;
  upvotes: number;
  repliesCount: number;
  timeAgo: string;
}

interface CareTeamMember {
  id: string;
  name: string;
  role: string;
  roleBadgeColor: string;
  badgeLabel: string;
  status: 'online' | 'in_consultation' | 'offline';
  avatarEmoji: string;
}

export const CommunityHub: React.FC<{
  onOpenConsult: () => void;
  onOpenChat: (channelId: string) => void;
  onTriggerSOS: () => void;
}> = ({ onOpenConsult, onOpenChat, onTriggerSOS }) => {
  const [activeTab, setActiveTab] = useState<'peer_forum' | 'expert_qa' | 'care_team'>('peer_forum');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAskModal, setShowAskModal] = useState(false);

  // Sample Peer Support Forum Threads
  const forumPosts: ForumPost[] = [
    {
      id: 'p1',
      author: 'Pooja R.',
      authorTag: 'First Time Mom • 24 Weeks',
      trimester: 'Trimester 2',
      title: 'How are you dealing with mild lower backache during sleep?',
      body: 'I tried sleeping on my left side with a pillow between my knees and it really helped relieve hip pressure!',
      upvotes: 42,
      repliesCount: 18,
      timeAgo: '2h ago'
    },
    {
      id: 'p2',
      author: 'Ananya S.',
      authorTag: 'Mother of 2 • 34 Weeks',
      trimester: 'Trimester 3',
      title: 'Hospital bag packing checklist: What did you actually use?',
      body: 'Nursing bras, loose cotton nightgowns, warm socks, and baby swaddle blankets were absolute lifesavers.',
      upvotes: 89,
      repliesCount: 34,
      timeAgo: '5h ago'
    }
  ];

  // Assigned Multi-Disciplinary Care Team
  const careTeam: CareTeamMember[] = [
    {
      id: 'ct1',
      name: 'Dr. Maya Sharma, MD',
      role: 'Lead Gynecologist & Obstetrician',
      roleBadgeColor: '#059669',
      badgeLabel: 'VERIFIED MD',
      status: 'online',
      avatarEmoji: '👩‍⚕️'
    },
    {
      id: 'ct2',
      name: 'Ritu Sen, RD',
      role: 'Clinical Maternal Nutritionist',
      roleBadgeColor: '#D97706',
      badgeLabel: 'NUTRITIONIST',
      status: 'online',
      avatarEmoji: '🥗'
    },
    {
      id: 'ct3',
      name: 'Sunita Devi',
      role: 'Community ASHA Health Coordinator',
      roleBadgeColor: '#7C3AED',
      badgeLabel: 'ASHA NGO',
      status: 'offline',
      avatarEmoji: '🤝'
    }
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>MaaCare Community</Text>
          <Text style={styles.headerSubtitle}>Peer support, verified doctors &amp; your care circle</Text>
        </View>
        <TouchableOpacity style={styles.sosButton} onPress={onTriggerSOS}>
          <Text style={styles.sosButtonText}>🚨 SOS</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'peer_forum' && styles.tabButtonActive]}
          onPress={() => setActiveTab('peer_forum')}
        >
          <Text style={[styles.tabText, activeTab === 'peer_forum' && styles.tabTextActive]}>
            💬 Peer Forums
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'expert_qa' && styles.tabButtonActive]}
          onPress={() => setActiveTab('expert_qa')}
        >
          <Text style={[styles.tabText, activeTab === 'expert_qa' && styles.tabTextActive]}>
            🩺 Expert Q&amp;A
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'care_team' && styles.tabButtonActive]}
          onPress={() => setActiveTab('care_team')}
        >
          <Text style={[styles.tabText, activeTab === 'care_team' && styles.tabTextActive]}>
            👥 Care Team
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content Rendering */}
      <View style={styles.content}>
        {activeTab === 'peer_forum' && (
          <FlatList
            data={forumPosts}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.forumCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.authorName}>{item.author}</Text>
                    <Text style={styles.authorTag}>{item.authorTag}</Text>
                  </View>
                  <Text style={styles.trimesterBadge}>{item.trimester}</Text>
                </View>

                <Text style={styles.postTitle}>{item.title}</Text>
                <Text style={styles.postBody}>{item.body}</Text>

                <View style={styles.cardFooter}>
                  <Text style={styles.footerStat}>❤️ {item.upvotes} Upvotes</Text>
                  <Text style={styles.footerStat}>💭 {item.repliesCount} Replies</Text>
                  <Text style={styles.footerStat}>{item.timeAgo}</Text>
                </View>
              </View>
            )}
          />
        )}

        {activeTab === 'expert_qa' && (
          <View style={styles.expertContainer}>
            <TouchableOpacity style={styles.askDoctorBtn} onPress={() => setShowAskModal(true)}>
              <Text style={styles.askDoctorBtnText}>+ Ask Verified Doctor or Dietitian</Text>
            </TouchableOpacity>

            <View style={styles.expertQaCard}>
              <View style={styles.verifiedHeader}>
                <Text style={styles.doctorName}>Dr. Maya Sharma (OB-GYN)</Text>
                <View style={styles.badgePill}>
                  <Text style={styles.badgePillText}>✓ Verified MD</Text>
                </View>
              </View>
              <Text style={styles.qaQuestion}>Q: Can I take Iron and Calcium tablets together?</Text>
              <Text style={styles.qaAnswer}>
                A: It is best to maintain at least a 2-hour gap between Iron and Calcium supplements, as Calcium can inhibit Iron absorption.
              </Text>
            </View>
          </View>
        )}

        {activeTab === 'care_team' && (
          <View style={styles.careTeamContainer}>
            <Text style={styles.sectionHeader}>Your Multi-Disciplinary Care Circle</Text>
            {careTeam.map(member => (
              <View key={member.id} style={styles.memberCard}>
                <View style={styles.memberAvatarBox}>
                  <Text style={styles.memberAvatar}>{member.avatarEmoji}</Text>
                </View>
                <View style={styles.memberInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <View style={[styles.roleBadge, { backgroundColor: member.roleBadgeColor }]}>
                      <Text style={styles.roleBadgeText}>{member.badgeLabel}</Text>
                    </View>
                  </View>
                  <Text style={styles.memberRole}>{member.role}</Text>
                </View>
                <TouchableOpacity
                  style={styles.chatActionBtn}
                  onPress={() => onOpenChat(member.id)}
                >
                  <Text style={styles.chatActionBtnText}>Chat</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={styles.startConsultBtn} onPress={onOpenConsult}>
              <Text style={styles.startConsultBtnText}>📹 Launch Tele-Consultation Call</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FBF9F5' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#F0ECE6'
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#2D2723' },
  headerSubtitle: { fontSize: 13, color: '#706760', marginTop: 2 },
  sosButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#DC2626',
    shadowOpacity: 0.35,
    shadowRadius: 8
  },
  sosButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#EAE6DF',
    margin: 16,
    borderRadius: 28,
    padding: 4
  },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 24 },
  tabButtonActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4 },
  tabText: { fontSize: 13, fontWeight: '700', color: '#78716C' },
  tabTextActive: { color: '#2D2723' },
  content: { flex: 1, paddingHorizontal: 16 },
  forumCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F0ECE6'
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  authorName: { fontSize: 15, fontWeight: '700', color: '#2D2723' },
  authorTag: { fontSize: 12, color: '#9E958E' },
  trimesterBadge: {
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: '#E0F2FE',
    color: '#0369A1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  postTitle: { fontSize: 16, fontWeight: '700', color: '#2D2723', marginBottom: 6 },
  postBody: { fontSize: 14, color: '#5C524A', lineHeight: 20 },
  cardFooter: { flexDirection: 'row', gap: 16, marginTop: 14, borderTopWidth: 1, borderColor: '#F5F2EC', paddingTop: 10 },
  footerStat: { fontSize: 12, color: '#706760', fontWeight: '600' },
  expertContainer: { flex: 1 },
  askDoctorBtn: {
    backgroundColor: '#2D2723',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16
  },
  askDoctorBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  expertQaCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#F0ECE6' },
  verifiedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  doctorName: { fontSize: 15, fontWeight: '700', color: '#2D2723' },
  badgePill: { backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  badgePillText: { fontSize: 11, fontWeight: '700', color: '#065F46' },
  qaQuestion: { fontSize: 15, fontWeight: '700', color: '#2D2723', marginBottom: 6 },
  qaAnswer: { fontSize: 14, color: '#5C524A', lineHeight: 20 },
  careTeamContainer: { flex: 1 },
  sectionHeader: { fontSize: 16, fontWeight: '800', color: '#2D2723', marginBottom: 12 },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0ECE6'
  },
  memberAvatarBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3EFEA', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  memberAvatar: { fontSize: 22 },
  memberInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberName: { fontSize: 15, fontWeight: '700', color: '#2D2723' },
  roleBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  roleBadgeText: { fontSize: 9, fontWeight: '800', color: '#FFFFFF' },
  memberRole: { fontSize: 12, color: '#706760', marginTop: 2 },
  chatActionBtn: { backgroundColor: '#E07A5F', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14 },
  chatActionBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  startConsultBtn: {
    backgroundColor: '#065F46',
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 16
  },
  startConsultBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 }
});
