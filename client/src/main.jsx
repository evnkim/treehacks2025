// client/src/main.jsx

import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import "./index.css";
import "@mantine/core/styles.css";
import { createTheme, MantineProvider, rem } from "@mantine/core";


const theme = createTheme({
  fontFamily: "Lexend, sans-serif",
  fontFamilyMonospace: "Roboto Mono, monospace",
  headings: { fontFamily: "Lexend, sans-serif" },
  colors: {
    // due to the way that default colors work in mantine, this color gradient is
    // inverted, i.e., darkest to lightest. if the theme ever changes, the new color
    // scheme should follow this inverted pattern, otherwise the app may look/feel
    // different than before.
    "blue": [
      "#4593CC",
      "#499BD7",
      "#4CA4E3",
      "#50ACEE",
      "#54B4F9",
      "#58BCFF",
      "#5CC4FF",
      "#60CCFF",
      "#63D5FF",
      "#67DDFF",
    ],
  },
  primaryColor: "blue",
  spacing: {
    xs: rem(4),
    sm: rem(8),
    md: rem(12),
    lg: rem(16),
    xl: rem(20),
    xxl: rem(32),
    xxxl: rem(36),
  },
  fontSizes: {
    xs: rem(12),
    sm: rem(14),
    md: rem(16),
    lg: rem(18),
    xl: rem(20),
    xxl: rem(24),
    xxxl: rem(30),
    xxxxl: rem(36),
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MantineProvider theme={theme}>
      <RouterProvider router={router} />
    </MantineProvider>
  </React.StrictMode>
);
