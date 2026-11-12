import { Redirect } from 'expo-router';

/**
 * Google sign-in returns to manna://auth-callback. The sign-in screen
 * finishes it; if the app opens here on its own, go home.
 */
export default function AuthCallback() {
  return <Redirect href="/" />;
}
