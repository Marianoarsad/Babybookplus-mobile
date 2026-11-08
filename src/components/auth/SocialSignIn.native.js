import React, { useRef, useState } from "react";
import { Text, View } from "react-native";
import { space } from "../../theme";
import PulseLoader from "../ui/PulseLoader";
import { SocialAuthButton } from "./AuthControls";
import GoogleMark from "./GoogleMark";
import { useTheme } from "../../context/ThemeContext";

const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export default function SocialSignIn({ onCredential, onError, loadingProvider, disabled = false }) {
    const pending = useRef(false);
    const { colors } = useTheme();
    const [signInError, setSignInError] = useState("");
    const [signingIn, setSigningIn] = useState(false);
    const busy = signingIn || loadingProvider === "google";

    const googleSignIn = async () => {
        if (!googleClientId || disabled || loadingProvider || pending.current) return;
        setSignInError("");
        pending.current = true;
        setSigningIn(true);
        try {
            const { GoogleOneTapSignIn, isCancelledResponse, isNoSavedCredentialFoundResponse, isSuccessResponse } = require("react-native-nitro-google-signin");
            GoogleOneTapSignIn.configure({ webClientId: googleClientId });
            await GoogleOneTapSignIn.checkPlayServices();
            let response = await GoogleOneTapSignIn.signIn();
            if (isNoSavedCredentialFoundResponse(response)) response = await GoogleOneTapSignIn.createAccount();
            if (isNoSavedCredentialFoundResponse(response)) response = await GoogleOneTapSignIn.presentExplicitSignIn();
            if (isCancelledResponse(response)) return;
            if (!isSuccessResponse(response) || !response.data?.idToken) throw new Error("Google sign-in did not complete");
            await onCredential("google", response.data.idToken);
        } catch (error) {
            if (error?.code !== "SIGN_IN_CANCELLED") {
                const message = /no provider dependencies found|credential provider is not configured/i.test(error?.message || "")
                    ? "Google sign-in requires updated Google Play services on this device. Update Google Play services, then try again."
                    : (error?.message || "Google sign-in could not complete. Please try again.").split("\n")[0];
                setSignInError(message);
                onError(new Error(message));
            }
        } finally {
            pending.current = false;
            setSigningIn(false);
        }
    };

    return <View style={{ alignItems: "center", gap: space.sm }}>
        <SocialAuthButton onPress={googleSignIn}
            disabled={disabled || !googleClientId || !!loadingProvider || busy}
            label="Continue with Google" busy={busy}>
            {busy ? <PulseLoader size={22} /> : <GoogleMark />}
        </SocialAuthButton>
        {signInError ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite"
            style={{ color: colors.danger, textAlign: "center" }}>{signInError}</Text> : null}
    </View>;
}
