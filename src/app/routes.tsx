import { createBrowserRouter } from "react-router";
import { SplashScreen } from "./screens/SplashScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { SignUpScreen } from "./screens/SignUpScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { EnterHealthDataScreen } from "./screens/EnterHealthDataScreen";
import { RecommendationsScreen } from "./screens/RecommendationsScreen";
import { TrackingScreen } from "./screens/TrackingScreen";
import { ReminderScreen } from "./screens/ReminderScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { ReportsScreen } from "./screens/ReportsScreen";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: SplashScreen,
  },
  {
    path: "/login",
    Component: LoginScreen,
  },
  {
    path: "/signup",
    Component: SignUpScreen,
  },
  {
    path: "/home",
    Component: HomeScreen,
  },
  {
    path: "/enter-data",
    Component: EnterHealthDataScreen,
  },
  {
    path: "/recommendations",
    Component: RecommendationsScreen,
  },
  {
    path: "/track",
    Component: TrackingScreen,
  },
  {
    path: "/reminders",
    Component: ReminderScreen,
  },
  {
    path: "/profile",
    Component: ProfileScreen,
  },
  {
    path: "/reports",
    Component: ReportsScreen,
  },
]);
