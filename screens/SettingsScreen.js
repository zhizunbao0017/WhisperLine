// screens/SettingsScreen.js
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

// --- 新的、更智能的自定义头像组件 ---
const CustomAvatarButton = ({ colors, customUri, isSelected, onPress, isPro }) => {
    const handlePress = () => {
        if (!isPro) {
            // 如果不是Pro会员，弹出升级提示
            Alert.alert(
                'Upgrade to Pro',
                'Unlock custom companion avatars and other premium features!',
                [
                    { text: 'Cancel', style: 'cancel' },
                    // 可以在这里添加一个升级跳转的逻辑
                    { text: 'Upgrade Now', onPress: () => { /* 调用升级函数 */ } },
                ]
            );
            return;
        }
        // 如果是Pro会员，调用图片选择函数
        onPress();
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            style={[
                styles.avatarTouchable,
                {
                    borderColor: isSelected ? colors.primary : colors.border,
                    backgroundColor: colors.card,
                },
            ]}
            activeOpacity={0.85}
            accessibilityLabel="Set custom avatar"
        >
            {customUri ? (
                // 如果有自定义头像URI，就显示图片
                <Image source={{ uri: customUri }} style={styles.avatarImage} />
            ) : (
                // 否则，显示 "+" 号
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

    // --- 1. 使用正确的 Context 变量和函数 ---
    const {
        theme,
        toggleTheme,
        colors,
        selectedAvatarId,
        setSelectedAvatarId,
        pickCustomAvatar,     // <-- 正确的函数名
        customAvatarUri,      // <-- 正确的变量名
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

    // 渲染系统提供的 Lottie 头像
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
            {/* --- 2. 更新头像选择区域的渲染逻辑 --- */}
            <View style={styles.sectionContainer}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Choose Your Companion
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarListContainer}>
                    {/* 先渲染自定义头像按钮 */}
                    <CustomAvatarButton
                        colors={colors}
                        customUri={customAvatarUri}
                        isSelected={selectedAvatarId === 'custom'}
                        onPress={pickCustomAvatar}
                        isPro={isProMember}
                    />
                    {/* 然后渲染所有系统头像 */}
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

            {/* Privacy Policy */}
            <View style={styles.sectionContainer}>
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
        height: 110, // 增加了高度以容纳标签
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 4,
        elevation: 2,
    },
    avatarLottie: { width: 70, height: 70, marginBottom: 4 },
    avatarImage: { width: 70, height: 70, borderRadius: 35, marginBottom: 4 }, // 用于自定义头像
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
    proButton: { borderRadius: 14, alignItems: 'center', paddingVertical: 18, marginTop: 15, borderWidth: 1.2 },
    proText: { fontSize: 18, fontWeight: 'bold' },
    linkButton: { paddingVertical: 10, alignItems: 'center' },
    linkText: { fontSize: 16, textDecorationLine: 'underline' },
});

export default SettingsScreen;