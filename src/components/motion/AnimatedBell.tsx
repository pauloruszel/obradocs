import React, { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import { Bell } from "lucide-react-native";
import useReducedMotion from "../../hooks/useReducedMotion";
import { colors } from "@theme/index";
import { shouldAnimateBell } from "@utils/motion";

type Props = {
  trigger: number;
  size?: number;
};

const AnimatedBell = ({ trigger, size = 23 }: Props) => {
  const swing = useRef(new Animated.Value(0)).current;
  const previousTrigger = useRef(trigger);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const previous = previousTrigger.current;
    previousTrigger.current = trigger;

    if (reduceMotion !== false || !shouldAnimateBell(previous, trigger)) {
      swing.setValue(0);
      return;
    }

    swing.setValue(0);
    const animation = Animated.sequence([
      Animated.timing(swing, {
        toValue: -1,
        duration: 80,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(swing, {
        toValue: 1,
        duration: 120,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(swing, {
        toValue: -0.55,
        duration: 100,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(swing, {
        toValue: 0.35,
        duration: 90,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(swing, {
        toValue: 0,
        duration: 80,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    animation.start();

    return () => animation.stop();
  }, [reduceMotion, swing, trigger]);

  const rotate = swing.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["-8deg", "0deg", "8deg"],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{ transform: [{ rotate }] }}
    >
      <Bell size={size} color={colors.primary} />
    </Animated.View>
  );
};

export default AnimatedBell;
