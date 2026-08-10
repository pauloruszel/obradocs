import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  ImageStyle,
  StyleProp,
} from "react-native";
import logo from "../../../assets/logo-obradocs.png";

type Props = {
  size?: number;
  animated?: boolean;
  accessible?: boolean;
  style?: StyleProp<ImageStyle>;
};

const ObradocsLogo = ({
  size = 72,
  animated = false,
  accessible = true,
  style,
}: Props) => {
  const progress = useRef(new Animated.Value(animated ? 0 : 1)).current;

  useEffect(() => {
    if (!animated) {
      progress.setValue(1);
      return;
    }

    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();

    return () => animation.stop();
  }, [animated, progress]);

  return (
    <Animated.Image
      source={logo}
      resizeMode="contain"
      accessibilityRole={accessible ? "image" : undefined}
      accessibilityLabel={accessible ? "Obradocs" : undefined}
      accessibilityIgnoresInvertColors
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity: progress,
          transform: [
            {
              scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.94, 1],
              }),
            },
          ],
        },
        style,
      ]}
    />
  );
};

export default ObradocsLogo;
