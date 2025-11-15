// app/user-guide.js
import React, { useContext } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ThemeContext } from '../context/ThemeContext';
import { ThemedText as Text } from '../components/ThemedText';

const Section = ({ title, children }) => {
    const { colors } = useContext(ThemeContext);
    return (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
            {children}
        </View>
    );
};

const Paragraph = ({ children }) => {
    const { colors } = useContext(ThemeContext);
    return <Text style={[styles.paragraph, { color: colors.text }]}>{children}</Text>;
};

const BulletList = ({ items }) => {
    const { colors } = useContext(ThemeContext);
    return (
        <View style={styles.bulletList}>
            {items.map((item, index) => (
                <View key={index} style={styles.bulletRow}>
                    <Text style={[styles.bulletSymbol, { color: colors.primary }]}>•</Text>
                    <Text style={[styles.bulletText, { color: colors.text }]}>{item}</Text>
                </View>
            ))}
        </View>
    );
};

const UserGuideScreen = () => {
    const { colors } = useContext(ThemeContext);

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
            contentContainerStyle={styles.content}
        >
            <Text style={[styles.title, { color: colors.text }]}>WhisperLine · User Guide</Text>
            <Paragraph>
                WhisperLine keeps daily reflections quick, private, and visually rich. This guide walks through core
                features so you can capture moments, track moods, and review insights with confidence.
            </Paragraph>

            <Section title="Highlights">
                <BulletList
                    items={[
                        'Fast mood tagging with six color-coded emotions.',
                        'Weather snapshot button to log today’s conditions (°C).',
                        'Rich text editor with formatting, emoji, and multi-photo support.',
                        'Automatic mood analytics and personal suggestions on the Insights tab.',
                        'Device-only storage with optional Face ID / Touch ID lock.',
                    ]}
                />
            </Section>

            <Section title="Getting Started">
                <BulletList
                    items={[
                        'Install on iOS 18.1 or later (optimized for iPhone 16).',
                        'Open the app—no account is required. Optionally enable App Lock in Settings.',
                        'Grant photo and location permissions if you plan to attach images or add weather.',
                    ]}
                />
            </Section>

            <Section title="Writing a New Entry">
                <BulletList
                    items={[
                        'Tap the + button in the top-right corner of the Timeline tab.',
                        'Select a mood—tap again to confirm. You can change it any time before saving.',
                        'Press “Add Current Weather” to log temperature, city, and conditions (data is fetched once per request).',
                        'Give the entry a title, then write using the editor. Use the toolbar for bold, italics, underline, lists, and emoji. Insert multiple photos from your library; they scale to fit.',
                        'Tap “Save Diary” to store everything locally.',
                    ]}
                />
            </Section>

            <Section title="Reviewing Your History">
                <BulletList
                    items={[
                        'Timeline tab: browse entries in chronological order. Tap any entry to open, then use the pencil icon to edit.',
                        'Insights tab: view the mood calendar, distribution chart, average score, and tailored well-being tips generated on your device.',
                        'Calendar days are shaded by overall tone (positive, neutral, negative) using the latest analysis results.',
                    ]}
                />
            </Section>

            <Section title="Settings & Personalization">
                <BulletList
                    items={[
                        'Choose a companion avatar or upload a custom image (custom avatars require Pro access).',
                        'Enable App Lock to require Face ID / Touch ID on launch.',
                        'Switch between light and dark themes.',
                        'Find links to this guide and the privacy policy at the bottom of Settings.',
                    ]}
                />
            </Section>

            <Section title="Privacy & Data Handling">
                <BulletList
                    items={[
                        'Entries are stored locally on your device via secure on-device storage. They are not uploaded to external servers.',
                        'Images you attach remain in the app-specific documents folder so that entries stay intact after restarts.',
                        'Mood analysis runs entirely offline. Only you can review the generated tips and scores.',
                        'Delete the app or clear data from Settings > Privacy Policy to remove saved journals.',
                    ]}
                />
            </Section>

            <Section title="Troubleshooting">
                <BulletList
                    items={[
                        'Images not appearing? Confirm photo library access in iOS Settings and try reinserting.',
                        'Weather missing? Ensure location permission is granted and tap “Add Current Weather” again.',
                        'Insights not updating? Save at least one entry after installing—analytics refresh on each save.',
                        'App lock issues? Toggle App Lock off and on in Settings to reset Face ID authorization.',
                    ]}
                />
            </Section>

            <Section title="Need Help?">
                <Paragraph>
                    We love hearing from you. Send feedback or bug reports to <Text style={styles.link}>j8t@163.com</Text>.
                    Screenshots and device details help us respond quickly.
                </Paragraph>
            </Section>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 24,
        paddingBottom: 48,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 16,
    },
    section: {
        marginTop: 24,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 10,
    },
    paragraph: {
        fontSize: 16,
        lineHeight: 22,
    },
    bulletList: {
        marginTop: 8,
    },
    bulletRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    bulletSymbol: {
        fontSize: 16,
        marginRight: 8,
        lineHeight: 22,
    },
    bulletText: {
        flex: 1,
        fontSize: 16,
        lineHeight: 22,
    },
    link: {
        fontWeight: '600',
    },
});

export default UserGuideScreen;

