// screens/SettingsScreen.js
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import React, { useContext } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { SubscriptionContext } from '../context/SubscriptionContext';
import { ThemeContext } from '../context/ThemeContext';
import { AVATARS } from '../data/avatars';

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
    const subContext = useContext(SubscriptionContext);
    const authContext = useContext(AuthContext);

    if (!themeContext || !subContext || !authContext) {
        return <ActivityIndicator size="large" style={{ flex: 1 }} />;
    }

    const {
        theme,
        toggleTheme,
        colors,
        selectedAvatarId,
        setSelectedAvatarId,
        pickCustomAvatar,
        customAvatarUri,
    } = themeContext;

    const { isProMember, upgradeToPro } = subContext;
    const { isLockEnabled, toggleLock } = authContext;

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

            {/* Dark Mode */}
            <View style={[styles.row, { borderBottomColor: colors.border }]}>
                <Text style={[styles.rowText, { color: colors.text }]}>Dark Mode</Text>
                <Switch
                    value={theme === 'dark'}
                    onValueChange={toggleTheme}
                    thumbColor={theme === 'dark' ? colors.primary : (Platform.OS === 'android' ? '#f4f3f4' : undefined)}
                    trackColor={{ false: colors.border, true: colors.primary + '87' }}
                />
            </View>

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
    editIconButtonFixed: {
        // No longer needed in new design (was used for overlay edit pencil)
        display: 'none',
    },
});

export default SettingsScreen;