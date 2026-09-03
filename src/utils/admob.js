import { AdMob } from "@capacitor-community/admob";
import { ADMOB_TESTING } from "../constants/admobConfig";

export const initializeAdMob = async () => {
  try {
    await AdMob.initialize({
      requestTrackingAuthorization: true,
      testingDevices: [],
      initializeForTesting: ADMOB_TESTING,
    });
  } catch (err) {
    console.error("AdMob init error:", err);
  }
};
