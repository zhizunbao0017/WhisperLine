// screens/DiaryDetailScreen.js
import { Ionicons } from '@expo/vector-icons'; // 我们将使用一个漂亮的图标库
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useContext } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DiaryContext } from '../context/DiaryContext';
import { ThemeContext } from '../context/ThemeContext';
import { MOODS } from '../data/moods';

const DiaryDetailScreen = () => {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { colors } = useContext(ThemeContext);
    const { deleteDiary } = useContext(DiaryContext);

    // 从参数中解析出日记数据
    const diary = params.diary ? JSON.parse(params.diary) : null;

    if (!diary) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: colors.text }}>Diary not found.</Text>
            </View>
        );
    }

    // 跳转到编辑页的函数
    const handleEdit = () => {
        router.push({ pathname: '/add-edit-diary', params: { diary: JSON.stringify(diary) } });
    };

    // 删除日记的处理函数
    const handleDelete = () => {
        Alert.alert(
            'Delete Diary',
            'Are you sure you want to delete this diary entry?',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: () => {
                        deleteDiary(diary.id);
                        router.replace('/');
                    }
                }
            ],
            { cancelable: true }
        );
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* --- 顶部栏，包含编辑和删除按钮 --- */}
            <View style={styles.header}>
                <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
                        <Ionicons name="create-outline" size={28} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleDelete} style={styles.deleteButton} accessibilityLabel="Delete diary">
                        <Ionicons name="trash-outline" size={28} color={colors.error || '#e53935'} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* --- 心情和标题区域 --- */}
            <View style={styles.titleContainer}>
                {(() => {
                    const moodName = typeof diary.mood === 'string' ? diary.mood : diary.mood?.name;
                    const moodData = MOODS.find(m => m.name === moodName);
                    if (moodData?.image) {
                        return <Image source={moodData.image} style={styles.moodImage} />;
                    }
                    return null;
                })()}
                <Text style={[styles.title, { color: colors.text }]}>{diary.title}</Text>
            </View>

            {/* --- 日期和天气信息 --- */}
            <View style={styles.metaContainer}>
                <Text style={[styles.metaText, { color: colors.text }]}>
                    {new Date(diary.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    })}
                </Text>
                {diary.weather && (
                    <View style={styles.weatherContainer}>
                        <Image
                            source={{ uri: `https://openweathermap.org/img/wn/${diary.weather.icon}@2x.png` }}
                            style={styles.weatherIcon}
                        />
                        <Text style={[styles.metaText, { color: colors.text, marginLeft: 5 }]}>
                            {`${diary.weather.city}, ${diary.weather.temperature}°C`}
                        </Text>
                    </View>
                )}
            </View>

            {/* --- 分隔线 --- */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* --- 日记正文 --- */}
            <Text style={[styles.content, { color: colors.text }]}>
                {diary.content}
            </Text>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    header: {
        alignItems: 'flex-end',
        marginBottom: 20,
    },
    editButton: {
        padding: 5,
        marginRight: 10,
    },
    deleteButton: {
        padding: 5,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    moodImage: {
        width: 50,
        height: 50,
        marginRight: 15,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        flex: 1,
    },
    metaContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    metaText: {
        fontSize: 14,
        color: '#666',
    },
    weatherContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    weatherIcon: {
        width: 30,
        height: 30,
    },
    divider: {
        height: 1,
        width: '100%',
        marginBottom: 20,
    },
    content: {
        fontSize: 18,
        lineHeight: 28, // 增加行高，提升阅读体验
        textAlign: 'justify', // 两端对齐
    },
});

export default DiaryDetailScreen;