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

    const contactEmail = 'YOUR_SUPPORT_EMAIL@example.com'; // Replace with your email

    return (
        <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
            <Text style={[styles.title, { color: colors.text }]}>Privacy Policy for WhisperLine</Text>
            <Text style={[styles.lastUpdated, { color: colors.text }]}>Last Updated: October 28, 2025</Text>

            <Text style={[styles.paragraph, { color: colors.text }]}>
                Thank you for choosing WhisperLine ("the App"). Your privacy is our highest priority. This policy explains what information the App handles and how it is protected.
            </Text>

            <Text style={[styles.heading, { color: colors.text }]}>Core Principle: Your Data is Yours</Text>
            <Text style={[styles.paragraph, { color: colors.text }]}>
                WhisperLine is designed to be a completely private space. We, the developers, have **no access** to your diary entries or any personal content you create. All your data is stored exclusively on your device.
            </Text>

            <Text style={[styles.heading, { color: colors.text }]}>1. Information We Do Not Collect</Text>
            <Text style={[styles.paragraph, { color: colors.text }]}>
                We do not collect, store, or transmit any of the following personal information to our servers:
                - Your name, email address, or any other contact information.
                - The content of your diary entries, including text, titles, moods, or associated metadata.
                - Your precise GPS coordinates.
            </Text>

            <Text style={[styles.heading, { color: colors.text }]}>2. Information the App Handles Locally</Text>
            <Text style={[styles.paragraph, { color: colors.text }]}>
                The App handles the following information, which is stored **only on your personal device**:
                - **Diary Entries:** Your journal entries are stored locally on your device's secure storage.
                - **Weather and Location Data (Optional):** If you choose to add weather, the App requests one-time location access. Your coordinates are sent anonymously to the OpenWeatherMap API. The App only saves the city name and weather; precise coordinates are immediately discarded.
            </Text>

            <Text style={[styles.heading, { color: colors.text }]}>3. App Lock and Biometric Data</Text>
            <Text style={[styles.paragraph, { color: colors.text }]}>
                If you enable App Lock, the App uses Apple's native Face ID or Touch ID service. Your biometric data is never accessed by our App and is handled securely by iOS.
            </Text>

            <Text style={[styles.heading, { color: colors.text }]}>4. Contact Us</Text>
            <Text style={[styles.paragraph, { color: colors.text }]}>
                If you have any questions about this Privacy Policy, you can contact us at:
                <Text style={{ color: colors.primary }} onPress={() => Linking.openURL(`mailto:${contactEmail}`)}>
                    {' '}{contactEmail}
                </Text>
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
});

export default PrivacyPolicyScreen;