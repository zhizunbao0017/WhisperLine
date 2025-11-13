import React, { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import CompanionAvatarItem from './CompanionAvatarItem';

const CompanionSelectorCarousel = ({ allCompanions = [], selectedIDs = [], onSelectionChange }) => {
  const router = useRouter();

  const handleToggle = useCallback(
    (id) => {
      if (!onSelectionChange) return;
      const stringId = String(id);
      const isAlreadySelected = selectedIDs.includes(stringId);
      let nextIDs;
      if (isAlreadySelected) {
        nextIDs = selectedIDs.filter((existingId) => existingId !== stringId);
      } else {
        nextIDs = [...selectedIDs, stringId];
      }
      const nextCompanions = allCompanions.filter((companion) => nextIDs.includes(String(companion.id)));
      onSelectionChange(nextCompanions);
    },
    [selectedIDs, allCompanions, onSelectionChange]
  );

  const renderItem = useCallback(
    ({ item }) => (
      <CompanionAvatarItem
        companion={item}
        isSelected={selectedIDs.includes(String(item.id))}
        onPress={() => handleToggle(item.id)}
      />
    ),
    [selectedIDs, handleToggle]
  );

  const keyExtractor = useCallback((item) => String(item.id), []);

  const renderFooter = () => (
    <Pressable
      onPress={() => router.push('/companions')}
      style={({ pressed }) => [styles.addContainer, pressed && styles.addContainerPressed]}
      accessibilityRole="button"
      accessibilityLabel="Create new companion"
    >
      <View style={styles.addAvatar}>
        <Text style={styles.addAvatarText}>+</Text>
      </View>
      <Text style={styles.addLabel} numberOfLines={1}>
        New
      </Text>
    </Pressable>
  );

  return (
    <FlatList
      data={allCompanions}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
      ListFooterComponent={renderFooter}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 4,
  },
  addContainer: {
    width: 78,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  addContainerPressed: {
    opacity: 0.8,
  },
  addAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EFEFF7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D0D3FF',
  },
  addAvatarText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#4A6CF7',
  },
  addLabel: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '500',
    color: '#4A6CF7',
  },
});

export default CompanionSelectorCarousel;

