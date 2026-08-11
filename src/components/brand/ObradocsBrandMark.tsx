import React from "react";
import { Animated } from "react-native";
import Svg, { G, Path } from "react-native-svg";
import { colors } from "@theme/index";

type Variant = "primary" | "monochrome" | "negative";
type Layer = "all" | "structure" | "document";

type Props = {
  size?: number;
  variant?: Variant;
  layer?: Layer;
  accessible?: boolean;
  structureProgress?: Animated.Value;
};

const AnimatedPath = Animated.createAnimatedComponent(Path);

const variantColor: Record<Variant, string> = {
  primary: colors.primary,
  monochrome: colors.brandNavy,
  negative: colors.white,
};

/**
 * Símbolo vetorial do Obradocs.
 *
 * Conceito visual: estrutura/obra + documento + organização.
 * O desenho usa apenas paths, sem raster e sem dependência de fonte.
 * As camadas independentes permitem animações sem alterar a geometria da marca.
 */
const ObradocsBrandMark = ({
  size = 72,
  variant = "primary",
  layer = "all",
  accessible = true,
  structureProgress,
}: Props) => {
  const stroke = variantColor[variant];
  const showStructure = layer === "all" || layer === "structure";
  const showDocument = layer === "all" || layer === "document";

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      accessibilityRole={accessible ? "image" : undefined}
      accessibilityLabel={accessible ? "Símbolo do Obradocs" : undefined}
    >
      <G
        stroke={stroke}
        strokeWidth={5.5}
        strokeLinejoin="miter"
        strokeLinecap="square"
      >
        {showStructure && (
          <>
            <AnimatedPath
              d="M25 79V34L49 16L79 39V79H25Z"
              strokeDasharray="220 220"
              strokeDashoffset={structureProgress?.interpolate({
                inputRange: [0, 1],
                outputRange: [220, 0],
              })}
            />
            <AnimatedPath
              d="M49 16V79"
              strokeDasharray="63 63"
              strokeDashoffset={structureProgress?.interpolate({
                inputRange: [0, 1],
                outputRange: [63, 0],
              })}
            />
          </>
        )}

        {showDocument && (
          <>
            <Path d="M11 79V49L29 38V79" />
            <Path d="M20 79V57L38 46V79" />
          </>
        )}
      </G>
    </Svg>
  );
};

export default ObradocsBrandMark;
