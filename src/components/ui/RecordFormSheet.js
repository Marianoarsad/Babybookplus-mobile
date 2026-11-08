import { useRecordCreationBack } from "../../context/RecordCreationContext";
import SheetGrabber from "./SheetGrabber";
import React, { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View, findNodeHandle, useWindowDimensions } from "react-native";
import Modal from "./AppModal";
import { BlurTargetView, BlurView } from "expo-blur";
import { GlassTargetContext, useGlassTarget } from "../../context/GlassTargetContext";
import Gradient from "./Gradient";
import GlassLighting from "./GlassLighting";
import useReducedMotion from "./useReducedMotion";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";
import { expandedSheetHeight, recordSheetHeight, useScreenPadBottom, useScreenPadTop } from "../../utils/responsive";
import { useScroll } from "../../context/ScrollContext";
import { MIN_TOUCH, motion, radius, shadow, space, type } from "../../theme";
import { canDeleteRecord, deleteRecordAndClose, headerActionIcon } from "./recordFormActions.cjs";
import Button from "./Button";
import KeyboardAvoider from "./KeyboardAvoider";
import useBottomSheetMotion from "./useBottomSheetMotion";
import { FieldShell } from "./Field";
import { measureConfirmationAnchor, confirmationPosition } from "../../utils/confirmationPosition.cjs";

const RecordFormContext = createContext(false);
export const useRecordForm = () => useContext(RecordFormContext);

export function RecordFormGroup({ children, style }) {
    const { colors } = useTheme();
    return <View style={[{ backgroundColor: colors.surface, borderRadius: radius.xl,
        borderCurve: "continuous", padding: space.lg, gap: space.sm, marginBottom: space.lg }, style]}>{children}</View>;
}

// The original label/control are retained, including their validation and copy.
function labelText(label) {
    if (typeof label === "string") return label;
    return React.isValidElement(label) ? label.props.children : label;
}

export function RecordFormRow({ label, children, stacked = false, divider = true, outlined = true, error, helper }) {
    const { colors } = useTheme();
    const [width, setWidth] = useState(0);
    const [focused, setFocused] = useState(false);
    const vertical = stacked || (width > 0 && width < 280);
    if (outlined) return <FieldShell label={labelText(label)} focused={focused} error={error} helper={helper} multiline={stacked}>
        {React.isValidElement(children) ? React.cloneElement(children, { style: [children.props.style, {
            backgroundColor: "transparent", borderWidth: 0, borderRadius: 0, marginBottom: 0,
            minHeight: stacked ? 94 : 50, paddingHorizontal: space.lg,
        }], onFocus: (event) => { setFocused(true); children.props.onFocus?.(event); },
            onBlur: (event) => { setFocused(false); children.props.onBlur?.(event); } }) : children}
    </FieldShell>;
    return <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{
        flexDirection: vertical ? "column" : "row", alignItems: vertical ? "stretch" : "center",
        gap: space.sm, paddingVertical: space.sm, borderBottomWidth: divider ? StyleSheet.hairlineWidth : 0,
        borderBottomColor: colors.hairline, marginBottom: space.xs,
    }}>
        <View style={vertical ? undefined : { flex: 1, minWidth: 0 }}>
            {React.isValidElement(label) ? React.cloneElement(label, { style: [label.props.style,
                { ...type.label, color: colors.text, marginBottom: 0, flexShrink: 1 }] }) : label}
        </View>
        <FieldShell style={vertical ? undefined : { flex: 1.35, minWidth: 0 }}>
            {React.isValidElement(children) ? React.cloneElement(children, { style: [children.props.style, {
                backgroundColor: "transparent", borderRadius: radius.pill, borderCurve: "continuous",
                marginBottom: 0, minHeight: stacked ? 96 : 52, paddingHorizontal: space.md,
            }] }) : children}
        </FieldShell>
    </View>;
}

