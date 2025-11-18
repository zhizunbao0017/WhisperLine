import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useUserState } from '../context/UserStateContext';
import MediaService from '../services/MediaService';
import CompanionSelectorCarousel from '../components/CompanionSelectorCarousel';
import { useTheme } from '@react-navigation/native';

const OnboardingScreen = () => {
  const router = useRouter();
  const { colors } = useTheme();
  
  // Get global state management functions
  const { 
    userState, 
    addCompanion, // Use authoritative factory function
    updateCompanion, 
    setPrimaryCompanion,
    isLoading 
  } = useUserState();

  // Get companions from global state
  const companions = useMemo(() => {
    return Object.values(userState?.companions || {});
  }, [userState?.companions]);

  // Local UI state only
  const [selectedCompanionId, setSelectedCompanionId] = useState(null);
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [newCompanionName, setNewCompanionName] = useState('');
  const [isCreatingCompanion, setIsCreatingCompanion] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Load existing primary companion on mount
  useEffect(() => {
    (async () => {
      try {
        const storedPrimary = await AsyncStorage.getItem('primaryCompanionID');
        if (storedPrimary && storedPrimary !== 'null' && storedPrimary !== 'undefined') {
          setSelectedCompanionId(String(storedPrimary));
        }
      } catch (error) {
        console.warn('Failed to load primary companion:', error);
      }
    })();
  }, []);

  const handleCompanionSelectionChange = (selectedCompanions = []) => {
    if (!selectedCompanions.length) {
      setSelectedCompanionId(null);
      return;
    }
    const primary = selectedCompanions[selectedCompanions.length - 1];
    setSelectedCompanionId(String(primary.id));
  };

  const handleAvatarPick = async (companionId) => {
    try {
      // CRITICAL: Validate companion exists
      if (!companionId) {
        console.warn('[OnboardingScreen] ⚠️ Cannot change avatar: companionId is null');
        Alert.alert('Error', 'Please create the companion first before adding an avatar.');
        return;
      }

      // Get the current companion from global state
      const currentCompanion = userState?.companions?.[companionId];
      if (!currentCompanion) {
        Alert.alert('Error', 'Companion not found.');
        return;
      }

      // CRITICAL: Use standard update flow - same as ManageCompanionsScreen
      // MediaService handles image selection and storage, returns complete updated companion
      const updatedCompanion = await MediaService.assignCompanionImage(
        companionId,
        null, // sourceUri = null means we want to pick from library
        currentCompanion
      );

      if (updatedCompanion) {
        // Immediately update global state with the new companion object
        await updateCompanion(updatedCompanion);
        console.log('[OnboardingScreen] ✅ Avatar updated successfully:', {
          id: updatedCompanion.id,
          name: updatedCompanion.name,
          hasAvatar: !!updatedCompanion.avatar,
        });
      } else {
        console.log('[OnboardingScreen] Avatar selection cancelled or failed');
      }
    } catch (error) {
      console.error('[OnboardingScreen] ❌ Failed to update avatar:', error);
      Alert.alert('Error', 'Failed to update avatar. Please try again.');
    }
  };

  const resetCreateModal = () => {
    setNewCompanionName('');
  };

  const handleCreateCompanion = async () => {
    if (!newCompanionName.trim()) {
      Alert.alert('Name required', 'Please enter a name for your companion.');
      return;
    }

    setIsCreatingCompanion(true);
    try {
      // CRITICAL: Use authoritative addCompanion factory function
      // This creates the companion atomically with a default avatar
      const newCompanion = await addCompanion(newCompanionName.trim());
      
      console.log('[OnboardingScreen] ✅ Created companion:', {
        id: newCompanion.id,
        name: newCompanion.name,
        hasDefaultAvatar: !!newCompanion.avatar,
      });
      
      // Automatically select the newly created companion
      setSelectedCompanionId(newCompanion.id);
      
      setCreateModalVisible(false);
      resetCreateModal();
    } catch (error) {
      console.error('[OnboardingScreen] ❌ Failed to create companion:', error);
      Alert.alert('Error', 'Unable to create companion. Please try again.');
    } finally {
      setIsCreatingCompanion(false);
    }
  };

  const companionsData = useMemo(() => companions || [], [companions]);

  const handleCompleteOnboarding = async () => {
    if (!selectedCompanionId) {
      Alert.alert('Select a companion', 'Please select your primary companion to continue.');
      return;
    }
    setIsCompleting(true);
    try {
      // Set primary companion using global service
      await setPrimaryCompanion(selectedCompanionId);
      
      // Mark onboarding as complete
      await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
      
      // Navigate to main app
      router.replace('/(tabs)');
    } catch (error) {
      console.error('[OnboardingScreen] Failed to complete onboarding:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleSkipOnboarding = async () => {
    if (isCompleting) {
      return;
    }
    setIsCompleting(true);
    try {
      // Clear primary companion using global service
      await setPrimaryCompanion(null);
      
      // Mark onboarding as complete
      await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
      
      // Navigate to main app
      router.replace('/(tabs)');
    } catch (error) {
      console.error('[OnboardingScreen] Failed to skip onboarding:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>Welcome to WhisperLine</Text>
          <TouchableOpacity
            onPress={handleSkipOnboarding}
            style={[styles.skipLink]}
            disabled={isCompleting}
          >
            <Text style={[styles.skipLinkText, { color: colors.primary, opacity: isCompleting ? 0.5 : 1 }]}>
              Skip for now
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.subtitle, { color: colors.text }]}>
          Create your first companion now or skip and do it later from Settings.
        </Text>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Primary Companion</Text>
            <TouchableOpacity
              style={[styles.addButton, { borderColor: colors.primary }]}
              onPress={() => setCreateModalVisible(true)}
            >
              <Text style={{ color: colors.primary, fontWeight: '600' }}>New Companion</Text>
            </TouchableOpacity>
          </View>
          {companionsData.length === 0 ? (
            <View style={[styles.emptyState, { borderColor: colors.border }]}>
              <Text style={{ color: colors.text, marginBottom: 12 }}>No companions yet.</Text>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                onPress={() => setCreateModalVisible(true)}
              >
                <Text style={styles.primaryButtonText}>Create Companion</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <CompanionSelectorCarousel
              allCompanions={companionsData}
              selectedIDs={selectedCompanionId ? [selectedCompanionId] : []}
              onSelectionChange={handleCompanionSelectionChange}
            />
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.card }]}>
        <View style={styles.footerButtons}>
          <TouchableOpacity
            style={[styles.skipButton, { borderColor: colors.border }]}
            onPress={handleSkipOnboarding}
            disabled={isCompleting}
          >
            <Text style={[styles.skipButtonText, { color: colors.text, opacity: isCompleting ? 0.5 : 1 }]}>
              Skip for now
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              {
                backgroundColor: selectedCompanionId ? colors.primary : colors.border,
              },
            ]}
            disabled={!selectedCompanionId || isCompleting}
            onPress={handleCompleteOnboarding}
          >
            {isCompleting && selectedCompanionId ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={isCreateModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setCreateModalVisible(false);
          resetCreateModal();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Create Companion</Text>
            <TextInput
              value={newCompanionName}
              onChangeText={setNewCompanionName}
              placeholder="Companion name"
              placeholderTextColor={colors.border}
              style={[styles.modalInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
            />
            <Text style={[styles.modalHint, { color: colors.text }]}>
              You can set an avatar after creating the companion by tapping on it.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.border }]}
                onPress={() => {
                  setCreateModalVisible(false);
                  resetCreateModal();
                }}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                onPress={handleCreateCompanion}
                disabled={isCreatingCompanion}
              >
                {isCreatingCompanion ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  skipLink: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skipLinkText: {
    fontSize: 15,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  addButton: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  emptyState: {
    padding: 24,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 24,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  footerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  skipButton: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalHint: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
  secondaryButton: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    marginBottom: 16,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default OnboardingScreen;

