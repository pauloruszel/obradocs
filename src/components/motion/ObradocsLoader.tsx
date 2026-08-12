import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Platform, StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import ObradocsLogo from "@components/motion/ObradocsLogo";
import useReducedMotion from "../../hooks/useReducedMotion";
import { colors } from "@theme/index";

type Props = {
  size?: number;
  accessibilityLabel?: string;
};

const ObradocsLoader = ({
  size = 72,
  accessibilityLabel = "Carregando",
}: Props) => {
  const rotation = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReducedMotion();
  const radius = size * 0.44;
  const circumference = useMemo(() => 2 * Math.PI * radius, [radius]);

  useEffect(() => {
    if (reduceMotion !== false) {
      rotation.setValue(0);
      pulse.setValue(0);
      return;
    }

    const spinAnimation = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== "web",
      }),
    );
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 650,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 650,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    );

    spinAnimation.start();
    pulseAnimation.start();

    return () => {
      spinAnimation.stop();
      pulseAnimation.stop();
    };
  }, [pulse, reduceMotion, rotation]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
  const logoScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.03],
  });

  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          styles.center,
          { transform: [{ rotate: spin }] },
        ]}
      >
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colors.primarySoft}
            strokeWidth={2.5}
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colors.primary}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray={`${circumference * 0.7} ${circumference * 0.3}`}
          />
        </Svg>
      </Animated.View>
      <Animated.View style={{ transform: [{ scale: logoScale }] }}>
        <ObradocsLogo size={size * 0.66} accessible={false} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
});

export default ObradocsLoader;
