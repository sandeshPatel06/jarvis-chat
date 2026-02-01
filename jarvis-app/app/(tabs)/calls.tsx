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
import CallLogItem from '@/components/calls/CallLogItem';
import { useCallback } from 'react';

export default function CallsScreen() {
  const { colors, isDark } = useAppTheme();
  const router = useRouter();
  const { calls, fetchCalls, startCall, user } = useStore(useCallback((state) => ({
    calls: state.calls,
    fetchCalls: state.fetchCalls,
    startCall: state.startCall,
    user: state.user
  }), []));

  useEffect(() => {
    fetchCalls();
  }, []);

  const handleCall = useCallback((username: string, isVideo: boolean = false) => {
    const chat = useStore.getState().chats.find(c => c.name === username);
    if (chat) {
      startCall(chat.id, isVideo);
      router.push(`/call/${chat.id}`);
    } else {
      alert('Could not redial. Chat not found.');
    }
  }, [startCall, router]);

  const renderItem = useCallback(({ item }: { item: any }) => {
    return (
      <CallLogItem
        item={item}
        user={user}
        colors={colors}
        onPress={handleCall}
      />
    );
  }, [user, colors, handleCall]);

  return (
    <ScreenWrapper style={styles.container} edges={['left', 'right']} withExtraTopPadding={false}>

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
          getItemLayout={(_, index) => ({
            length: 74, // Approximate height of each item (50 avatar + 24 padding)
            offset: 74 * index,
            index,
          })}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
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
    paddingBottom: 120, // Enough room for floating tab bar
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
