import React from 'react';
import { View, StyleSheet, ScrollView, Platform, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * ScreenWrapper — wraps every patient screen with safe-area and consistent
 * background colour.  Use instead of a plain <View> at the root of each screen.
 */
export function ScreenWrapper({ children, style }: ScreenWrapperProps) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[styles.content, style]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Platform.select({ ios: '#f0f4f8', android: '#f0f4f8', default: '#f0f4f8' }),
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 16,
  },
});
