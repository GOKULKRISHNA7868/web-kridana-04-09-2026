import React, { useEffect } from "react";
import { initializeAdMob } from "./utils/admob";
import { Routes, Route, useLocation } from "react-router-dom";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "./firebase";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { App as CapApp } from "@capacitor/app";

import { CartProvider } from "./context/CartContext";
import { WishlistProvider } from "./context/WishlistContext";
import { AuthProvider } from "./context/AuthContext";
import {
  ensureChatNotifications,
  isAppForeground,
  previewChatBody,
  resolveChatSenderName,
  showChatMessageNotification,
} from "./utils/chatNotifications";

import ScrollToTop from "./components/ScrollToTop";

import usePageTracking from "./hooks/usePageTracking";

/* ================= CORE PAGES ================= */
import RoleSelection from "./pages/RoleSelection.jsx";
import Signup from "./pages/Signup.jsx";
import TrainerSignup from "./pages/TrainerSignup.jsx";
import InstituteSignup from "./pages/InstituteSignup.jsx";
import Login from "./pages/Login.jsx";
import Landing from "./pages/Landing.jsx";
import UserChatBox from "./pages/ChatBox.jsx";
import FeePaymentSuccess from "./pages/FeePaymentSuccess";
import InstFeePaymentSuccess from "./pages/InstFeePaymentSuccess";

/* ================= NAVBAR ================= */
import Navbar from "./components/Navbar.jsx";

import About from "./pages/About.jsx";
import Career from "./pages/Career.jsx";
import Contact from "./pages/Contact.jsx";

/* ================= SHOP ================= */
import ShopPage from "./components/ShopPage.jsx";
import ProductsGridPage from "./components/ProductsGridPage.jsx";
import AddAddressPage from "./components/AddAddressPage.jsx";
import PaymentPage from "./components/PaymentPage.jsx";
import CartPage from "./components/CartPage.jsx";
import WishlistPage from "./components/WishlistPage.jsx";

import ReelViewer from "./pages/ReelViewer";
import Reelspage from "./pages/Reelspage.jsx";
import Howitworkdchatbox from "./pages/Howitworkdchatbox";
/* ================= DASHBOARDS ================= */
import InstituteDashboard from "./components/InstituteDashboard";
import TrainersDashboard from "./components/TrainersDashboard";
import UserDashboard from "./components/UserDashboard";

/* ================= LIST & DETAILS ================= */
import ViewInstitutes from "./pages/ViewInstitutes.jsx";
import ViewTrainers from "./pages/ViewTrainers.jsx";

import InstituteDetailsPage from "./pages/InstituteDetailsPage.jsx";
import TrainerDetailsPage from "./pages/TrainerDetailsPage.jsx";

import Terms from "./pages/Terms.jsx";
import Privacy from "./pages/Privacy.jsx";
import PaymentPolicy from "./pages/PaymentPolicy.jsx";
import CustomerCentricPolicies from "./pages/CustomerCentricPolicies.jsx";
import DeliveryAndShippingPolicy from "./pages/DeliveryAndShippingPolicy.jsx";

/* ================= SELL FLOW ================= */
import SellSportsMaterial from "./components/InstituteDashboard/SellSportsMaterial.jsx";
import UploadProductDetails from "./components/InstituteDashboard/UploadProductDetails.jsx";

import ChatBox1 from "./components/InstituteDashboard/ChatBox.jsx";

/* ================= SERVICES ================= */
import MartialArts from "./pages/Services/MartialArts.jsx";
import TeamBallSports from "./pages/Services/TeamBallSports.jsx";
import RacketSports from "./pages/Services/RacketSports.jsx";
import Fitness from "./pages/Services/Fitness.jsx";
import TargetPrecisionSports from "./pages/Services/TargetPrecisionSports.jsx";
import EquestrianSports from "./pages/Services/EquestrianSports.jsx";
import AdventureOutdoorSports from "./pages/Services/AdventureOutdoorSports.jsx";
import IceSports from "./pages/Services/IceSports.jsx";
import Wellness from "./pages/Services/Wellness.jsx";
import Dance from "./pages/Services/Dance.jsx";
import AquaticSports from "./pages/Services/AquaticSports.jsx";
import FitnessDashboard from "./pages/Fitness/FitnessDashboard.jsx";
import ActiveWalk from "./pages/Fitness/ActiveWalk.jsx";
import Categories from "./pages/Categories";

import AvailableDemoClasses from "./pages/AvailableDemoClasses.jsx";

import "./index.css";

import Plans from "./pages/Plans.jsx";

import ProtectedRoute from "./routes/ProtectedRoute";

import PaymentAndRefundPolicy from "./pages/PaymentAndRefundPolicy";

import ChatBox from "./pages/ChatBox.jsx";

