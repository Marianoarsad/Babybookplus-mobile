import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurTargetView } from "expo-blur";
import { MIN_TOUCH, motion, onboardingMaterial as p, space, type } from "../theme";
import Gradient from "./ui/Gradient";
import useReducedMotion from "./ui/useReducedMotion";
import { BookCollage, CareCircleArt, QrShareArt } from "./onboarding/OnboardingArt";
import { OnboardingButton, OnboardingProgressIndicator } from "./onboarding/OnboardingControls";
import AuthBackButton from "./ui/AuthBackButton";

export const ONBOARDING_CARDS = [
    { Art: BookCollage, title: "Your baby's story,\nall in one place",
        body: "Track feedings, growth, vaccines, checkups, and milestones—all in one BabyBook+." },
    { Art: QrShareArt, title: "You choose what\nyour doctor sees",
        body: "Share selected records with a QR code your doctor can view, not edit. You decide when access expires." },
    { Art: CareCircleArt, title: "Ready for\nevery checkup",
        body: "Keep your baby's health history and precious moments together, ready whenever you need them." },
];

export default function Onboarding({ onGetStarted, onLogin, initialIndex = 0 }) {
    const { width, height, fontScale } = useWindowDimensions(), insets = useSafeAreaInsets();
    const cardWidth = Math.min(width, 480), reduced = useReducedMotion();
    const [index, setIndex] = useState(initialIndex);
    const position = useRef(new Animated.Value(initialIndex)).current;
    const transition = useRef(null), current = useRef(initialIndex), finished = useRef(false), blurTarget = useRef(null);
    const availableHeight = height - insets.top - insets.bottom - MIN_TOUCH - space.lg;
    const artHeight = Math.max(180, Math.min(338, (cardWidth - 48) * 1.04, availableHeight - 330 * fontScale));
    const goTo = useCallback(next => {
        const target = Math.max(0, Math.min(2, next));
        current.current = target; setIndex(target);
        transition.current?.stop();
        if (reduced !== false) { position.setValue(target); return; }
        transition.current = Animated.timing(position, { toValue: target, duration: motion.carousel.duration,
            easing: Easing.bezier(...motion.carousel.bezier), useNativeDriver: Platform.OS !== "web" });
        transition.current.start();
    }, [position, reduced]);
    useEffect(() => {
        transition.current?.stop(); position.setValue(current.current);
    }, [cardWidth, reduced, position]);
    useEffect(() => () => { transition.current?.stop(); position.stopAnimation(); }, [position]);

    // The responder keeps current width and motion preferences after resize or settings changes.
    const controls = useRef(null); controls.current = { cardWidth, goTo, reduced };
    const pan = useMemo(() => PanResponder.create({
        onMoveShouldSetPanResponder: (_event, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderGrant: () => transition.current?.stop(),
        onPanResponderMove: (_event, g) => {
            if (controls.current.reduced !== false) return;
            position.setValue(Math.max(-0.15, Math.min(2.15, current.current - g.dx / controls.current.cardWidth)));
        },
        onPanResponderRelease: (_event, g) => controls.current.goTo(current.current +
            (Math.abs(g.vx) > 0.35 || Math.abs(g.dx) > controls.current.cardWidth * 0.25 ? (g.dx < 0 ? 1 : -1) : 0)),
        onPanResponderTerminate: () => controls.current.goTo(current.current),
    }), [position]);
    const complete = callback => {
        if (finished.current) return;
        finished.current = true;
        callback();
    };

    return <View style={styles.root}>
        <BlurTargetView ref={blurTarget} pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Gradient colors={p.background} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        </BlurTargetView>
        <View style={[styles.header, { paddingTop: insets.top + space.lg,
            paddingLeft: space.lg + (insets.left || 0), paddingRight: space.lg + (insets.right || 0) }]}>
            <View style={styles.headerSide}>
                {index > 0 ? <AuthBackButton onPress={() => goTo(current.current - 1)} accessibilityLabel="Back" /> : null}
            </View>
            <OnboardingProgressIndicator index={index} onSelect={goTo} />
            <View style={styles.headerSide}>
                {index < 2 ? <Pressable onPress={() => complete(onGetStarted)} style={styles.headerButton}
                    accessibilityRole="button" accessibilityLabel="Skip introduction and create an account">
                    <Text style={styles.skip}>Skip</Text>
                </Pressable> : null}
            </View>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(24, insets.bottom) }]}
            contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false}>
            <View style={{ width: cardWidth, overflow: "hidden" }} {...pan.panHandlers} testID="onboarding-carousel">
                <Animated.View style={{ flexDirection: "row", alignItems: "flex-start",
                    transform: [{ translateX: position.interpolate({ inputRange: [0, 1], outputRange: [0, -cardWidth] }) }] }}>
                    {ONBOARDING_CARDS.map(({ Art, title, body }, i) => <Animated.View key={i}
                        testID={`onboarding-slide-${i + 1}`} pointerEvents={i === index ? "auto" : "none"}
                        aria-hidden={i !== index}
                        accessibilityElementsHidden={i !== index} importantForAccessibility={i === index ? "auto" : "no-hide-descendants"}
                        style={[styles.card, { width: cardWidth,
                            opacity: position.interpolate({ inputRange: [i - 1, i, i + 1], outputRange: [0.35, 1, 0.35], extrapolate: "clamp" }) }]}>
                        <View style={[styles.artSlot, { height: artHeight }]}><Art width={cardWidth - 48} height={artHeight} /></View>
                        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
                        <Text style={styles.body}>{body}</Text>
                        <View style={styles.actions}>
                            {i < 2 ? <OnboardingButton circular label={`Next, slide ${i + 2} of 3`} disabled={i !== index}
                                onPress={() => goTo(i + 1)} /> : <>
                                <OnboardingButton label="Create My BabyBook" disabled={i !== index} onPress={() => complete(onGetStarted)} />
                                <OnboardingButton label="Sign In" glass blurTarget={blurTarget} disabled={i !== index} onPress={() => complete(onLogin)} />
                            </>}
                        </View>
                    </Animated.View>)}
                </Animated.View>
            </View>
        </ScrollView>
    </View>;
}

const styles = StyleSheet.create({
    root: { flex: 1, alignItems: "center", backgroundColor: p.background[0] },
    header: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.lg, zIndex: 1 },
    headerSide: { width: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: "center", justifyContent: "center" },
    headerButton: { minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: "center", justifyContent: "center" },
    skip: { ...type.caption, fontFamily: "PublicSans_500Medium", fontSize: 14, lineHeight: 20, color: p.secondary },
    scroll: { width: "100%" }, scrollContent: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingTop: 24 },
    card: { alignItems: "center", paddingHorizontal: 24 },
    artSlot: { width: "100%", alignItems: "center", justifyContent: "flex-end", marginBottom: 24 },
    title: { fontFamily: "PublicSans_700Bold", fontSize: 28, fontWeight: "700", lineHeight: 34, letterSpacing: -0.5,
        color: p.title, textAlign: "center", width: "100%", marginBottom: 12 },
    body: { ...type.body, lineHeight: 23, color: p.secondary, textAlign: "center", width: "100%", minHeight: 69 },
    actions: { width: "100%", minHeight: 124, gap: 12, marginTop: 28, alignItems: "center", paddingHorizontal: 2 },
});
