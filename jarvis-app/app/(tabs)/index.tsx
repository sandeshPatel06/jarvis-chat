import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { Chat, useStore } from '@/store';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';

import { useAppTheme } from '@/hooks/useAppTheme';

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
      <View style={{ backgroundColor: isSelected ? colors.primary + '20' : 'transparent' }}>
        <Pressable
          onPress={() => handlePress(item.id)}
          onLongPress={() => handleLongPress(item.id)}
          delayLongPress={300}
          style={({ pressed }) => [
            styles.itemContainer,
            { opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
          ]}
        >
          {isSelectionMode && (
            <View style={{ marginRight: 10 }}>
              <FontAwesome name={isSelected ? "check-circle" : "circle-thin"} size={24} color={isSelected ? colors.primary : colors.text} />
            </View>
          )}
          <Image source={item.avatar ? { uri: item.avatar } : require('@/assets/images/default-avatar.png')} style={styles.avatar} />
          <View style={styles.contentContainer}>
            <View style={styles.headerRow}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.time}>{formatTime(item.lastMessageTime)}</Text>
            </View>
            <View style={styles.messageRow}>
              <Text numberOfLines={1} style={styles.message}>
                {item.lastMessage}
              </Text>
              {item.unreadCount > 0 && (
                <LinearGradient
                  colors={[Colors.dark.primary, Colors.dark.secondary]}
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
        <View style={styles.separator} />
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
      <View style={[styles.header, { borderBottomColor: colors.itemSeparator }]}>
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
            <Text style={[styles.headerTitle, { color: colors.text }]}>Chats</Text>
            <TouchableOpacity onPress={toggleSearch} style={styles.headerIcon}>
              <FontAwesome name="search" size={24} color={colors.text} />
            </TouchableOpacity>
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
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/contacts/select')}
      >
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          style={styles.fabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <FontAwesome name="comment" size={24} color="white" />
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
    height: 60,
    justifyContent: 'center',
    paddingHorizontal: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 18,
    marginLeft: 15,
    marginRight: 10,
  },
  listContent: {
    paddingTop: 10,
  },
  itemContainer: {
    flexDirection: 'row',
    padding: 15,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    borderWidth: 2,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    backgroundColor: 'transparent',
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  time: {
    fontSize: 12,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  message: {
    fontSize: 14,
    flex: 1,
    marginRight: 10,
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 90,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
