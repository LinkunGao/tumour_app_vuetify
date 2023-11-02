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
    background: "#FFFDF7",
    // surface: "#fff8ec",
    surface: "#FFF3E0",
    primary: "#E53935",
    "primary-darken-1": "#3700B3",
    "secondary-darken-1": "#018786",
    error: "#B00020",
    info: "#2196F3",
    success: "#4CAF50",
    warning: "#FB8C00",
    "nav-success": "#FF5722",
    "nav-success-2": "#FF6D00",
    "segement-panel": "#FFF8E1",
    "three-d-panel": "#FFF8E1",
    "split-line": "#FF8F00",
    switcher: "#FF5722",
  },
};

const darkTheme: ThemeDefinition = {
  dark: true,
  colors: {
    background: "#282c34",
    surface: "#21252b",
    primary: "#fff8ec",
    "primary-font": "#fff8ec",
    "secondary-font": "#009688",
    error: "#f44336",
    info: "#2196F3",
    success: "#4caf50",
    warning: "#fb8c00",
    "nav-success": "#009688",
    "nav-success-2": "#26C6DA",
    "segement-panel": "#F4511E",
    "three-d-panel": "#43A047",
    "split-line": "#009688",
    switcher: "#FF5722",
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