import PaymentSuccess from "./components/PaymentSuccess.jsx";
import PaymentFailed from "./components/PaymentFailed.jsx";

import { SelectedStudentProvider } from "./context/SelectedStudentContext";

import ResetPassword from "./pages/ResetPassword";

import Feedback from "./pages/Feedback";

import HelpCenter from "./pages/HelpCenter.jsx";

import MobileCategoriesPage from "./pages/MobileCategoriesPage";

import MobileEditprofile from "./pages/MobileEditprofile";

import PendingFeesDetails from "./components/InstituteDashboard/PendingFeesDetails";

import StudentsAttendancePage from "./components/InstituteDashboard/StudentsAttendancePage";

import TrainerStudentsPage from "./components/TrainersDashboard/TrainerStudentsPage";

import Uploadimages from "./pages/Uploadimages";

import SuggestedPage from "./pages/SuggestedPage.jsx";

import ChatBoxT from "./components/TrainersDashboard/ChatBox";

import ChatBoxS from "./components/UserDashboard/ChatBox";

import Reelsdata from "./components/TrainersDashboard/Reelsdata.jsx";

import InstituteReelsdata from "./components/InstituteDashboard/Reelsdata.jsx";

import AllPeoplePage from "./pages/AllPeoplePage";

import PaymentMethodPage from "./pages/PaymentMethodPage.jsx";

import Paymentselection from "./components/UserDashboard/paymentselection.jsx";

import TrainerPaymentSelection from "./components/UserDashboard/TrainerPaymentSelection.jsx";

