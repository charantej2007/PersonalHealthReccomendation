import { createBrowserRouter } from "react-router";
import { SplashScreen } from "./screens/SplashScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { SignUpScreen } from "./screens/SignUpScreen";
import { SignUpOtpScreen } from "./screens/SignUpOtpScreen";
import { ForgotPasswordScreen } from "./screens/ForgotPasswordScreen";
import { ForgotPasswordOtpScreen } from "./screens/ForgotPasswordOtpScreen";
import { ResetPasswordScreen } from "./screens/ResetPasswordScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { EnterHealthDataScreen } from "./screens/EnterHealthDataScreen";
import { CompleteProfileScreen } from "./screens/CompleteProfileScreen";
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
    path: "/signup-otp",
    Component: SignUpOtpScreen,
  },
  {
    path: "/forgot-password",
    Component: ForgotPasswordScreen,
  },
  {
    path: "/forgot-password-otp",
    Component: ForgotPasswordOtpScreen,
  },
  {
    path: "/reset-password",
    Component: ResetPasswordScreen,
  },
  {
    path: "/complete-profile",
    Component: CompleteProfileScreen,
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
