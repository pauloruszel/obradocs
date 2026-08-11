import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import ObradocsBrandMark from "@components/brand/ObradocsBrandMark";
import useReducedMotion from "../../hooks/useReducedMotion";

type Props = {
  size?: number;
  accessibilityLabel?: string;
};

const ObradocsUploadMotion = ({
  size = 50,
  accessibilityLabel = "Enviando arquivo",
}: Props) => {
  const progress = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion !== false) {
      progress.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 560,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(360),
        Animated.timing(progress, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [progress, reduceMotion]);

  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.layer}>
        <ObradocsBrandMark size={size} layer="structure" accessible={false} />
      </View>
      <Animated.View
        style={[
          styles.layer,
          {
            opacity: progress,
            transform: [
              {
                translateY: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-10, 0],
                }),
              },
            ],
          },
        ]}
      >
        <ObradocsBrandMark size={size} layer="document" accessible={false} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center" },
  layer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default ObradocsUploadMotion;
