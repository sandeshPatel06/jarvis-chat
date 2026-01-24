import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useStore } from '@/store';
import { Chat } from '@/types';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, TextInput, TouchableOpacity, Alert, LayoutAnimation } from 'react-native';

import { useAppTheme } from '@/hooks/useAppTheme';
import { getMediaUrl } from '@/utils/media';

export default function ChatsScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const chats = useStore((state) => state.chats);
  const fetchChats = useStore((state) => state.fetchChats);
  const deleteChats = useStore((state) => state.deleteChats);
  const user = useStore((state) => state.user);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const animationsEnabled = useStore((state) => state.animationsEnabled);

  useEffect(() => {
    if (animationsEnabled) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  }, [searchQuery, isSelectionMode, chats, animationsEnabled]);

  useEffect(() => {
    if (user) {
      fetchChats();
    }
  }, [user]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleLongPress = (chatId: string) => {
    setIsSelectionMode(true);
    setSelectedChats(new Set([chatId]));
  };

  const handlePress = (chatId: string) => {
    if (isSelectionMode) {
      const newSelected = new Set(selectedChats);
      if (newSelected.has(chatId)) {
        newSelected.delete(chatId);
        if (newSelected.size === 0) {
          setIsSelectionMode(false);
        }
      } else {
        newSelected.add(chatId);
      }
      setSelectedChats(newSelected);
    } else {
      router.push(`/chat/${chatId}`);
    }
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedChats(new Set());
  };

  const handleDeleteSelected = () => {
    const ids = Array.from(selectedChats);
    Alert.alert(
      "Delete Chats",
      `Are you sure you want to delete ${ids.length} chats?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive", onPress: () => {
            deleteChats(ids);
            setIsSelectionMode(false);
            setSelectedChats(new Set());
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: Chat }) => {
    const isSelected = selectedChats.has(item.id);
    return (
      <View style={{ paddingHorizontal: 15 }}>
        <Pressable
          onPress={() => handlePress(item.id)}
          onLongPress={() => handleLongPress(item.id)}
          delayLongPress={300}
          style={({ pressed }) => [
            styles.itemContainer,
            {
              backgroundColor: isSelected ? colors.primary + '20' : colors.inputBackground, // Card background
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
              borderRadius: 20, // Rounded Corners
            }
          ]}
        >
          {isSelectionMode && (
            <View style={{ marginRight: 10 }}>
              <FontAwesome name={isSelected ? "check-circle" : "circle-thin"} size={24} color={isSelected ? colors.primary : colors.text} />
            </View>
          )}
          <Image
            source={getMediaUrl(item.avatar) ? { uri: getMediaUrl(item.avatar)! } : require('@/assets/images/default-avatar.png')}
            style={styles.avatar}
          />
          <View style={styles.contentContainer}>
            <View style={styles.headerRow}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[styles.time, { color: colors.tabIconDefault }]}>{formatTime(item.lastMessageTime)}</Text>
            </View>
            <View style={styles.messageRow}>
              <Text numberOfLines={1} style={[styles.message, { color: colors.text, opacity: 0.7 }]}>
                {item.lastMessage}
              </Text>
              {item.unreadCount > 0 && (
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  style={styles.unreadBadge}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.unreadText}>{item.unreadCount}</Text>
                </LinearGradient>
              )}
            </View>
          </View>
        </Pressable>
      </View>
    )
  };

  const [isSearching, setIsSearching] = useState(false);

  const toggleSearch = () => {
    setIsSearching(!isSearching);
    if (isSearching) {
      setSearchQuery('');
    }
  };

  return (
    <ScreenWrapper style={styles.container}>

      {/* Custom Header with Toggle Search or Selection Mode */}
      <View style={[styles.header, { borderBottomColor: 'transparent' }]}>
        {isSelectionMode ? (
          <View style={styles.headerTitleContainer}>
            <TouchableOpacity onPress={handleCancelSelection} style={styles.headerIcon}>
              <FontAwesome name="times" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text, fontSize: 20 }]}>{selectedChats.size} Selected</Text>
            <TouchableOpacity onPress={handleDeleteSelected} style={styles.headerIcon}>
              <FontAwesome name="trash" size={24} color="red" />
            </TouchableOpacity>
          </View>
        ) : !isSearching ? (
          <View style={styles.headerTitleContainer}>
            {/* Modern Large Title is handled by _layout, we can keep this empty or just show search icon if needed, 
                 but _layout has search icon. Let's effectively hide this custom header or merge it. 
                 Since _layout provides the header, we might just want to use the list content. 
                 However, the code has a custom header inside the screen. 
                 Let's keep the custom header logic for Selection Mode, but hide the default "Chats" title if _layout shows it.
                 Actually, the previous _layout had headerShown: true. 
                 Let's simplify: removing the "Chats" title from here since it's in the navigation header now.
             */}
            <View />
          </View>
        ) : (
          <View style={styles.headerSearchContainer}>
            <TouchableOpacity onPress={toggleSearch} style={styles.headerIcon}>
              <FontAwesome name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <TextInput
              style={[styles.headerSearchInput, { color: colors.text }]}
              placeholder="Search..."
              placeholderTextColor={colors.text + '80'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.headerIcon}>
                <FontAwesome name="times" size={20} color={colors.text} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <FlatList
        data={filteredChats}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/contacts/select')}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          style={styles.fabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <FontAwesome name="plus" size={24} color="white" />
        </LinearGradient>
      </TouchableOpacity>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    justifyContent: 'center',
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 15,
    padding: 10,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerIcon: {
    padding: 5,
  },
  headerSearchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
    marginRight: 10,
  },
  listContent: {
    paddingTop: 10,
    paddingBottom: 100, // Space for FAB
  },
  itemContainer: {
    flexDirection: 'row',
    padding: 15,
    alignItems: 'center',
    // shadowColor: "#000",
    // shadowOffset: {
    // 	width: 0,
    // 	height: 1,
    // },
    // shadowOpacity: 0.05,
    // shadowRadius: 2,
    // elevation: 1,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginRight: 15,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
  },
  time: {
    fontSize: 12,
    fontWeight: '500',
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  message: {
    fontSize: 15,
    flex: 1,
    marginRight: 10,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: 'white',
  },
  separator: {
    display: 'none', // Remove separator
  },
  fab: {
    position: 'absolute',
    bottom: 90, // Above tab bar
    right: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
