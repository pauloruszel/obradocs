import React from "react";
import Svg, { G, Path } from "react-native-svg";
import { colors } from "@theme/index";

type Variant = "primary" | "monochrome" | "negative";

type Props = {
  size?: number;
  variant?: Variant;
  accessible?: boolean;
};

const variantColor: Record<Variant, string> = {
  primary: colors.primary,
  monochrome: "#0A1F3D",
  negative: colors.white,
};

/**
 * Símbolo vetorial do Obradocs.
 *
 * Conceito visual: estrutura/obra + documento + organização.
 * O desenho usa apenas paths, sem raster e sem dependência de fonte.
 */
const ObradocsBrandMark = ({
  size = 72,
  variant = "primary",
  accessible = true,
}: Props) => {
  const stroke = variantColor[variant];

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
        {/* Estrutura principal / obra */}
        <Path d="M25 79V34L49 16L79 39V79H25Z" />
        <Path d="M49 16V79" />

        {/* Documento em primeiro plano */}
        <Path d="M11 79V49L29 38V79" />
        <Path d="M20 79V57L38 46V79" />
      </G>
    </Svg>
  );
};

export default ObradocsBrandMark;
