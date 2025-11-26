// screens/SettingsScreen.js
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Link } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DiaryContext } from '../context/DiaryContext';
import { getThemeDefinition } from '@/constants/themes';
import { ThemedText as Text } from '../components/ThemedText';
import { useUserState } from '../context/UserStateContext';
import { exportService } from '../services/ExportService';
import { importService } from '../services/ImportService';
import * as DocumentPicker from 'expo-document-picker';
import { SettingsSection } from '../components/SettingsSection';
import { SettingRow } from '../components/SettingRow';
import { ActiveFocusDisplay } from '../components/ActiveFocusDisplay';
import { KeyPeopleList } from '../components/KeyPeopleList';

const SettingsScreen = () => {
    const router = useRouter();

    const themeContext = useContext(ThemeContext);
    const subContext = useContext(SubscriptionContext);
    const authContext = useContext(AuthContext);
    const diaryContext = useContext(DiaryContext);

    if (!themeContext || !subContext || !authContext || !diaryContext) {
        return <ActivityIndicator size="large" style={{ flex: 1 }} />;
    }

    const {
        theme,
        colors,
    } = themeContext;
    const themeDefinition = getThemeDefinition(theme);

    const { isProMember, upgradeToPro } = subContext;
    const { isLockEnabled, toggleLock } = authContext;
    
    // Get user state data for export, import, and AI settings
    const { 
        userState, 
        allRichEntries, 
        updateUserState,
        isImporting,
        importProgress,
        importMessage,
    } = useUserState();
    const [isExporting, setIsExporting] = useState(false);
    
    // Get AI interaction enabled state for conditional disabling
    const isAIInteractionGloballyEnabled = userState?.settings?.isAIInteractionEnabled || false;

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


    const handleImportData = async () => {
        try {
            // Show confirmation dialog
            Alert.alert(
                'Import Data',
                'This will import diary entries from a Day One export file (.zip). The import process is local and private. Your existing entries will not be affected.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Import',
                        onPress: async () => {
                            try {
                                // Pick ZIP file using Expo DocumentPicker
                                const result = await DocumentPicker.getDocumentAsync({
                                    type: 'application/zip',
                                    copyToCacheDirectory: true, // Copy to cache for processing
                                });

                                // Expo DocumentPicker returns a single object, not an array
                                // Check if user canceled
                                if (result.canceled) {
                                    return; // User cancelled, no error message needed
                                }

                                if (result && result.uri) {
                                    const fileUri = result.uri;
                                    console.log('[SettingsScreen] Selected file:', fileUri);

                                    // Start import process with progress tracking
                                    // Progress callback - update UserStateContext state through a workaround
                                    // Since we can't directly mutate context state, we'll use a ref or state update
                                    const progressCallback = (progress, message) => {
                                        // Update progress - we'll need to handle this differently
                                        // For now, log it and show in UI through local state
                                        console.log(`[SettingsScreen] Import progress: ${progress}% - ${message || ''}`);
                                        
                                        // Try to update context state if possible
                                        // Note: This is a limitation - we need to update through proper context methods
                                    };

                                    try {
                                        await importService.startImport(
                                            fileUri,
                                            progressCallback,
                                            diaryContext,
                                            userStateContext
                                        );

                                        Alert.alert(
                                            'Import Successful',
                                            'Your diary entries have been imported successfully.',
                                            [{ text: 'OK' }]
                                        );
                                    } catch (importError) {
                                        throw importError; // Re-throw to be caught by outer catch
                                    }
                                }
                            } catch (error) {
                                console.error('Import error:', error);
                                
                                // Expo DocumentPicker doesn't throw on cancel, but check anyway
                                if (error.message && error.message.includes('cancel')) {
                                    return; // User cancelled, no error message needed
                                }

                                Alert.alert(
                                    'Import Failed',
                                    error.message || 'Failed to import your data. Please ensure the file is a valid Day One export.',
                                    [{ text: 'OK' }]
                                );
                            }
                        },
                    },
                ]
            );
        } catch (error) {
            console.error('Import setup error:', error);
            Alert.alert('Error', 'Failed to start import process.');
        }
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

    return (
        <ScrollView
            style={[styles.scrollContainer, { backgroundColor: colors.background }]}
            contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
        >
            {/* 1. Active Focus Section */}
            <View style={styles.sectionContainer}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Focus</Text>
                <Text style={[styles.sectionDescription, { color: colors.secondaryText }]}>
                    The AI will use memories and context related to this person for your conversations.
                </Text>
                <ActiveFocusDisplay colors={colors} />
            </View>

            {/* 2. Key People Navigation Link */}
            <View style={styles.sectionContainer}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Key People</Text>
                <Text style={[styles.sectionDescription, { color: colors.secondaryText }]}>
                    Manage your key people and companions.
                </Text>
                <Link href="/manage-key-people" asChild>
                    <TouchableOpacity
                        style={[
                            styles.navRow,
                            {
                                backgroundColor: colors.card,
                                borderColor: colors.border,
                            },
                        ]}
                        activeOpacity={0.7}
                    >
                        <View style={styles.navRowContent}>
                            <Ionicons name="people-outline" size={22} color={colors.primary} style={{ marginRight: 12 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.navTitle, { color: colors.text }]}>Key People</Text>
                                <Text style={[styles.navSubtitle, { color: colors.secondaryText }]}>
                                    {Object.keys(userState?.companions || {}).length + 1} {Object.keys(userState?.companions || {}).length === 0 ? 'person' : 'people'}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.border} />
                        </View>
                    </TouchableOpacity>
                </Link>
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
            </View>

            {/* Data Management */}
            <View style={styles.sectionContainer}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Data Management</Text>
                
                {/* Import Data Button */}
                <TouchableOpacity
                    onPress={handleImportData}
                    disabled={isImporting || isExporting}
                    style={[
                        styles.manageButton,
                        { 
                            borderColor: colors.border, 
                            backgroundColor: colors.card, 
                            opacity: (isImporting || isExporting) ? 0.6 : 1,
                            marginBottom: 12,
                        },
                    ]}
                    activeOpacity={0.85}
                >
                    {isImporting ? (
                        <View style={{ marginRight: 10, alignItems: 'center', justifyContent: 'center', width: 22 }}>
                            <ActivityIndicator size="small" color={colors.primary} />
                        </View>
                    ) : (
                        <Ionicons name="cloud-upload-outline" size={22} color={colors.primary} style={{ marginRight: 10 }} />
                    )}
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.manageButtonText, { color: colors.text }]}>
                            {isImporting 
                                ? `Importing... ${Math.round(importProgress)}%` 
                                : 'Import Data'}
                        </Text>
                        <Text style={[styles.manageButtonSubText, { color: colors.secondaryText }]}>
                            {isImporting 
                                ? (importMessage || 'Importing your diary entries...')
                                : 'Import entries from other journal apps.'}
                        </Text>
                    </View>
                    {!isImporting && <Ionicons name="chevron-forward" size={20} color={colors.border} />}
                </TouchableOpacity>
                
                {/* Export Data Button */}
                <TouchableOpacity
                    onPress={handleExportData}
                    disabled={isExporting || isImporting}
                    style={[
                        styles.manageButton,
                        { borderColor: colors.border, backgroundColor: colors.card, opacity: (isExporting || isImporting) ? 0.6 : 1 },
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
                            Export a full backup of your journal.
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
    sectionDescription: { fontSize: 14, marginTop: 4, paddingLeft: 2, lineHeight: 20 },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20, borderBottomWidth: StyleSheet.hairlineWidth, justifyContent: 'space-between' },
    rowText: { fontSize: 17, flexShrink: 1 },
    rowSubText: { fontSize: 13, marginTop: 4 },
    rowButton: { alignItems: 'center' },
    rowButtonContent: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
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
    disabledHint: {
        fontSize: 13,
        marginTop: 8,
        fontStyle: 'italic',
        opacity: 0.7,
    },
    editIconButtonFixed: {
        // No longer needed in new design (was used for overlay edit pencil)
        display: 'none',
    },
    navRow: {
        marginTop: 12,
        borderRadius: 14,
        borderWidth: 1,
        overflow: 'hidden',
    },
    navRowContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    navTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    navSubtitle: {
        fontSize: 13,
    },
});

export default SettingsScreen;