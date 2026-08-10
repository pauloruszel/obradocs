import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, ViewStyle } from "react-native";
import ObradocsBrandMark from "@components/brand/ObradocsBrandMark";

type Variant = "primary" | "monochrome" | "negative";

type Props = {
  size?: number;
  animated?: boolean;
  accessible?: boolean;
  variant?: Variant;
  style?: ViewStyle;
};

const ObradocsLogo = ({
  size = 72,
  animated = false,
  accessible = true,
  variant = "primary",
  style,
}: Props) => {
  const structure = useRef(new Animated.Value(animated ? 0 : 1)).current;
  const document = useRef(new Animated.Value(animated ? 0 : 1)).current;
  const reveal = useRef(new Animated.Value(animated ? 0 : 1)).current;

  useEffect(() => {
    if (!animated) {
      structure.setValue(1);
      document.setValue(1);
      reveal.setValue(1);
      return;
    }

    structure.setValue(0);
    document.setValue(0);
    reveal.setValue(0);

    const animation = Animated.sequence([
      Animated.timing(structure, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(document, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(reveal, {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
      ]),
    ]);

    animation.start();
    return () => animation.stop();
  }, [animated, document, reveal, structure]);

  const scale = reveal.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1],
  });

  return (
    <Animated.View
      style={[styles.container, { width: size, height: size, transform: [{ scale }] }, style]}
      accessible={accessible}
      accessibilityRole={accessible ? "image" : undefined}
      accessibilityLabel={accessible ? "Obradocs" : undefined}
    >
      <Animated.View style={[styles.layer, { opacity: structure }]}>
        <ObradocsBrandMark
          size={size}
          variant={variant}
          layer="structure"
          accessible={false}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.layer,
          {
            opacity: document,
            transform: [
              {
                translateY: document.interpolate({
                  inputRange: [0, 1],
                  outputRange: [4, 0],
                }),
              },
            ],
          },
        ]}
      >
        <ObradocsBrandMark
          size={size}
          variant={variant}
          layer="document"
          accessible={false}
        />
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default ObradocsLogo;
