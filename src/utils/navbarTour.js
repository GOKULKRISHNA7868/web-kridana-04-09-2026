const TOUR_KEY = "kridana_navbar_tour_v1";

export function hasCompletedNavbarTour() {
  try {
    return localStorage.getItem(TOUR_KEY) === "done";
  } catch {
    return false;
  }
}

export function markNavbarTourComplete() {
  try {
    localStorage.setItem(TOUR_KEY, "done");
  } catch {
    /* ignore quota / private mode */
  }
}

export const NAVBAR_TOUR_STEPS = [
  {
    id: "welcome",
    target: null,
    title: "Welcome to Kridana",
    body: "A quick 6-step tour of the bottom bar so you can move around the app with confidence.",
  },
  {
    id: "home",
    target: "nav-home",
    title: "Home",
    body: "Your feed and discovery hub — browse community posts, reels, and find trainers or academies.",
  },
  {
    id: "dashboard",
    target: "nav-dashboard",
    title: "Dashboard",
    body: "Your personal control center for attendance, fees, schedules, and account tools after you sign in.",
  },
  {
    id: "categories",
    target: "nav-categories",
    title: "Categories",
    body: "Explore sports and wellness categories to find trainers and academies that match you.",
  },
  {
    id: "chat",
    target: "nav-chat",
    title: "Chat",
    body: "Message trainers, academies, and friends. Unread badges appear here when you have new chats.",
  },
  {
    id: "more",
    target: "nav-more",
    title: "More",
    body: "Notifications, help, and settings — plus Upload in Quick actions. Everything else lives here.",
  },
];
