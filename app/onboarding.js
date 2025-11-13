import React, { useContext, useEffect, useMemo, useState } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import { CompanionContext } from '../context/CompanionContext';
import CompanionSelectorCarousel from '../components/CompanionSelectorCarousel';
import { useTheme } from '@react-navigation/native';

const OnboardingScreen = () => {
  const router = useRouter();
  const { companions, addCompanion, isLoading } = useContext(CompanionContext);
  const { colors } = useTheme();

  const [selectedCompanionIDs, setSelectedCompanionIDs] = useState([]);
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [newCompanionName, setNewCompanionName] = useState('');
  const [newCompanionAvatar, setNewCompanionAvatar] = useState(null);
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    (async () => {
      const storedPrimary = await AsyncStorage.getItem('primaryCompanionID');
      if (storedPrimary && storedPrimary !== 'null' && storedPrimary !== 'undefined') {
        setSelectedCompanionIDs([String(storedPrimary)]);
      }
    })();
  }, []);

  const handleCompanionSelectionChange = (selectedCompanions = []) => {
    if (!selectedCompanions.length) {
      setSelectedCompanionIDs([]);
      return;
    }
    const primary = selectedCompanions[selectedCompanions.length - 1];
    setSelectedCompanionIDs([String(primary.id)]);
  };

  const handleOpenImagePicker = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Allow photo access to choose an avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setNewCompanionAvatar(result.assets[0].uri);
    }
  };

  const resetCreateModal = () => {
    setNewCompanionName('');
    setNewCompanionAvatar(null);
  };

  const handleCreateCompanion = async () => {
    if (!newCompanionName.trim()) {
      Alert.alert('Name required', 'Please enter a name for your companion.');
      return;
    }

    try {
      const created = await addCompanion({
        name: newCompanionName.trim(),
        avatarIdentifier: newCompanionAvatar || '',
      });
      setSelectedCompanionIDs([String(created.id)]);
      setCreateModalVisible(false);
      resetCreateModal();
    } catch (error) {
      console.error('Failed to create companion', error);
      Alert.alert('Error', 'Unable to create companion. Please try again.');
    }
  };

  const companionsData = useMemo(() => companions || [], [companions]);

  const handleCompleteOnboarding = async () => {
    if (!selectedCompanionIDs.length) {
      Alert.alert('Select a companion', 'Please select your primary companion to continue.');
      return;
    }
    setIsCompleting(true);
    try {
      const primaryId = String(selectedCompanionIDs[0]);
      await AsyncStorage.multiSet([
        ['primaryCompanionID', primaryId],
        ['hasCompletedOnboarding', 'true'],
      ]);
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Failed to complete onboarding', error);
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
      await AsyncStorage.removeItem('primaryCompanionID');
      await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Failed to skip onboarding', error);
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
              selectedIDs={selectedCompanionIDs}
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
                backgroundColor: selectedCompanionIDs.length ? colors.primary : colors.border,
              },
            ]}
            disabled={!selectedCompanionIDs.length || isCompleting}
            onPress={handleCompleteOnboarding}
          >
            {isCompleting && selectedCompanionIDs.length ? (
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
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.primary }]}
              onPress={handleOpenImagePicker}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
                {newCompanionAvatar ? 'Change Avatar' : 'Pick Optional Avatar'}
              </Text>
            </TouchableOpacity>
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
              >
                <Text style={styles.primaryButtonText}>Save</Text>
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