export function RecordFormScreen({ children, onSubmit, submitLabel = "Save Changes", busy = false, footer }) {
    const { scrollProps, scrollViewRef } = useScroll();
    const padTop = useScreenPadTop();
    const padBottom = useScreenPadBottom();
    const submitLock = useRef(false);
    const submit = async () => {
        if (busy || submitLock.current) return;
        submitLock.current = true;
        try { await onSubmit(); } finally { submitLock.current = false; }
    };
    return <KeyboardAvoider style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}>
        <RecordFormContext.Provider value>
            <Animated.ScrollView ref={scrollViewRef} style={{ flex: 1 }} {...scrollProps} keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ padding: space.lg, paddingTop: padTop, paddingBottom: padBottom }}>
                {children}
                <Button title={submitLabel} onPress={submit} variant="settings" disabled={busy} loading={busy} loadingIndicator={false} />
                {footer}

            </Animated.ScrollView>
        </RecordFormContext.Provider>
    </KeyboardAvoider>;
}

export function DeleteConfirmation({ visible, inline = false, title, message, cancelLabel = "Cancel",
    deleteLabel = "Delete", busy = false, error = "", onCancel, onConfirm, blurTarget, anchor }) {
    const inheritedTarget = useGlassTarget();
    blurTarget = blurTarget ?? inheritedTarget;
    const { colors, scheme } = useTheme(), p = useMemo(() => ({ ...colors.confirmationGlass, ...colors.overlayGlass }), [colors]);
    const insets = useSafeAreaInsets(), viewport = useWindowDimensions();
    const styles = useMemo(() => confirmationStyles(p), [p]);
    const confirmRef = useRef(null), cancelRef = useRef(null), panelRef = useRef(null), overlayRef = useRef(null), previousFocus = useRef(null);
    const [host, setHost] = useState(null), [panelHeight, setPanelHeight] = useState(0);
    const localAnchor = anchor && { ...anchor, x: anchor.x - (host?.x || 0), y: anchor.y - (host?.y || 0) };
    const position = confirmationPosition(localAnchor, host || viewport, panelHeight, insets);
    const ready = !!host && panelHeight > 0 && !!position;
    const request = useRef(null), mounted = useRef(false);
    const [pending, setPending] = useState(false), [failure, setFailure] = useState("");
    const [reduceTransparency, setReduceTransparency] = useState(false);
    const reduceMotion = useReducedMotion(visible);
    const warp = useRef(new Animated.Value(0)).current;
    const id = "confirmation-" + useId().replace(/:/g, "");
    const blocked = busy || pending;
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; request.current = null; };
    }, []);
    useEffect(() => {
        request.current = null; setPending(false); setFailure("");
        if (!visible) { setHost(null); setPanelHeight(0); return undefined; }
        const media = Platform.OS === "web" && globalThis.matchMedia?.("(prefers-reduced-transparency: reduce)");
        if (media) {
            const update = event => setReduceTransparency(event.matches);
            setReduceTransparency(media.matches); media.addEventListener?.("change", update);
            return () => media.removeEventListener?.("change", update);
        }
        if (Platform.OS !== "ios") return undefined;
        let active = true;
        AccessibilityInfo.isReduceTransparencyEnabled?.().then(value => active && setReduceTransparency(value)).catch(() => {});
        const subscription = AccessibilityInfo.addEventListener?.("reduceTransparencyChanged", setReduceTransparency);
        return () => { active = false; subscription?.remove?.(); };
    }, [visible]);
    useEffect(() => {
        if (!visible) { warp.setValue(0); return undefined; }
        if (!ready || reduceMotion === null) return undefined;
        warp.stopAnimation();
        if (reduceMotion) { warp.setValue(1); return undefined; }
        warp.setValue(0);
        const animation = Animated.timing(warp, {
            toValue: 1, duration: motion.entrance.duration,
            easing: Easing.bezier(...motion.entrance.bezier), useNativeDriver: Platform.OS !== "web",
        });
        animation.start();
        return () => animation.stop();
    }, [reduceMotion, visible, ready, warp]);
    useEffect(() => {
        if (!visible) return undefined;
        Keyboard.dismiss();
        previousFocus.current = Platform.OS === "web" ? globalThis.document?.activeElement : null;
        return () => {
            const previous = previousFocus.current;
            if (inline && previous?.isConnected) requestAnimationFrame(() => previous.focus?.());
        };
    }, [visible, inline]);
    useEffect(() => {
        if (!visible || !ready) return undefined;
        const frame = requestAnimationFrame(() => {
            confirmRef.current?.focus?.();
            if (Platform.OS !== "web") {
                const handle = findNodeHandle(confirmRef.current);
                if (handle != null) AccessibilityInfo.setAccessibilityFocus?.(handle);
            }
            AccessibilityInfo.announceForAccessibility?.(`${title}. ${message}`);
        });
        return () => cancelAnimationFrame(frame);
    }, [visible, ready, title, message]);
    useEffect(() => { if (visible && blocked && Platform.OS === "web") panelRef.current?.focus?.(); }, [visible, blocked]);
    const cancel = () => { if (visible && !busy && !request.current) onCancel(); };
    const confirm = async () => {
        if (!visible || !ready || busy || request.current) return;
        const token = {}; request.current = token; setPending(true); setFailure("");
        try { await onConfirm(); }
        catch (e) { if (mounted.current && request.current === token) setFailure(e.message || "Could not complete this action. Please try again."); }
        finally {
            if (mounted.current && request.current === token) { request.current = null; setPending(false); confirmRef.current?.focus?.(); }
        }
    };
    const supportsBlur = !reduceTransparency && (Platform.OS === "web"
        ? Boolean(globalThis.CSS?.supports?.("backdrop-filter", "blur(1px)") || globalThis.CSS?.supports?.("-webkit-backdrop-filter", "blur(1px)"))
        : Platform.OS === "ios" || Platform.OS === "android" && !!blurTarget);
    if (!visible || !position) return null;
    const animated = reduceMotion === true ? undefined : {
        opacity: warp,
        transform: [
            { scaleX: warp.interpolate({ inputRange: [0, 0.72, 1], outputRange: [0.72, 1.025, 1] }) },
            { scaleY: warp.interpolate({ inputRange: [0, 0.72, 1], outputRange: [0.35, 1.035, 1] }) },
        ],
    };
    const content = <View ref={overlayRef} testID="delete-confirmation-overlay" style={[StyleSheet.absoluteFill, styles.overlay]}
        onLayout={() => overlayRef.current?.measureInWindow((x, y, width, height) => {
            if (width > 0 && height > 0) setHost(old => old?.x === x && old?.y === y && old?.width === width && old?.height === height ? old : { x, y, width, height });
        })}>
        <Pressable testID="confirmation-backdrop" accessible={false} focusable={false} disabled={blocked} style={StyleSheet.absoluteFill} onPress={cancel} />
            <Animated.View ref={panelRef} testID="delete-confirmation" accessibilityViewIsModal onAccessibilityEscape={cancel}
                {...(Platform.OS === "web" ? { role: "alertdialog", "aria-modal": true, "aria-labelledby": id + "-title", "aria-describedby": id + "-message", tabIndex: -1,
                    onKeyDown: event => {
                        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); cancel(); }
                        if (event.key === "Tab") {
                            event.preventDefault();
                            if (blocked) panelRef.current?.focus?.();
                            else {
                                const current = globalThis.document?.activeElement;
                                (current === confirmRef.current || current !== cancelRef.current && event.shiftKey ? cancelRef.current : confirmRef.current)?.focus?.();
                            }
                        }
                    } } : {})}
                onLayout={event => { const height = Math.ceil(event.nativeEvent.layout.height); if (height > 0) setPanelHeight(old => old === height ? old : height); }}
                style={[styles.panel, position,
                    supportsBlur && Platform.OS === "web" && styles.webBlur, animated, !ready && { opacity: 0 }]}>
                <View pointerEvents="none" style={styles.material}>
                    {supportsBlur && Platform.OS !== "web" ? <BlurView testID="confirmation-panel-blur" blurTarget={blurTarget}
                        blurMethod={Platform.OS === "android" ? Number(Platform.Version) < 31 ? "dimezisBlurView" : "dimezisBlurViewSdk31Plus" : undefined} intensity={p.blurIntensity} blurReductionFactor={p.blurReductionFactor}
                        tint={Platform.OS === "android" ? "default" : scheme === "dark" ? "systemUltraThinMaterialDark" : "systemUltraThinMaterialLight"} style={StyleSheet.absoluteFill} /> : null}
                    <Gradient colors={supportsBlur ? p.panel : [p.fallback, p.fallback]} style={StyleSheet.absoluteFill} />
                    <GlassLighting material={p} radius={28} panel />
                </View>
                <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    <Text nativeID={id + "-title"} accessibilityRole="header" style={styles.title}>{title}</Text>
                    <Text nativeID={id + "-message"} style={styles.message}>{message}</Text>
                    {error || failure ? <Text accessibilityRole="alert" style={styles.error}>{error || failure}</Text> : null}
                    <View style={styles.actions}>
                        <ConfirmationButton buttonRef={confirmRef} label={deleteLabel} destructive busy={blocked} disabled={blocked} onPress={confirm} p={p} styles={styles} />
                        <ConfirmationButton buttonRef={cancelRef} label={cancelLabel} disabled={blocked} onPress={cancel} p={p} styles={styles} />
                    </View>
                </ScrollView>
            </Animated.View>
    </View>;
    return inline ? content : <Modal visible transparent animationType="none" presentationStyle="overFullScreen" statusBarTranslucent onRequestClose={cancel}>{content}</Modal>;
}

