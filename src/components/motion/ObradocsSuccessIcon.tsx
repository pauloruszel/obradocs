import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";
import { Check } from "lucide-react-native";
import useReducedMotion from "../../hooks/useReducedMotion";
import { colors } from "@theme/index";

const ObradocsSuccessIcon = () => {
  const scale = useRef(new Animated.Value(0.82)).current;
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion !== false) {
      scale.setValue(1);
      return;
    }
    const animation = Animated.spring(scale, {
      toValue: 1,
      speed: 24,
      bounciness: 6,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [reduceMotion, scale]);

  return (
    <Animated.View style={[styles.container, { transform: [{ scale }] }]}>
      <Check size={18} strokeWidth={3} color={colors.white} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.success,
  },
});

export default ObradocsSuccessIcon;