function App() {
  useEffect(() => {
    initializeAdMob();
  }, []);

  usePageTracking();

  const location = useLocation();

  /* =========================================================
     HIDE NAVBAR
  ========================================================= */
  const hideNavbarPaths = [
    "/RoleSelection",
    "/login",
    "/signup",
    "/trainer-signup",
    "/institute-signup",
  ];

  const hideFooterPaths = ["/RoleSelection"];

  const showNavbar = !hideNavbarPaths.includes(location.pathname);

  const showFooter = !hideFooterPaths.includes(location.pathname);
  /* =========================================================
     BLOCK ONLY EDGE GESTURES
     FIXED MOBILE SIDE SCROLL ISSUE
  ========================================================= */
  useEffect(() => {
    let startX = 0;

    const EDGE_SIZE = 20;

    const handleTouchStart = (e) => {
      startX = e.touches[0].clientX;
    };

    const handleTouchMove = (e) => {
      const currentX = e.touches[0].clientX;

      if (startX <= EDGE_SIZE && currentX > startX) {
        e.preventDefault();
        return;
      }

      if (startX >= window.innerWidth - EDGE_SIZE && currentX < startX) {
        e.preventDefault();
        return;
      }
    };

    document.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });

    document.addEventListener("touchmove", handleTouchMove, { passive: false });

    let backListener;

    CapApp.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        CapApp.exitApp();
      }
    }).then((listener) => {
      backListener = listener;
    });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);

      document.removeEventListener("touchmove", handleTouchMove);

      backListener?.remove();
    };
  }, []);

  /* =========================================================
     MOBILE NOTIFICATIONS
  ========================================================= */
  /* =========================================================
   LOCAL NOTIFICATION CHANNEL
========================================================= */
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let appStateListener;

    const initNotifications = async () => {
      try {
        await ensureChatNotifications();
      } catch (error) {
        console.error("Notification initialization error:", error);
      }
    };

    initNotifications();

    CapApp.addListener("appStateChange", ({ isActive }) => {
      console.log("App Active:", isActive);
    }).then((listener) => {
      appStateListener = listener;
    });

    return () => {
      appStateListener?.remove();
    };
  }, []);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let registrationListener;
    let registrationErrorListener;
    let notificationClickListener;
    let receivedListener;

    const setupPushNotifications = async () => {
      try {
        let permission = await PushNotifications.checkPermissions();

        if (permission.receive !== "granted") {
          permission = await PushNotifications.requestPermissions();
        }

        if (permission.receive !== "granted") {
          console.log("Push notification permission denied");
          return;
        }

        registrationListener = await PushNotifications.addListener(
          "registration",
          async (token) => {
            const currentUser = auth.currentUser;
            if (!currentUser || !token?.value) return;

            try {
              await setDoc(
                doc(db, "deviceTokens", currentUser.uid),
                {
                  uid: currentUser.uid,
                  token: token.value,
                  platform: Capacitor.getPlatform(),
                  updatedAt: serverTimestamp(),
                },
                { merge: true },
              );
            } catch (error) {
              console.error("Failed to save device token:", error);
            }
          },
        );

        registrationErrorListener = await PushNotifications.addListener(
          "registrationError",
          (error) => {
            console.error("Push registration error:", error);
          },
        );

        receivedListener = await PushNotifications.addListener(
          "pushNotificationReceived",
          async (notification) => {
            const data = notification?.data || {};
            const chatId = data.chatId;
            if (!chatId) return;

            const senderName =
              notification.title ||
              (await resolveChatSenderName(data.senderId, "New message"));
            const text = previewChatBody({
              text: notification.body || data.body,
            });

            window.dispatchEvent(
              new CustomEvent("kridana-incoming-chat", {
                detail: {
                  chatId,
                  senderName,
                  text,
                  senderId: data.senderId,
                  type: data.type || "individual",
                },
              }),
            );

            if (!isAppForeground()) return;
            await showChatMessageNotification({
              chatId,
              senderName,
              body: text,
              extra: { senderId: data.senderId, type: data.type },
            });
          },
        );

        notificationClickListener = await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (event) => {
            const data = event.notification?.data || {};
            const type = String(data.type || "");
            if (type === "walking" || type === "walking_reminder") {
              window.location.href = "/Fitness/fitnessdashboard";
              return;
            }
            if (type === "friendRequest") {
              window.location.href = "/ChatBox";
              return;
            }
            const chatId = data.chatId;
            if (chatId) {
              window.location.href = `/chat/${encodeURIComponent(chatId)}`;
              return;
            }
            window.location.href = "/ChatBox";
          },
        );

        await PushNotifications.register();
      } catch (error) {
        console.error("FCM setup error:", error);
      }
    };

    setupPushNotifications();

    return () => {
      registrationListener?.remove();
      registrationErrorListener?.remove();
      notificationClickListener?.remove();
      receivedListener?.remove();
    };
  }, []);
  return (
    <AuthProvider>
      <SelectedStudentProvider>
        <CartProvider>
          <WishlistProvider>
            <div
              className="
    bg-white
    text-black
    min-h-screen
    overflow-x-hidden
    touch-pan-x touch-pan-y
    md:pb-0
  "
              style={{
                overscrollBehaviorX: "none",
                WebkitOverflowScrolling: "touch",
                paddingBottom:
                  window.innerWidth < 768
                    ? "calc(0px + env(safe-area-inset-bottom))"
                    : "0px",
              }}
            >
              {showNavbar && <Navbar />}

              <ScrollToTop />
              <main
                className="app-content w-full max-w-none pb-[90px] md:pb-0"
                style={{
                  paddingBottom:
                    window.innerWidth < 768
                      ? "calc(0px + env(safe-area-inset-bottom))"
                      : "0px",
                }}
              >
                <Routes>
                  {/* =====================================================
                    AUTH
                ===================================================== */}
                  <Route path="AllPeoplePage" element={<AllPeoplePage />} />

                  <Route
                    path="/PaymentMethodPage"
                    element={<PaymentMethodPage />}
                  />
                  <Route path="/ChatBox" element={<UserChatBox />} />
                  <Route
                    path="/TrainerPaymentSelection"
                    element={<TrainerPaymentSelection />}
                  />

                  <Route
                    path="/paymentselection"
                    element={<Paymentselection />}
                  />

                  <Route path="/about" element={<About />} />
                  <Route
                    path="/Howitworkdchatbox"
                    element={<Howitworkdchatbox />}
                  />
                  <Route path="/career" element={<Career />} />

                  <Route path="/contact" element={<Contact />} />

                  <Route path="/" element={<Landing />} />

                  <Route path="/login" element={<Login />} />

                  <Route path="/signup" element={<Signup />} />

                  <Route path="/trainer-signup" element={<TrainerSignup />} />

                  <Route
                    path="/institute-signup"
                    element={<InstituteSignup />}
                  />

                  <Route path="/chat/:chatId" element={<ChatBox />} />

                  <Route
                    path="/MobileCategoriesPage"
                    element={<MobileCategoriesPage />}
                  />

                  <Route
                    path="/MobileEditprofile"
                    element={<MobileEditprofile />}
                  />

                  <Route
                    path="/StudentsAttendancePage"
                    element={<StudentsAttendancePage />}
                  />

                  <Route
                    path="/TrainerStudentsPage"
                    element={<TrainerStudentsPage />}
                  />

                  <Route path="/feedback" element={<Feedback />} />

                  <Route path="/help-center" element={<HelpCenter />} />

                  <Route
                    path="/pending-fees/:branch"
                    element={<PendingFeesDetails />}
                  />

                  <Route path="/Uploadimages" element={<Uploadimages />} />

                  <Route
                    path="/components/InstituteDashboard/ChatBox"
                    element={<ChatBox1 />}
                  />

                  <Route path="/ChatBox" element={<ChatBoxT />} />

                  <Route
                    path="/components/UserDashboard/ChatBox"
                    element={<ChatBoxS />}
                  />

                  {/* =====================================================
                    LANDING
                ===================================================== */}
                  <Route path="/RoleSelection" element={<RoleSelection />} />

                  <Route path="/reels/:index" element={<ReelViewer />} />

                  <Route path="/trending-plays" element={<Reelspage />} />

                  <Route
                    path="/feepaymentsuccess"
                    element={<FeePaymentSuccess />}
                  />

                  <Route
                    path="/Instfeepaymentsuccess"
                    element={<InstFeePaymentSuccess />}
                  />

                  {/* =====================================================
                    DASHBOARDS
                ===================================================== */}
                  <Route
                    path="/trainers/dashboard"
                    element={
                      <ProtectedRoute role="trainer">
                        <TrainersDashboard />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/institutes/dashboard"
                    element={
                      <ProtectedRoute role="institute">
                        <InstituteDashboard />
                      </ProtectedRoute>
                    }
                  />

                  <Route path="/user/dashboard" element={<UserDashboard />} />

                  {/* =====================================================
                    SELL
                ===================================================== */}
                  <Route
                    path="/sell-sports-material"
                    element={<SellSportsMaterial />}
                  />

                  <Route
                    path="/upload-product-details"
                    element={<UploadProductDetails />}
                  />

                  {/* =====================================================
                    SHOP
                ===================================================== */}
                  <Route
                    path="/components/TrainersDashboard/reelsdata"
                    element={<Reelsdata />}
                  />

                  <Route
                    path="/components/InstituteDashboard/Reelsdata"
                    element={<InstituteReelsdata />}
                  />

                  <Route path="/shop" element={<ShopPage />} />

                  <Route
                    path="/shop/:category"
                    element={<ProductsGridPage />}
                  />

                  <Route path="/addresspage" element={<AddAddressPage />} />

                  <Route path="/payment" element={<PaymentPage />} />

                  <Route path="/payment-failed" element={<PaymentFailed />} />

                  <Route path="/payment-success" element={<PaymentSuccess />} />

                  <Route path="/cart" element={<CartPage />} />

                  <Route path="/wishlist" element={<WishlistPage />} />

                  <Route
                    path="/components/TrainersDashboard/ChatBox"
                    element={<ChatBoxT />}
                  />

                  {/* =====================================================
                    DETAILS
                ===================================================== */}
                  <Route path="/trainers" element={<ViewTrainers />} />

                  <Route path="/institutes" element={<ViewInstitutes />} />

                  <Route
                    path="/trainers/:id"
                    element={<TrainerDetailsPage />}
                  />

                  <Route
                    path="/institutes/:id"
                    element={<InstituteDetailsPage />}
                  />

                  <Route path="/viewTrainers" element={<ViewTrainers />} />

                  <Route path="/viewInstitutes" element={<ViewInstitutes />} />

                  <Route path="/terms" element={<Terms />} />

                  <Route path="/privacy" element={<Privacy />} />

                  <Route path="/paymentpolicy" element={<PaymentPolicy />} />

                  <Route path="/reset-password" element={<ResetPassword />} />

                  <Route
                    path="/customer-policies"
                    element={<CustomerCentricPolicies />}
                  />

                  <Route
                    path="/delivery-shipping-policy"
                    element={<DeliveryAndShippingPolicy />}
                  />

                  <Route
                    path="/payment-refund-policy"
                    element={<PaymentAndRefundPolicy />}
                  />

                  {/* =====================================================
                    SERVICES
                ===================================================== */}
                  <Route path="/categories" element={<Categories />} />

                  <Route
                    path="/services/martial-arts"
                    element={<MartialArts />}
                  />

                  <Route
                    path="/services/teamball"
                    element={<TeamBallSports />}
                  />

                  <Route
                    path="/services/racketsports"
                    element={<RacketSports />}
                  />

                  <Route path="/services/fitness" element={<Fitness />} />

                  <Route
                    path="/services/target-precision-sports"
                    element={<TargetPrecisionSports />}
                  />

                  <Route
                    path="/services/equestrian-sports"
                    element={<EquestrianSports />}
                  />

                  <Route
                    path="/services/adventure-outdoor-sports"
                    element={<AdventureOutdoorSports />}
                  />

                  <Route path="/services/ice-sports" element={<IceSports />} />

                  <Route path="/services/wellness" element={<Wellness />} />

                  <Route path="/services/dance" element={<Dance />} />

                  <Route path="/services/aquatic" element={<AquaticSports />} />

                  <Route path="/plans" element={<Plans />} />

                  <Route
                    path="/book-demo/:instituteId"
                    element={<AvailableDemoClasses />}
                  />
                  <Route
                    path="/Fitness/fitnessdashboard"
                    element={<FitnessDashboard />}
                  />
                  <Route path="/Fitness/ActiveWalk" element={<ActiveWalk />} />
                </Routes>
              </main>
            </div>
          </WishlistProvider>
        </CartProvider>
      </SelectedStudentProvider>
    </AuthProvider>
  );
}

export default App;
