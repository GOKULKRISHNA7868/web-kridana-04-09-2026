import { registerPlugin } from "@capacitor/core";

const StepCounter = registerPlugin("StepCounter", {
  web: {
    async start() {
      throw new Error("WALK_WEB_UNSUPPORTED");
    },
    async stop() {},
    async checkPermissions() {
      return {
        activityRecognition: "denied",
        notifications: "denied",
        available: false,
        sensor: "none",
      };
    },
    async requestPermissions() {
      return {
        activityRecognition: "denied",
        notifications: "denied",
        available: false,
        sensor: "none",
      };
    },
    async getStatus() {
      return {
        available: false,
        sensor: "none",
        running: false,
        activityRecognition: "denied",
        notifications: "denied",
      };
    },
    addListener() {
      return { remove() {} };
    },
  },
});

export default StepCounter;
