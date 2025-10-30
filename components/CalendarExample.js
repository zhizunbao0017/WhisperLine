import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Calendar } from 'react-native-calendars';

const CalendarExample = () => {
  const [selectedDate, setSelectedDate] = useState('');

  const onDayPress = (day) => {
    setSelectedDate(day.dateString);
    console.log('Selected date:', day.dateString);
  };

  return (
    <View style={styles.container}>
      <Calendar
        onDayPress={onDayPress}
        markedDates={{
          [selectedDate]: {
            selected: true,
            selectedColor: '#007AFF',
            selectedTextColor: 'white'
          }
        }}
        theme={{
          backgroundColor: '#ffffff',
          calendarBackground: '#ffffff',
          textSectionTitleColor: '#b6c1cd',
          selectedDayBackgroundColor: '#007AFF',
          selectedDayTextColor: '#ffffff',
          todayTextColor: '#007AFF',
          dayTextColor: '#2d4150',
          textDisabledColor: '#d9e1e8',
          dotColor: '#007AFF',
          selectedDotColor: '#ffffff',
          arrowColor: '#007AFF',
          disabledArrowColor: '#d9e1e8',
          monthTextColor: '#007AFF',
          indicatorColor: '#007AFF',
          textDayFontWeight: '300',
          textMonthFontWeight: 'bold',
          textDayHeaderFontWeight: '300',
          textDayFontSize: 16,
          textMonthFontSize: 16,
          textDayHeaderFontSize: 13
        }}
        style={styles.calendar}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 20,
  },
  calendar: {
    borderRadius: 10,
    elevation: 4,
    margin: 40,
    padding: 20,
    backgroundColor: '#ffffff',
  },
});

export default CalendarExample;
