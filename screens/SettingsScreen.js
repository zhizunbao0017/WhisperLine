// screens/SettingsScreen.js
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import React, { useContext, useEffect, useState, useMemo } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    TouchableOpacity,
    View,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { SubscriptionContext } from '../context/SubscriptionContext';
import { ThemeContext } from '../context/ThemeContext';
import { AVATARS } from '../data/avatars';
import { CompanionContext } from '../context/CompanionContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CompanionSelectorCarousel from '../components/CompanionSelectorCarousel';
import { DiaryContext } from '../context/DiaryContext';
import { getThemeDefinition } from '@/constants/themes';
import { ThemedText as Text } from '../components/ThemedText';
import { useUserState } from '../context/UserStateContext';
import { exportService } from '../services/ExportService';

// Redesigned CustomAvatarButton
const CustomAvatarButton = ({
    colors,
    customUri,
    isSelected,
    onSelect,  // called when custom avatar is tapped & customUri exists
    onPick,    // called when picking/new image is needed
    isPro,
}) => {
    // Main press: call onSelect ONLY if customUri exists, else onPick
    const handleMainPress = () => {
        if (!isPro) {
            Alert.alert(
                'Upgrade to Pro',
                'Unlock custom companion avatars and other premium features!',
                [
                    { text: 'Cancel', style: 'cancel' },
                ]
            );
            return;
        }
        if (customUri) {
            onSelect && onSelect();
        } else {
            onPick && onPick();
        }
    };

    // Edit button always calls onPick
    const handleEditPress = () => {
        if (!isPro) {
            Alert.alert(
                'Upgrade to Pro',
                'Unlock custom companion avatars and other premium features!',
                [
                    { text: 'Cancel', style: 'cancel' },
                ]
            );
            return;
        }
        onPick && onPick();
    };

    return (
        <TouchableOpacity
            onPress={handleMainPress}
            activeOpacity={0.85}
            style={[
                styles.avatarTouchable,
                {
                    borderColor: isSelected ? colors.primary : colors.border,
                    backgroundColor: colors.card,
                },
            ]}
            accessibilityLabel="Set custom avatar"
        >
            {customUri ? (
                <Image source={{ uri: customUri }} style={styles.avatarImage} />
            ) : (
                <View style={[styles.plusAvatarCircle, { backgroundColor: colors.background }]}>
                    <Text style={[styles.plusText, { color: colors.primary }]}>+</Text>
                </View>
            )}
            <Text
                style={[
                    styles.avatarLabel,
                    { color: isSelected ? colors.primary : colors.text },
                ]}
            >
                Custom
            </Text>
            {customUri && (
                <TouchableOpacity
                    style={[
                        styles.editButtonBelowLabel,
                        { borderColor: colors.border, backgroundColor: colors.background },
                    ]}
                    activeOpacity={0.8}
                    onPress={(e) => {
                        e && e.stopPropagation && e.stopPropagation();
                        handleEditPress();
                    }}
                    accessibilityLabel="Edit custom avatar"
                >
                    <Ionicons name="pencil" size={14} color={colors.primary} style={{ marginRight: 5 }} />
                    <Text style={[styles.editButtonText, { color: colors.primary }]}>Edit</Text>
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );
};

const SettingsScreen = () => {
    const router = useRouter();

    const themeContext = useContext(ThemeContext);
    const companionContext = useContext(CompanionContext);
    const subContext = useContext(SubscriptionContext);
    const authContext = useContext(AuthContext);
    const diaryContext = useContext(DiaryContext);

    if (!themeContext || !subContext || !authContext || !diaryContext) {
        return <ActivityIndicator size="large" style={{ flex: 1 }} />;
    }

    const {
        theme,
        colors,
        selectedAvatarId,
        setSelectedAvatarId,
        pickCustomAvatar,
        customAvatarUri,
    } = themeContext;
    const themeDefinition = getThemeDefinition(theme);

    const { isProMember, upgradeToPro } = subContext;
    const { isLockEnabled, toggleLock } = authContext;
    
    // Get user state data for export and AI settings
    const { userState, allRichEntries, updateUserState } = useUserState();
    const [isExporting, setIsExporting] = useState(false);
    
    // Merge companions from both sources: CompanionContext (legacy) and userState.companions (new)
    const legacyCompanions = companionContext?.companions || [];
    const userCreatedCompanions = Object.values(userState?.companions || {});
    // Convert userState companions to format compatible with CompanionSelectorCarousel
    const formattedUserCompanions = userCreatedCompanions.map(comp => ({
        id: comp.id,
        name: comp.name,
        avatarIdentifier: comp.avatarUri || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }));
    // Merge both sources, prioritizing user-created companions
    const allCompanions = useMemo(() => {
        const merged = [...formattedUserCompanions];
        // Add legacy companions that don't already exist
        legacyCompanions.forEach(legacy => {
            if (!merged.find(c => String(c.id) === String(legacy.id))) {
                merged.push(legacy);
            }
        });
        return merged;
    }, [legacyCompanions, formattedUserCompanions]);
    const companionsLoading = companionContext?.isLoading;
    const [primaryCompanionId, setPrimaryCompanionId] = useState(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const storedPrimary = await AsyncStorage.getItem('primaryCompanionID');
                if (!mounted) {
                    return;
                }
                if (!storedPrimary || storedPrimary === 'null' || storedPrimary === 'undefined') {
                    setPrimaryCompanionId(null);
                } else {
                    setPrimaryCompanionId(String(storedPrimary));
                }
            } catch (error) {
                console.warn('Failed to load primary companion id', error);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        if (!primaryCompanionId) {
            return;
        }
        const exists = allCompanions.some((companion) => String(companion.id) === String(primaryCompanionId));
        if (!exists && !companionsLoading) {
            setPrimaryCompanionId(null);
            AsyncStorage.removeItem('primaryCompanionID').catch((error) => {
                console.warn('Failed to clear stale primary companion', error);
            });
        }
    }, [allCompanions, companionsLoading, primaryCompanionId]);

    const primaryCompanion = allCompanions.find((companion) => String(companion.id) === String(primaryCompanionId)) || null;

    const handleSetNoPrimary = async () => {
        if (primaryCompanionId === null) {
            return;
        }
        setPrimaryCompanionId(null);
        try {
            await AsyncStorage.removeItem('primaryCompanionID');
        } catch (error) {
            console.warn('Failed to clear primary companion', error);
        }
    };

    const handlePrimaryChange = async (companions = []) => {
        if (!companions.length) {
            await handleSetNoPrimary();
            return;
        }
        const selected = companions[companions.length - 1];
        const nextId = String(selected.id);
        setPrimaryCompanionId(nextId);
        try {
            await AsyncStorage.setItem('primaryCompanionID', nextId);
        } catch (error) {
            console.warn('Failed to persist primary companion', error);
        }
    };

    const handleUpgradePress = () => {
        Alert.alert(
            'Upgrade to Pro',
            'Unlock premium features like cloud sync, more themes, advanced analytics, and custom companion avatar!',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Upgrade Now', onPress: upgradeToPro },
            ]
        );
    };

    const handleExportData = async () => {
        try {
            setIsExporting(true);
            
            // Show confirmation dialog
            Alert.alert(
                'Export Data',
                'This will create a backup file containing all your diary entries and insights. You can share it to save it to your device or cloud storage.',
                [
                    { text: 'Cancel', style: 'cancel', onPress: () => setIsExporting(false) },
                    {
                        text: 'Export',
                        onPress: async () => {
                            try {
                                await exportService.exportAndShare(userState, allRichEntries);
                                Alert.alert(
                                    'Export Successful',
                                    'Your data has been exported successfully. Use the sharing dialog to save it to your device or cloud storage.',
                                    [{ text: 'OK' }]
                                );
                            } catch (error) {
                                console.error('Export error:', error);
                                Alert.alert(
                                    'Export Failed',
                                    error.message || 'Failed to export your data. Please try again later.',
                                    [{ text: 'OK' }]
                                );
                            } finally {
                                setIsExporting(false);
                            }
                        },
                    },
                ]
            );
        } catch (error) {
            console.error('Export setup error:', error);
            setIsExporting(false);
            Alert.alert('Error', 'Failed to start export process.');
        }
    };

    // Render built-in avatar item
    const renderAvatarItem = (item) => {
        const isSelected = selectedAvatarId === item.id;
        return (
            <TouchableOpacity
                key={item.id}
                activeOpacity={0.85}
                onPress={() => setSelectedAvatarId(item.id)}
                style={[
                    styles.avatarTouchable,
                    {
                        borderColor: isSelected ? colors.primary : colors.border,
                        backgroundColor: colors.card,
                    },
                ]}
                accessibilityLabel={item.name}
                accessibilityState={{ selected: isSelected }}
            >
                <LottieView
                    autoPlay
                    loop
                    source={item.source}
                    style={styles.avatarLottie}
                />
                <Text
                    style={[
                        styles.avatarLabel,
                        { color: isSelected ? colors.primary : colors.text },
                    ]}
                >
                    {item.name}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <ScrollView
            style={[styles.scrollContainer, { backgroundColor: colors.background }]}
            contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
        >
            {/* Avatar selection */}
            <View style={styles.sectionContainer}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Choose Your Companion
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarListContainer}>
                    <CustomAvatarButton
                        colors={colors}
                        customUri={customAvatarUri}
                        isSelected={selectedAvatarId === 'custom'}
                        onSelect={() => setSelectedAvatarId('custom')}
                        onPick={pickCustomAvatar}
                        isPro={isProMember}
                    />
                    {AVATARS.map(renderAvatarItem)}
                </ScrollView>
            </View>

            {/* Enable App Lock */}
            <View style={[styles.row, { borderBottomColor: colors.border }]}>
                <Text style={[styles.rowText, { color: colors.text }]}>Enable App Lock</Text>
                <Switch
                    value={isLockEnabled}
                    onValueChange={toggleLock}
                    thumbColor={isLockEnabled ? colors.primary : (Platform.OS === 'android' ? '#f4f3f4' : undefined)}
                    trackColor={{ false: colors.border, true: colors.primary + '87' }}
                />
            </View>

            {/* Enable AI Companion Interaction */}
            <View style={[styles.row, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={[styles.rowText, { color: colors.text }]}>Enable AI Companion Interaction</Text>
                    <Text style={[styles.rowSubText, { color: colors.secondaryText }]}>
                        Allow AI to interact with your companions
                    </Text>
                </View>
                <Switch
                    value={userState?.settings?.isAIInteractionEnabled || false}
                    onValueChange={async (value) => {
                        const newSettings = {
                            ...(userState.settings || { isAIInteractionEnabled: false }),
                            isAIInteractionEnabled: value,
                        };
                        const updatedState = {
                            ...userState,
                            settings: newSettings,
                            lastUpdatedAt: new Date().toISOString(),
                        };
                        await updateUserState(updatedState);
                    }}
                    thumbColor={(userState?.settings?.isAIInteractionEnabled || false) ? colors.primary : (Platform.OS === 'android' ? '#f4f3f4' : undefined)}
                    trackColor={{ false: colors.border, true: colors.primary + '87' }}
                />
            </View>

            {/* Appearance */}
            <TouchableOpacity
                style={[
                    styles.row,
                    styles.rowButton,
                    { borderBottomColor: colors.border },
                ]}
                onPress={() => router.push('/theme-settings')}
                activeOpacity={0.85}
            >
                <View style={styles.rowButtonContent}>
                    <Ionicons
                        name="color-palette-outline"
                        size={22}
                        color={colors.primary}
                        style={{ marginRight: 12 }}
                    />
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.rowText, { color: colors.text }]}>Appearance</Text>
                        <Text style={[styles.rowSubText, { color: colors.secondaryText }]}>
                            Current theme: {themeDefinition.displayName}
                        </Text>
                    </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.border} />
            </TouchableOpacity>

            {/* Pro Upgrade Section */}
            <View style={styles.sectionContainer}>
                <TouchableOpacity
                    style={[styles.proButton, { backgroundColor: colors.card, borderColor: colors.primary, opacity: isProMember ? 0.73 : 1 }]}
                    onPress={handleUpgradePress}
                    disabled={isProMember}
                >
                    <Text style={[styles.proText, { color: isProMember ? '#999' : colors.primary }]}>
                        {isProMember ? '✨ You are a Pro Member!' : '🚀 Upgrade to Pro'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Companion Management */}
            <View style={styles.sectionContainer}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Relationships</Text>
                <TouchableOpacity
                    onPress={() => router.push('/companions')}
                    style={[styles.manageButton, { borderColor: colors.border, backgroundColor: colors.card }]}
                    activeOpacity={0.85}
                >
                    <Ionicons name="people-outline" size={22} color={colors.primary} style={{ marginRight: 10 }} />
                    <Text style={[styles.manageButtonText, { color: colors.text }]}>
                        Manage Companions
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.border} />
                </TouchableOpacity>
            </View>

            <View style={styles.sectionContainer}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Primary Companion</Text>
                <Text style={[styles.primaryStatus, { color: colors.text }]}>
                    {primaryCompanion ? `Current: ${primaryCompanion.name}` : 'Current: None'}
                </Text>
                <TouchableOpacity
                    style={[
                        styles.noneOption,
                        {
                            borderColor: colors.border,
                            backgroundColor: primaryCompanionId === null ? colors.primary + '15' : colors.card,
                        },
                    ]}
                    onPress={handleSetNoPrimary}
                    activeOpacity={0.85}
                    disabled={primaryCompanionId === null}
                >
                    <Ionicons
                        name={primaryCompanionId === null ? 'checkmark-circle' : 'ellipse-outline'}
                        size={20}
                        color={primaryCompanionId === null ? colors.primary : colors.border}
                        style={{ marginRight: 10 }}
                    />
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.noneOptionText, { color: colors.text }]}>No default companion</Text>
                        <Text style={[styles.noneOptionHint, { color: colors.text }]}>
                            WhisperLine will use your theme avatar instead.
                        </Text>
                    </View>
                </TouchableOpacity>
                <CompanionSelectorCarousel
                    allCompanions={allCompanions}
                    selectedIDs={primaryCompanionId ? [primaryCompanionId] : []}
                    onSelectionChange={handlePrimaryChange}
                />
            </View>

            <View style={styles.sectionContainer}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Advanced</Text>
                <TouchableOpacity
                    onPress={() => router.push('/advanced-settings')}
                    style={[styles.manageButton, { borderColor: colors.border, backgroundColor: colors.card }]}
                    activeOpacity={0.85}
                >
                    <Ionicons name="options-outline" size={22} color={colors.primary} style={{ marginRight: 10 }} />
                    <Text style={[styles.manageButtonText, { color: colors.text }]}>
                        Advanced Settings
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.border} />
                </TouchableOpacity>
                
                <TouchableOpacity
                    onPress={handleExportData}
                    disabled={isExporting}
                    style={[
                        styles.manageButton,
                        { borderColor: colors.border, backgroundColor: colors.card, opacity: isExporting ? 0.6 : 1 },
                    ]}
                    activeOpacity={0.85}
                >
                    {isExporting ? (
                        <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 10 }} />
                    ) : (
                        <Ionicons name="download-outline" size={22} color={colors.primary} style={{ marginRight: 10 }} />
                    )}
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.manageButtonText, { color: colors.text }]}>
                            {isExporting ? 'Exporting...' : 'Export All Data'}
                        </Text>
                        <Text style={[styles.manageButtonSubText, { color: colors.secondaryText }]}>
                            Create a backup of your diary entries and insights
                        </Text>
                    </View>
                    {!isExporting && <Ionicons name="chevron-forward" size={20} color={colors.border} />}
                </TouchableOpacity>
            </View>

            {/* Guides & Legal */}
            <View style={styles.sectionContainer}>
                <TouchableOpacity onPress={() => router.push('/user-guide')} style={styles.linkButton}>
                    <Text style={[styles.linkText, { color: colors.primary }]}>User Guide</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/privacy-policy')} style={styles.linkButton}>
                    <Text style={[styles.linkText, { color: colors.primary }]}>Privacy Policy</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    scrollContainer: { flex: 1 },
    sectionContainer: { marginBottom: 30 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, paddingLeft: 2 },
    avatarListContainer: { paddingVertical: 10, paddingLeft: 2, alignItems: 'flex-start' },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20, borderBottomWidth: StyleSheet.hairlineWidth, justifyContent: 'space-between' },
    rowText: { fontSize: 17, flexShrink: 1 },
    rowSubText: { fontSize: 13, marginTop: 4 },
    rowButton: { alignItems: 'center' },
    rowButtonContent: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
    avatarTouchable: {
        borderWidth: 3,
        borderRadius: 44,
        padding: 5,
        marginRight: 16,
        alignItems: 'center',
        justifyContent: 'flex-start',
        width: 88,
        height: 120, // Height slightly increased for edit button below label
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 4,
        elevation: 2,
    },
    avatarLottie: { width: 70, height: 70, marginBottom: 4 },
    avatarImage: { width: 70, height: 70, borderRadius: 35, marginBottom: 4 }, // Used for custom avatar
    avatarLabel: { textAlign: 'center', fontWeight: '500', fontSize: 13 },
    plusAvatarCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#DDDDDD',
    },
    plusText: { fontSize: 36, fontWeight: '300' },
    // NEW: Button below the label for editing custom avatar
    editButtonBelowLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        marginTop: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 13,
        borderWidth: 1,
        minWidth: 48,
    },
    editButtonText: {
        fontSize: 13,
        fontWeight: '500',
    },
    proButton: { borderRadius: 14, alignItems: 'center', paddingVertical: 18, marginTop: 15, borderWidth: 1.2 },
    proText: { fontSize: 18, fontWeight: 'bold' },
    linkButton: { paddingVertical: 10, alignItems: 'center' },
    linkText: { fontSize: 16, textDecorationLine: 'underline' },
    manageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 18,
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
    },
    manageButtonText: { flex: 1, fontSize: 16, fontWeight: '500' },
    manageButtonSubText: { fontSize: 13, marginTop: 2, fontWeight: '400' },
    primaryStatus: { fontSize: 13, opacity: 0.7, marginBottom: 10, paddingLeft: 2 },
    noneOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: 14,
        marginBottom: 16,
    },
    noneOptionText: { fontSize: 16, fontWeight: '600' },
    noneOptionHint: { fontSize: 12, opacity: 0.7, marginTop: 4 },
    themeHelpText: { fontSize: 14, opacity: 0.7 },
    themeStatusText: { fontSize: 13, marginTop: 10 },
    themeStatusHint: { fontSize: 12, opacity: 0.7, marginTop: 4 },
    editIconButtonFixed: {
        // No longer needed in new design (was used for overlay edit pencil)
        display: 'none',
    },
});

export default SettingsScreen;