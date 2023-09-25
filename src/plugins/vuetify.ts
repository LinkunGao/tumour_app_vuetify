/**
 * plugins/vuetify.ts
 *
 * Framework documentation: https://vuetifyjs.com`
 */

// Styles
import "@mdi/font/css/materialdesignicons.css";
import "vuetify/styles";

import { md3 } from "vuetify/blueprints";

// Composables
import { createVuetify, ThemeDefinition } from "vuetify";

const lightTheme: ThemeDefinition = {
  dark: false,
  colors: {
    background: "#FFFEFB",
    surface: "#fff8ec",
    primary: "#6200EE",
    "primary-darken-1": "#3700B3",
    secondary: "#03DAC6",
    "secondary-darken-1": "#018786",
    error: "#B00020",
    info: "#2196F3",
    success: "#4CAF50",
    warning: "#FB8C00",
  },
};

const darkTheme: ThemeDefinition = {
  dark: true,
  colors: {
    background: "#000307",
    surface: "#000A13",
    primary: "#fff8ec",
    "primary-font": "#fff8ec",
    secondary: "#03dac6",
    "secondary-font": "#009688",
    error: "#f44336",
    info: "#2196F3",
    success: "#4caf50",
    warning: "#fb8c00",
  },
};

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  blueprint: md3,
  theme: {
    defaultTheme: "darkTheme",
    themes: {
      lightTheme,
      darkTheme,
    },
    // themes: {
    //   light: {
    //     colors: {
    //       primary: "#1867C0",
    //       secondary: "#5CBBF6",
    //     },
    //   },
    // },
  },
});
