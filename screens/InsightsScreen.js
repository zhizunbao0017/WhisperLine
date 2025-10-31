// screens/InsightsScreen.js
import React, { useContext } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ThemeContext } from '../context/ThemeContext';

const InsightsScreen = () => {
    const { colors } = useContext(ThemeContext);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Text style={[styles.title, { color: colors.text }]}>
                Coming Soon
            </Text>
            <Text style={{ color: colors.text }}>
                Your mood calendar and statistics will appear here.
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
    },
});

export default InsightsScreen;