function ConfirmationButton({ buttonRef, label, destructive, disabled, busy = false, onPress, p, styles }) {
    const [focused, setFocused] = useState(false);
    return <Pressable ref={buttonRef} onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label}
        accessibilityState={{ disabled, busy }} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={({ pressed }) => [styles.button,
            { boxShadow: pressed ? p.pressedShadow : destructive ? p.destructiveShadow : p.controlShadow, opacity: disabled ? 0.65 : 1 },
            Platform.OS === "web" && { outlineColor: p.accent, outlineOffset: 3, outlineStyle: focused ? "solid" : "none", outlineWidth: 2 }]}>
        <View pointerEvents="none" style={styles.buttonFace}>
            <Gradient colors={destructive ? p.destructive : p.cancel} style={StyleSheet.absoluteFill} />
            <GlassLighting material={p} radius={999} />
        </View>
        <Text style={[styles.buttonText, { color: destructive ? p.destructiveInk : p.secondary }]}>{label}</Text>
    </Pressable>;
}

const confirmationStyles = p => StyleSheet.create({
    overlay: { zIndex: 10 },
    panel: { position: "absolute", borderRadius: 28, borderCurve: "continuous", boxShadow: p.panelShadow },
    material: { ...StyleSheet.absoluteFill, borderRadius: 28, overflow: "hidden" },
    webBlur: { backdropFilter: p.webBlur, WebkitBackdropFilter: p.webBlur },
    content: { padding: 22, gap: 14 }, title: { ...type.heading, fontSize: 20, lineHeight: 27, color: p.text, textAlign: "center" },
    message: { ...type.body, fontSize: 14, lineHeight: 21, color: p.secondary, textAlign: "center" },
    error: { ...type.caption, color: p.error, textAlign: "center" }, actions: { gap: 12, marginTop: 4 },
    button: { minHeight: 52, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
    buttonFace: { ...StyleSheet.absoluteFill, borderRadius: radius.pill, overflow: "hidden" },
    buttonText: { ...type.bodyStrong, fontSize: 16, lineHeight: 23, textAlign: "center" },
});

export default function RecordFormSheet({ visible, title, children, onClose, onSubmit, cancelLabel = "Cancel",
    submitLabel = "Save", busy = false, error = "", record = null, onDelete, deleteLabel = "Delete", deleteTitle = "Delete record?",
    deleteMessage = "Delete this record? This cannot be undone.", dismissible = true, blurTargetRef, creationKey, onBack }) {
    const { colors } = useTheme();
    const { t } = useLanguage();
    const insets = useSafeAreaInsets();
    const { height, width, fontScale } = useWindowDimensions();
    const [availableHeight, setAvailableHeight] = useState(height);
    const stackedActions = width / fontScale < 360;
    const sheetHeight = recordSheetHeight(Math.min(height, availableHeight), fontScale, insets.top, insets.bottom);
    const expandedHeight = expandedSheetHeight(Math.min(height, availableHeight), sheetHeight, insets.top);
    const returnBack = useRecordCreationBack({ visible, record, creationKey, onClose, onBack });
    const dismissLabel = returnBack ? "Back to Add a record" : cancelLabel;
    const cancelIcon = returnBack ? "chevron-back" : headerActionIcon(cancelLabel, "cancel", t("cancel"));
    const saveIcon = headerActionIcon(submitLabel, "save", t("save"));
    const [confirming, setConfirming] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");
    const deleteLock = useRef(false);
    const deleteScope = useRef({ visible, id: record?.id, version: 0 });
    if (deleteScope.current.visible !== visible || deleteScope.current.id !== record?.id) {
        deleteScope.current = { visible, id: record?.id, version: deleteScope.current.version + 1 };
        deleteLock.current = false;
    }
    const submitLock = useRef(false);
    const deleteButton = useRef(null), localBlurTarget = useRef(null);
    const sheetBlurTarget = blurTargetRef || localBlurTarget;
    const [deleteAnchor, setDeleteAnchor] = useState(null);
    useEffect(() => { setDeleting(false); setConfirming(false); setDeleteError(""); }, [visible, record?.id]);
    const blocked = busy || deleting;
    const canDismiss = dismissible && !blocked && !confirming;
    const motion = useBottomSheetMotion({ visible, collapsedHeight: sheetHeight, expandedHeight, onClose: returnBack || onClose, gestureEnabled: !blocked && !confirming, dismissible });
    const styles = useMemo(() => StyleSheet.create({
        root: { flex: 1, justifyContent: "flex-end", paddingTop: Math.max(insets.top, space.md) },
        sheet: { maxHeight: "100%", flexShrink: 1, minHeight: 0, width: "100%",
            backgroundColor: colors.background, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
            borderCurve: "continuous", overflow: "hidden", ...shadow.raised },
        header: { padding: space.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline, gap: space.sm },
        heading: { ...type.heading, fontSize: type.heading.fontSize * 1.3, lineHeight: type.heading.lineHeight * 1.3,
            color: colors.text, textAlign: "center", flex: 1.5, minWidth: 0 },
        actions: { flexDirection: "row", alignItems: "center", gap: space.sm },
        content: { padding: space.lg, paddingBottom: space.xl + insets.bottom },
    }), [colors, insets.top, insets.bottom]);
    const submit = async () => {
        if (blocked || confirming || submitLock.current) return;
        submitLock.current = true;
        try { await onSubmit(); } finally { submitLock.current = false; }
    };
    const cancelDelete = () => { if (!deleteLock.current) { setConfirming(false); setDeleteError(""); deleteButton.current?.focus?.(); } };
    const confirmDelete = async () => {
        if (deleteLock.current || busy || !onDelete) return;
        deleteLock.current = true;
        setDeleting(true);
        setDeleteError("");
        const scopeVersion = deleteScope.current.version;
        const isCurrent = () => deleteScope.current.visible && deleteScope.current.version === scopeVersion;
        try {
            const success = await deleteRecordAndClose(onDelete, onClose, isCurrent);
            if (!success && isCurrent()) setDeleteError("Could not delete the record. Please try again.");
        } catch (e) {
            if (isCurrent()) setDeleteError(e.message || "Could not delete the record. Please try again.");
        } finally { if (deleteScope.current.version === scopeVersion) { deleteLock.current = false; setDeleting(false); } }
    };
    return <Modal visible={motion.presented} transparent animationType="none" onShow={motion.startOpening}
        onRequestClose={() => { if (confirming) cancelDelete(); else if (canDismiss) motion.dismiss(); }}>
        <BlurTargetView ref={sheetBlurTarget} style={{ flex: 1 }} pointerEvents={confirming ? "none" : "auto"}
            accessibilityElementsHidden={confirming} importantForAccessibility={confirming ? "no-hide-descendants" : "auto"}
            {...(Platform.OS === "web" ? { inert: confirming || undefined, "aria-hidden": confirming || undefined } : {})}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : Platform.OS === "android" ? "height" : undefined}>
            <View style={styles.root} onLayout={e => setAvailableHeight(e.nativeEvent.layout.height)}>
                <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.text + "66", opacity: confirming ? 0 : motion.shade }]} />
                <Pressable style={StyleSheet.absoluteFill} onPress={() => canDismiss && motion.dismiss()}
                    accessibilityRole="button" accessibilityLabel={dismissLabel} disabled={!canDismiss} />
                <Animated.View style={[styles.sheet, { height: motion.height }]}
                    accessibilityViewIsModal onAccessibilityEscape={() => canDismiss && motion.dismiss()}>
                    <GlassTargetContext.Provider value={sheetBlurTarget}><RecordFormContext.Provider value>
                        <View style={{ flex: 1, minHeight: 0 }} pointerEvents={confirming ? "none" : "auto"}
                            accessibilityElementsHidden={confirming} importantForAccessibility={confirming ? "no-hide-descendants" : "auto"}>
                            <View style={styles.header}>
                                <SheetGrabber motion={motion} disabled={blocked || confirming} />
                                {stackedActions ? <Text accessibilityRole="header" style={[styles.heading, { flex: undefined }]}>{title}</Text> : null}
                                <View style={[styles.actions, { justifyContent: "space-between" }]}>
                                    <Button title={dismissLabel} variant="settingsSecondary" fullWidth={false} icon={cancelIcon}
                                        iconOnly={!!cancelIcon} style={{ width: cancelIcon ? 54 : 112, flexShrink: 1 }} disabled={blocked || confirming} onPress={() => motion.dismiss()} />
                                    {!stackedActions ? <Text accessibilityRole="header" style={styles.heading}>{title}</Text> : null}
                                    <Button title={submitLabel} variant="settings" fullWidth={false} icon={saveIcon} iconOnly={!!saveIcon} style={{ width: saveIcon ? 54 : 112, flexShrink: 1 }}
                                        disabled={blocked || confirming} loading={busy} loadingIndicator={false} onPress={submit} />
                                </View>
                                {error ? <Text accessibilityRole="alert" style={{ ...type.caption, color: colors.danger }}>{error}</Text> : null}
                            </View>
                            <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                                {children}
                                {canDeleteRecord(record, onDelete) ? <Button buttonRef={deleteButton} title={deleteLabel} variant="danger" fullWidth={false} onPress={event => { const version = deleteScope.current.version; measureConfirmationAnchor(deleteButton, event, anchor => {
                                    if (deleteScope.current.visible && deleteScope.current.version === version) { Keyboard.dismiss(); setDeleteAnchor(anchor); setConfirming(true); }
                                }); }} disabled={blocked}
                                    style={{ alignSelf: "center", marginTop: space.lg }} /> : null}
                            </ScrollView>
                        </View>
                    </RecordFormContext.Provider></GlassTargetContext.Provider>
                </Animated.View>
            </View>
        </KeyboardAvoidingView>
        </BlurTargetView>
        <DeleteConfirmation inline visible={confirming} anchor={deleteAnchor} title={deleteTitle} message={deleteMessage} cancelLabel={cancelLabel}
            deleteLabel={deleteLabel} busy={deleting} error={deleteError} onCancel={cancelDelete} onConfirm={confirmDelete} blurTarget={sheetBlurTarget} />
    </Modal>;
}
