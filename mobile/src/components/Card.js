/**
 * Card - A simple, clean card component
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, SIZES, SHADOWS } from '../../theme';

const Card = ({ children, style }) => {
  return <View style={[styles.card, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surfaceSolid,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});

export default Card;
