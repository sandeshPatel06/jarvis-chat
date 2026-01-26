import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text, View } from '@/components/Themed';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useStore } from '@/store';
import { getMediaUrl } from '@/utils/media';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { FlatList, Image, StyleSheet, TouchableOpacity } from 'react-native';

export default function CallsScreen() {
  const { colors, isDark } = useAppTheme();
  const router = useRouter();
  const { calls, fetchCalls, startCall, user } = useStore();

  useEffect(() => {
    fetchCalls();
  }, []);

  const handleCall = (username: string, isVideo: boolean = false) => {
    // For now simple redial. Ideally we resolve Chat ID from username or store it. 
    // Simplified: assuming we can find a chat with this name.
    const chat = useStore.getState().chats.find(c => c.name === username);
    if (chat) {
      startCall(chat.id, isVideo);
      router.push(`/call/${chat.id}`);
    } else {
      alert('Could not redial. Chat not found.');
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    // Determine if incoming or outgoing
    const isOutgoing = item.caller.username === user?.username;
    const otherParty = isOutgoing ? item.receiver : item.caller;
    const isMissed = item.status === 'missed';

    return (
      <TouchableOpacity style={styles.callItem} onPress={() => handleCall(otherParty.username, item.is_video)}>
        <Image
          source={getMediaUrl(otherParty.profile_picture) ? { uri: getMediaUrl(otherParty.profile_picture)! } : require('@/assets/images/default-avatar.png')}
          style={styles.avatar}
        />
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.text }]}>{otherParty.username}</Text>
          <View style={styles.detailsRow}>
            <MaterialIcons
              name={isOutgoing ? "call-made" : (isMissed ? "call-missed" : "call-received")}
              size={14}
              color={isMissed ? '#FF3B30' : (isOutgoing ? '#4CD964' : colors.primary)}
            />
            <Text style={[styles.time, { color: 'gray' }]}>
              {new Date(item.started_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => handleCall(otherParty.username, item.is_video)}>
          <FontAwesome name={item.is_video ? "video-camera" : "phone"} size={20} color={colors.primary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenWrapper style={styles.container}>
      <View style={[styles.header, { borderBottomColor: colors.itemSeparator }]}>
        {/* <Text style={[styles.headerTitle, { color: colors.text }]}>Calls</Text> */}
      </View>

      {calls.length === 0 ? (
        <View style={styles.emptyContent}>
          <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
            <FontAwesome name="phone" size={40} color={colors.tabIconDefault} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Recent Calls</Text>
          <Text style={styles.emptySubtitle}>Calls you make or receive will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={calls}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  callItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  time: {
    fontSize: 13,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'gray',
    textAlign: 'center',
    lineHeight: 20,
  },
});
