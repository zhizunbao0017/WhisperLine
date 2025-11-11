// screens/PrivacyPolicyScreen.js
import React, { useContext } from 'react';
import { ScrollView, Text, StyleSheet, View, Linking, ActivityIndicator } from 'react-native';
import { ThemeContext } from '../context/ThemeContext';

const PrivacyPolicyScreen = () => {
    const themeContext = useContext(ThemeContext);

    if (!themeContext) {
        return <ActivityIndicator size="large" style={{flex: 1}} />;
    }
    const { colors } = themeContext;

    const contactEmail = 'j8t@163.com';

    return (
        <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
            <Text style={[styles.title, { color: colors.text }]}>Privacy Policy · WhisperLine</Text>
            <Text style={[styles.lastUpdated, { color: colors.text }]}>Last Updated: November 11, 2025</Text>

            <Text style={[styles.paragraph, { color: colors.text }]}>
                WhisperLine is a personal diary designed to keep your reflections private. This policy explains what data stays on
                your device, when information leaves the device, and how permissions are used.
            </Text>

            <Text style={[styles.heading, { color: colors.text }]}>Core Principle: Your Data is Yours</Text>
            <Text style={[styles.paragraph, { color: colors.text }]}>
                We do not run cloud servers for WhisperLine. Diary content, mood analytics, settings, and images remain on the iOS
                device you use. We never collect, sell, or profile your information.
            </Text>

            <Text style={[styles.heading, { color: colors.text }]}>1. Information Stored Locally</Text>
            <View style={styles.list}>
                <Text style={[styles.listItem, { color: colors.text }]}>
                    • <Text style={styles.bold}>Diary entries & attachments</Text>: Text, images, moods, and weather notes are stored
                    in iOS local storage (AsyncStorage and the app documents directory).
                </Text>
                <Text style={[styles.listItem, { color: colors.text }]}>
                    • <Text style={styles.bold}>Mood insights</Text>: Sentiment scores and wellness suggestions are generated on-device
                    and saved with the related entry so Insights can visualize trends offline.
                </Text>
                <Text style={[styles.listItem, { color: colors.text }]}>
                    • <Text style={styles.bold}>App preferences</Text>: Theme choice, avatar selection, and lock-state are recorded
                    locally.
                </Text>
            </View>

            <Text style={[styles.heading, { color: colors.text }]}>2. Information We Do Not Collect</Text>
            <View style={styles.list}>
                <Text style={[styles.listItem, { color: colors.text }]}>
                    • We do not require an account, and we do not collect your name or email address.
                </Text>
                <Text style={[styles.listItem, { color: colors.text }]}>
                    • We never upload diary text, images, moods, or analytics to our servers.
                </Text>
                <Text style={[styles.listItem, { color: colors.text }]}>
                    • We do not log precise location history or background location data.
                </Text>
            </View>

            <Text style={[styles.heading, { color: colors.text }]}>3. Optional Third-Party Requests</Text>
            <Text style={[styles.paragraph, { color: colors.text }]}>
                WhisperLine can fetch local weather so you can tag entries with the day’s conditions. When you tap “Add Current
                Weather,” iOS asks for permission to use approximate location. If you agree:
            </Text>
            <View style={styles.list}>
                <Text style={[styles.listItem, { color: colors.text }]}>
                    • Coordinates are sent directly from your device to the OpenWeatherMap service ({' '}
                    <Text style={{ color: colors.primary }} onPress={() => Linking.openURL('https://openweathermap.org/privacy-policy')}>
                        privacy policy
                    </Text>
                    ) solely for that request.
                </Text>
                <Text style={[styles.listItem, { color: colors.text }]}>
                    • WhisperLine stores only the returned city, temperature (°C), and conditions string. Coordinates are not saved.
                </Text>
            </View>

            <Text style={[styles.heading, { color: colors.text }]}>4. Permissions Explained</Text>
            <View style={styles.list}>
                <Text style={[styles.listItem, { color: colors.text }]}>
                    • <Text style={styles.bold}>Photos</Text>: Needed to insert pictures from your library. Images stay within the
                    app’s documents directory.
                </Text>
                <Text style={[styles.listItem, { color: colors.text }]}>
                    • <Text style={styles.bold}>Location</Text>: Optional, used only when you request weather.
                </Text>
            </View>

            <Text style={[styles.heading, { color: colors.text }]}>5. App Lock and Security</Text>
            <Text style={[styles.paragraph, { color: colors.text }]}>
                Enabling App Lock uses Apple’s Face ID or Touch ID APIs. WhisperLine never sees or stores your biometric data; the
                check happens in iOS. While data is kept locally, it is stored in the standard iOS app sandbox. Please ensure your
                device passcode is enabled for additional protection.
            </Text>

            <Text style={[styles.heading, { color: colors.text }]}>6. Children’s Privacy</Text>
            <Text style={[styles.paragraph, { color: colors.text }]}>
                WhisperLine is not directed to children under 13 and should be used by adults or with adult supervision. We do not
                knowingly collect personal information from children.
            </Text>

            <Text style={[styles.heading, { color: colors.text }]}>7. Contact Us</Text>
            <Text style={[styles.paragraph, { color: colors.text }]}>
                Questions? Email us at{' '}
                <Text style={{ color: colors.primary }} onPress={() => Linking.openURL(`mailto:${contactEmail}`)}>
                    {contactEmail}
                </Text>
                .
            </Text>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    lastUpdated: {
        fontSize: 12,
        color: 'grey',
        marginBottom: 20,
    },
    heading: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 10,
    },
    paragraph: {
        fontSize: 16,
        lineHeight: 24,
    },
    list: {
        marginBottom: 8,
    },
    listItem: {
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 6,
    },
    bold: {
        fontWeight: '600',
    },
});

export default PrivacyPolicyScreen;