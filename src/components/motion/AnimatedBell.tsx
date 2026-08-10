import React, { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import { Bell } from "lucide-react-native";
import { colors } from "@theme/index";

type Props = {
  trigger: number;
  size?: number;
};

const AnimatedBell = ({ trigger, size = 23 }: Props) => {
  const swing = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (trigger <= 0) {
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
  }, [swing, trigger]);

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
