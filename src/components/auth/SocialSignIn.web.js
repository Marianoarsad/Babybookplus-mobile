import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import PulseLoader from "../ui/PulseLoader";
import { SocialAuthButton } from "./AuthControls";
import GoogleMark from "./GoogleMark";

const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
let scriptPromise;

function loadGoogle() {
    if (window.google?.accounts?.id) return Promise.resolve();
    if (!scriptPromise) {
        scriptPromise = new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://accounts.google.com/gsi/client";
            script.async = true;
            script.onload = () => {
                if (window.google?.accounts?.id) resolve();
                else script.onerror();
            };
            script.onerror = () => {
                script.remove();
                scriptPromise = undefined;
                reject(new Error("Google sign-in could not load. Check your connection and try again."));
            };
            document.head.appendChild(script);
        });
    }
    return scriptPromise;
}

export default function SocialSignIn({ onCredential, onError, loadingProvider, disabled = false }) {
    const target = useRef(null), pending = useRef(false);
    const latest = useRef(null);
    latest.current = { onCredential, onError, disabled, loadingProvider };
    const [ready, setReady] = useState(false);
    const [failed, setFailed] = useState(false);
    const [signingIn, setSigningIn] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const busy = signingIn || !!loadingProvider;

    useEffect(() => {
        if (!googleClientId) return;
        let active = true;
        setFailed(false);
        loadGoogle().then(() => { if (active) setReady(true); }).catch(error => {
            if (active) { setFailed(true); latest.current.onError(error); }
        });
        return () => { active = false; };
    }, [attempt]);

    useEffect(() => {
        if (!ready || disabled || busy || !target.current) return;
        const container = target.current;
        window.google.accounts.id.initialize({
            client_id: googleClientId, auto_select: false,
            callback: async ({ credential }) => {
                if (pending.current || latest.current.disabled || latest.current.loadingProvider) return;
                pending.current = true;
                setSigningIn(true);
                try {
                    if (!credential) throw new Error("Google sign-in did not complete");
                    await latest.current.onCredential("google", credential);
                } catch (error) { latest.current.onError(error); }
                finally { pending.current = false; setSigningIn(false); }
            },
        });
        window.google.accounts.id.renderButton(container, { type: "icon", theme: "outline", size: "large", shape: "circle" });
        return () => { container.innerHTML = ""; };
    }, [ready, disabled, busy]);

    return <View style={{ alignItems: "center", justifyContent: "center", minHeight: 56 }}>
        {ready && !disabled && !busy
            ? React.createElement("div", { ref: target })
            : <SocialAuthButton label={failed ? "Retry Google sign-in" : "Continue with Google"}
                disabled={disabled || !googleClientId || !failed || busy} busy={busy}
                onPress={() => setAttempt(value => value + 1)}>
                {busy ? <PulseLoader size={22} /> : <GoogleMark />}
            </SocialAuthButton>}
    </View>;
}
