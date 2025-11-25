// src/components/MoodTrendChart.tsx
// Lightweight component for rendering mood trends from diary data
import React, { useMemo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export interface DiaryEntry {
  id: string;
  createdAt: string | number;
  mood?: string;
  analyzedMetadata?: {
    moods?: string[];
  };
}

interface MoodTrendChartProps {
  diaries: DiaryEntry[];
  width?: number;
  height?: number;
  strokeColor?: string;
  strokeWidth?: number;
  maxEntries?: number; // Maximum number of entries to show (default: 10)
  style?: ViewStyle;
}

/**
 * Map mood strings to numerical scores for charting
 * Higher score = more positive mood
 */
function getMoodScore(mood: string | undefined): number {
  if (!mood) return 5; // Default to neutral (middle)
  
  const lowerMood = mood.toLowerCase().trim();
  
  // Positive moods (high scores)
  if (lowerMood.includes('happy') || lowerMood.includes('joyful') || lowerMood.includes('excited')) {
    return 10;
  }
  if (lowerMood.includes('grateful') || lowerMood.includes('thankful') || lowerMood.includes('blessed')) {
    return 9;
  }
  if (lowerMood.includes('proud') || lowerMood.includes('confident') || lowerMood.includes('energetic')) {
    return 8;
  }
  
  // Neutral/Calm moods (middle scores)
  if (lowerMood.includes('calm') || lowerMood.includes('peaceful') || lowerMood.includes('relaxed')) {
    return 5;
  }
  if (lowerMood.includes('neutral') || lowerMood.includes('okay') || lowerMood.includes('fine')) {
    return 5;
  }
  
  // Negative moods (low scores)
  if (lowerMood.includes('tired') || lowerMood.includes('exhausted') || lowerMood.includes('drained')) {
    return 3;
  }
  if (lowerMood.includes('sad') || lowerMood.includes('down') || lowerMood.includes('depressed')) {
    return 2;
  }
  if (lowerMood.includes('anxious') || lowerMood.includes('worried') || lowerMood.includes('stressed')) {
    return 2;
  }
  if (lowerMood.includes('angry') || lowerMood.includes('frustrated') || lowerMood.includes('upset')) {
    return 1;
  }
  
  // Fallback: return neutral score
  return 5;
}

/**
 * Extract mood from diary entry
 * Priority: entry.mood > analyzedMetadata.moods[0]
 */
function extractMood(entry: DiaryEntry): string | undefined {
  if (entry.mood) {
    return entry.mood;
  }
  if (entry.analyzedMetadata?.moods && entry.analyzedMetadata.moods.length > 0) {
    return entry.analyzedMetadata.moods[0];
  }
  return undefined;
}

/**
 * Generate smooth SVG path from data points
 */
function generatePath(points: Array<{ x: number; y: number }>, width: number, height: number): string {
  if (points.length === 0) {
    // Flat line in the middle
    return `M 0 ${height / 2} L ${width} ${height / 2}`;
  }
  
  if (points.length === 1) {
    // Single point - draw horizontal line
    return `M 0 ${points[0].y} L ${width} ${points[0].y}`;
  }
  
  // Create path with smooth curves using quadratic bezier curves
  let path = `M ${points[0].x} ${points[0].y}`;
  
  for (let i = 1; i < points.length; i++) {
    const prevPoint = points[i - 1];
    const currentPoint = points[i];
    
    if (i === 1) {
      // First segment - use line
      path += ` L ${currentPoint.x} ${currentPoint.y}`;
    } else {
      // Use quadratic bezier for smooth curves
      const controlX = (prevPoint.x + currentPoint.x) / 2;
      const controlY = (prevPoint.y + currentPoint.y) / 2;
      path += ` Q ${prevPoint.x} ${prevPoint.y} ${controlX} ${controlY}`;
      path += ` L ${currentPoint.x} ${currentPoint.y}`;
    }
  }
  
  return path;
}

const MoodTrendChart: React.FC<MoodTrendChartProps> = ({
  diaries,
  width = 120,
  height = 30,
  strokeColor = 'rgba(255,255,255,0.85)',
  strokeWidth = 2,
  maxEntries = 10,
  style,
}) => {
  const pathData = useMemo(() => {
    if (!diaries || diaries.length === 0) {
      // No data - return flat line
      return `M 0 ${height / 2} L ${width} ${height / 2}`;
    }
    
    // Get last N entries sorted by date (oldest to newest for trend)
    const sortedDiaries = [...diaries]
      .filter((entry) => {
        // Filter out entries without valid dates
        const date = new Date(entry.createdAt || 0);
        return !isNaN(date.getTime());
      })
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateA - dateB; // Oldest first for chronological trend
      })
      .slice(-maxEntries); // Get last N entries
    
    if (sortedDiaries.length === 0) {
      return `M 0 ${height / 2} L ${width} ${height / 2}`;
    }
    
    // Calculate data points
    const points = sortedDiaries.map((entry, index) => {
      const mood = extractMood(entry);
      const score = getMoodScore(mood);
      
      // X position: evenly distributed across width
      const x = (index / (sortedDiaries.length - 1 || 1)) * width;
      
      // Y position: invert for SVG (0 at top, 10 at bottom)
      // Map score (0-10) to y position (height to 0)
      const y = height - (score / 10) * height;
      
      return { x, y };
    });
    
    // Generate smooth path
    return generatePath(points, width, height);
  }, [diaries, width, height, maxEntries]);
  
  return (
    <View style={[styles.container, style]}>
      <Svg height={height} width={width} viewBox={`0 0 ${width} ${height}`}>
        <Path
          d={pathData}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MoodTrendChart;

