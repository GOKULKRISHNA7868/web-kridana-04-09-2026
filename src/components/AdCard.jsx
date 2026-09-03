import React, { useEffect } from "react";
import {
  AdMob,
  BannerAdSize,
  BannerAdPosition,
} from "@capacitor-community/admob";
import { ADMOB_BANNER_ID, ADMOB_TESTING } from "../constants/admobConfig";

export default function AdCard() {
  useEffect(() => {
    const loadBanner = async () => {
      try {
        await AdMob.showBanner({
          adId: ADMOB_BANNER_ID,
          adSize: BannerAdSize.ADAPTIVE_BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          isTesting: ADMOB_TESTING,
        });
      } catch (e) {
        console.log(e);
      }
    };

    loadBanner();

    return () => {
      AdMob.hideBanner().catch(() => {});
    };
  }, []);

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
      <div className="px-4 py-2 border-b bg-gray-50">
        <p className="text-xs font-medium text-gray-500 uppercase">Sponsored</p>
      </div>

      <div className="h-[80px]" />
    </div>
  );
}
