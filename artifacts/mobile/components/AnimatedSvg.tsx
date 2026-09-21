import React, { forwardRef } from 'react';
import { Animated, Platform } from 'react-native';
import { Circle, Polyline, type CircleProps, type PolylineProps } from 'react-native-svg';

// RN Animated injects a native-only prop that SVG must not forward to the DOM.
const WebCircle = forwardRef<Circle, CircleProps & { collapsable?: boolean }>(
  ({ collapsable: _collapsable, ...props }, ref) => <Circle {...props} ref={ref} />,
);
const WebPolyline = forwardRef<Polyline, PolylineProps & { collapsable?: boolean }>(
  ({ collapsable: _collapsable, ...props }, ref) => <Polyline {...props} ref={ref} />,
);

export const AnimatedCircle = Animated.createAnimatedComponent(
  Platform.OS === 'web' ? WebCircle : Circle,
);
export const AnimatedPolyline = Animated.createAnimatedComponent(
  Platform.OS === 'web' ? WebPolyline : Polyline,
);