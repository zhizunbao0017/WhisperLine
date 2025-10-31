// components/MoodSelector.js
import { useContext } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ThemeContext } from '../context/ThemeContext';
// --- 1. 导入我们新的心情数据源 ---
import { MOODS } from '../data/moods';

const MoodSelector = ({ onSelectMood, selectedMood }) => {
    const { colors } = useContext(ThemeContext);

    // 如果主题颜色还没加载好，就暂时不渲染任何东西
    if (!colors) {
        return null;
    }

    return (
        <View style={styles.container}>
            <Text style={[styles.label, { color: colors.text }]}>How are you feeling?</Text>
            <View style={styles.moodsContainer}>
                {MOODS.map((mood) => {
                    // --- 2. 判断当前心情是否被选中 ---
                    const isSelected = selectedMood?.name === mood.name;

                    // --- 3. 根据是否选中，应用不同的动画样式 ---
                    const animatedStyle = {
                        transform: [{ scale: isSelected ? 1.15 : 1 }], // 选中时放大
                        opacity: isSelected ? 1 : 0.7, // 未选中时半透明
                    };

                    return (
                        <TouchableOpacity
                            key={mood.name}
                            // 点击时，传递完整的心情对象回去
                            onPress={() => onSelectMood(mood.name)}
                            // accessibility anaytics - a11y
                            accessibilityLabel={mood.name}
                            accessibilityState={{ selected: isSelected }}
                            accessibilityRole="button"
                        >
                            <Animated.View style={[styles.moodWrapper, animatedStyle]}>
                                <View 
                                    style={[
                                        styles.imageContainer,
                                        { backgroundColor: colors.card },
                                        // --- 4. 为选中的图标添加一个漂亮的边框 ---
                                        isSelected && {
                                            borderColor: colors.primary,
                                            borderWidth: 3,
                                        }
                                    ]}
                                >
                                    {/* --- 5. 使用 Image 组件渲染我们的图标 --- */}
                                    <Image source={mood.image} style={styles.moodImage} />
                                </View>
                                <Text style={[styles.moodLabel, { color: isSelected ? colors.primary : colors.text }]}>
                                    {mood.name}
                                </Text>
                            </Animated.View>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

// --- 我们将样式移到组件外部，这是React Native的最佳实践 ---
const styles = StyleSheet.create({
    container: {
        marginBottom: 25,
    },
    label: {
        fontSize: 18,
        fontWeight: '600', // 使用 600 (semibold) 而不是 'bold'，看起来更柔和
        marginBottom: 15,
        textAlign: 'center', // 标签居中
    },
    moodsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-start',
        paddingHorizontal: 10, // <-- 新增！给容器左右增加内边距
    },
    moodWrapper: {
        alignItems: 'center',
        width: 65, // 给每个图标一个固定的宽度，方便对齐
    },
    imageContainer: {
        width: 60,
        height: 60,
        borderRadius: 30, // 完美的圆形
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        // 添加一些阴影效果，让图标看起来有“浮起来”的感觉
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    moodImage: {
        width: '70%', // 图片占容器的70%，留出一些边距
        height: '70%',
        resizeMode: 'contain',
    },
    moodLabel: {
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
    },
});

export default MoodSelector;