import ActiveShareCodeItem from "./ui/ActiveShareCodeItem";
import { activeSharesAt } from "../utils/activeShares";
import MemoriesMilestonesCard from "./ui/MemoriesMilestonesCard";
import TodaysFeedingOverviewCard from "./ui/TodaysFeedingOverviewCard";
import BabyProfileCard from "./ui/BabyProfileCard";
import VaccinationProgressCard from "./ui/VaccinationProgressCard";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
    View,
    Platform,
    Text,
    StyleSheet,
    TouchableOpacity,
    AppState,
} from "react-native";
import { useLanguage } from "../context/LanguageContext";
import MemoryDetail from "./MemoryDetail";
import GrowthChart from "./GrowthChart";
import { DashboardSkeleton } from "./ui/Skeleton";
import { Ionicons } from "@expo/vector-icons";
import { radius, space, type, MIN_TOUCH } from "../theme";
import { useScreenPadBottom, useScreenPadTop } from "../utils/responsive";
import { useTheme } from "../context/ThemeContext";
import { api } from "../utils/api";
import { useRecords, useConfirmedRecords, useRecordCache, useScreenRefresh } from "../utils/useRecords";
import { memoryToApp, nutritionToApp } from "../utils/adapters";
import PullToRefreshScrollView from "./ui/PullToRefreshScrollView";
import { BlurView } from "expo-blur";
import GlassLighting from "./ui/GlassLighting";
import Gradient from "./ui/Gradient";
import { seen, markSeen } from "../utils/firstRun";
import { todayLocal, recentDateRange } from "../utils/dates";
import { dailyFeedingSummary } from "../utils/feedingStats";
import { ageText, latestProfileMeasurements } from "../utils/babyProfile";

// Age in a friendly form ("15 months", "2y 3m") from a YYYY-MM-DD DOB.
export { ageText } from "../utils/babyProfile";

export default function Dashboard({
    profile,
    backgroundBlurTarget,
    parentName,
    onChangeView,
    initialScrollOffset,
    onScrollRestored,
}) {
    const { t } = useLanguage();
    const { colors, scheme } = useTheme();
    const nativeBlur = Platform.OS === "ios" || (Platform.OS === "android" && Number(Platform.Version) >= 31 && !!backgroundBlurTarget);
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const padBottom = useScreenPadBottom();
    const padTop = useScreenPadTop();

    // Shared record reads supply vaccination progress and today's feeding summary.
    const [vaxProgress, setVaxProgress] = useState(null);
    const [nextVax, setNextVax] = useState(null);
    const [shareNow, setShareNow] = useState(Date.now);
    const [today, setToday] = useState(todayLocal);
    const homeScrollRef = useRef(null);
    const restoredScroll = useRef(false);
    const homeLayout = useRef({ viewport: 0, content: 0 });
    const vax = useRecords(profile.id, "vaccinations");
    const vaccinationCache = useRecordCache(profile.id, "vaccinations");
    const nutritionCache = useRecordCache(profile.id, "nutrition");
    const memoriesCache = useRecordCache(profile.id, "memories");
    const nutrition = useRecords(profile.id, "nutrition");
    const nutritionEntries = useMemo(() => nutrition.map(nutritionToApp), [nutrition]);
    const feedingSummary = useMemo(() => dailyFeedingSummary(nutritionEntries, today), [nutritionEntries, today]);
    const shares = useConfirmedRecords(profile.id, "shares");
    const sharesCache = useRecordCache(profile.id, "shares");
    const shareTime = Date.now();
    const activeShares = activeSharesAt(shares, shareTime);
    const soonestShare = activeShares[0] || null;
    useEffect(() => {
        if (!soonestShare) return;
        const timer = setTimeout(() => setShareNow(Date.now()), Math.min(2147483647,
            Math.max(1, Date.parse(soonestShare.expiration_date) - Date.now() + 1)));
        return () => clearTimeout(timer);
    }, [soonestShare?.expiration_date, profile.id, shareNow]);
    useEffect(() => {
        const updateDay = () => { setToday(todayLocal()); setShareNow(Date.now()); };
        const clock = setInterval(updateDay, 60000);
        const subscription = AppState.addEventListener("change", state => { if (state === "active") updateDay(); });
        return () => { clearInterval(clock); subscription.remove(); };
    }, []);
    useEffect(() => {
        const todayStr = todayLocal();
        setVaxProgress({
            completed: (vax || []).filter((v) => v.status === "completed").length,
            total: (vax || []).length,
        });

        // Soonest dose still to be given; overdue doses belong in Needs Attention.
        setNextVax(
            (vax || [])
                .filter((v) => v.status !== "completed" && v.due_date && v.due_date >= todayStr)
                .sort((a, b) => a.due_date.localeCompare(b.due_date))[0] || null,
        );
    }, [vax]);
    const loadHomeRecords = useCallback(async (isActive) => {
        const failed = [];
        const safe = (p, label) =>
            p.catch((e) => {
                failed.push(label);
                return [];
            });
        await Promise.all([
            safe(api.listRecords(profile.id, "vaccinations", { loading: "nonblocking" }), "vaccinations"),
            safe(api.listRecords(profile.id, "nutrition", { loading: "nonblocking" }), "nutrition"),
            safe(api.listShares(profile.id, { loading: "nonblocking" }), "shares"),
        ]);
        if (!isActive()) return;

        if (failed.length) {
            // Some sources didn't load — the dashboard still shows whatever
            // did, but this keeps "failed to load" from reading identically
            // to "this child genuinely has no history yet".
            throw new Error("Some records may not be up to date. Retry to refresh.");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile.id]);

    // Growth history — separate fetch, since nothing else on this screen
    // needs the measurement history. Kept raw (growthRows) for the chart, on
    // top of the latest measurement (growth) the Health ID card shows.
    const growthRows = useRecords(profile.id, "growth");
    const measurements = useMemo(() => latestProfileMeasurements(growthRows), [growthRows]);
    const growthCache = useRecordCache(profile.id, "growth");
    const loadGrowth = useCallback(async (isActive) => {
        const rows = await api.listRecords(profile.id, "growth", { loading: "nonblocking" });
        if (!isActive()) return;
    }, [profile.id]);

    // Photo memories load from and persist to the backend.
    const memoryRows = useRecords(profile.id, "memories");
    const memories = useMemo(() => memoryRows.map(memoryToApp), [memoryRows]);
    const [detailMemory, setDetailMemory] = useState(null);
    useEffect(() => setDetailMemory(null), [profile.id]);
    const loadMemories = useCallback(async (isActive) => {
        const rows = await api.listRecords(profile.id, "memories", { loading: "nonblocking" });
        if (!isActive()) return;
    }, [profile.id]);

    const loadDashboard = useCallback(async (isCurrent) => {
        const results = await Promise.allSettled([
            loadHomeRecords(isCurrent), loadGrowth(isCurrent), loadMemories(isCurrent),
        ]);
        return results.filter((result) => result.status === "rejected").map((result) =>
            result.reason?.message || "Some records could not be refreshed. Please retry.");
    }, [loadHomeRecords, loadGrowth, loadMemories]);
    const { refreshing: dashboardLoading, failures: dashboardFailures, refresh: retryAll } =
        useScreenRefresh(profile.id, loadDashboard);
    const coldLoading = dashboardLoading && ![vaccinationCache, nutritionCache, sharesCache, growthCache, memoriesCache].some(cache => cache.hasFetched);
    const dashboardError = dashboardFailures[0] || "";
    const restoreHomeScroll = () => {
        const { viewport, content } = homeLayout.current;
        // Nested cards finish measuring after the skeleton leaves; an early scroll would be clamped.
        if (!dashboardLoading && !restoredScroll.current && initialScrollOffset != null && homeScrollRef.current
            && viewport > 0 && content >= initialScrollOffset + viewport - 1) {
            restoredScroll.current = true;
            homeScrollRef.current.scrollTo({ y: initialScrollOffset, animated: false });
            onScrollRestored?.();
        }
    };

    // The add form used to open here too, but the floating log button's
    // keepsake shortcut targets the Gallery (ActionSheet.js: view "growth",
    // tab "memory"), so nothing has routed "memory" to the Dashboard for a
    // while. Adding now happens in one place, which is also the only place
    // that holds the milestone list the form's suggestion chips need.

    const dashboardGrowthRange = useMemo(
        () => recentDateRange(30, profile.dateOfBirth),
        [profile.dateOfBirth]
    );

    const nav = (view, tab, payload) => onChangeView && onChangeView(view, tab, payload);

    // Setup checklist — completion is derived from state this screen already
    // loads, no extra fetches and no per-item flags that could drift out of
    // sync. "immunizations" is the plain tab-switch key (not "vaccine", which
    // also opens the add-vaccine form — see CLAUDE.md Section 7); the
    // checklist wants the tab, not a form.
    const setupItems = [
        { key: "child", label: "Add your child's profile", done: true },
        { key: "growth", label: "Record a growth measurement", done: growthRows.length > 0, onPress: () => nav("growth", "metrics") },
        { key: "vaccine", label: "Mark a vaccine as given", done: !!vaxProgress && vaxProgress.completed > 0, onPress: () => nav("health", "immunizations") },
        { key: "share", label: "Share records with a doctor", done: activeShares.length > 0, onPress: () => nav("share") },
    ];
    const setupDoneCount = setupItems.filter((i) => i.done).length;
    const setupComplete = setupDoneCount === setupItems.length;
    // null = still checking storage (see effect below), true = hidden
    // (dismissed or already completed once), false = show it.
    const [setupDismissed, setSetupDismissed] = useState(null);
    useEffect(() => {
        seen("setup").then(setSetupDismissed);
    }, []);
    // Once every item is done, mark it seen for good — otherwise a share
    // expiring later (activeShares empties out) would drop setupComplete
    // back to false and resurrect a checklist the parent already finished.
    useEffect(() => {
        if (!dashboardLoading && setupComplete && setupDismissed === false) {
            markSeen("setup");
            setSetupDismissed(true);
        }
    }, [dashboardLoading, setupComplete, setupDismissed]);
    const dismissSetup = () => {
        setSetupDismissed(true);
        markSeen("setup");
    };
    const showSetupCard = setupDismissed === false && !setupComplete && !dashboardLoading;

    // Health ID card — identity line, then the standing facts. "Girl"/"Boy"
    // rather than "Female"/"Male": this card is the parent's, and it matches
    // the vocabulary the app already uses for its own palettes. The clinical
    // wording stays in ProfessionalView.
    return (
        <PullToRefreshScrollView scrollRef={homeScrollRef}
            onLayout={event => { homeLayout.current.viewport = event.nativeEvent.layout.height; restoreHomeScroll(); }}
            onContentSizeChange={(_width, height) => { homeLayout.current.content = height; restoreHomeScroll(); }} scope={profile.id} refreshing={dashboardLoading} onRefresh={retryAll}
            style={styles.container}
            contentContainerStyle={[styles.content, { paddingTop: padTop, paddingBottom: padBottom }]}
            keyboardShouldPersistTaps="handled"
        >
            {dashboardError ? (
                <TouchableOpacity
                    style={styles.errorBanner}
                    onPress={retryAll}
                    accessibilityRole="button"
                    accessibilityLabel={`${dashboardError} Tap to retry.`}
                >
                    <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
                    <Text style={styles.errorBannerText}>{dashboardError}</Text>
                    <Text style={styles.errorBannerRetry}>Retry</Text>
                </TouchableOpacity>
            ) : null}

            {coldLoading ? (
                <DashboardSkeleton />
            ) : (
                <>
            {/* Zero-data rule for this screen's sections:
                 - Always-present habitual-log cards (Feeding) show an inline
                   zero-state CTA inside the same persistent card.
                 - List/gallery sections (Milestone Memories)
                   show EmptyStateCard, DESIGN.md's dedicated empty-state
                   surface.
                 - Occasional call-out cards (Active Share)
                   render nothing when there's nothing to say. */}
            {/* Setup checklist — one-time, first-run guidance for a brand-new
                account. Dismissible, and removes itself for good once every
                item is done (see the effect above) or the parent taps close. */}
            {showSetupCard ? (
                <View testID="setup-checklist" style={styles.setupCard}>
                    <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.setupMaterial}>
                        {nativeBlur ? <BlurView blurTarget={backgroundBlurTarget}
                            blurMethod={Platform.OS === "android" ? "dimezisBlurViewSdk31Plus" : undefined}
                            intensity={32} tint={Platform.OS === "android" ? "default" : scheme === "dark" ? "systemUltraThinMaterialDark" : "systemUltraThinMaterialLight"}
                            style={StyleSheet.absoluteFill} /> : <View style={[StyleSheet.absoluteFill, styles.setupFallback]} />}
                        <Gradient colors={colors.setupGlass.panel} style={StyleSheet.absoluteFill} />
                        <GlassLighting material={colors.setupGlass} radius={radius.xl} panel />
                    </View>
                    <View style={styles.setupHeader}>
                        <Text style={styles.setupTitle}>
                            Get started — {setupDoneCount} of {setupItems.length}
                        </Text>
                        <TouchableOpacity
                            onPress={dismissSetup}
                            accessibilityRole="button"
                            accessibilityLabel="Dismiss setup checklist"
                            hitSlop={10}
                            style={styles.setupCloseBtn}
                        >
                            <Ionicons name="close" size={16} color={colors.setupGlass.secondary} />
                        </TouchableOpacity>
                    </View>
                    {setupItems.map((item) => (
                        <TouchableOpacity
                            key={item.key}
                            disabled={item.done || !item.onPress}
                            onPress={item.onPress}
                            style={styles.setupRow}
                            accessibilityRole="button"
                            accessibilityLabel={item.label}
                            accessibilityState={{ disabled: item.done || !item.onPress }}
                        >
                            <Ionicons
                                name={item.done ? "checkmark-circle" : "ellipse-outline"}
                                size={18}
                                style={styles.setupIcon}
                                color={item.done ? colors.success : colors.setupGlass.secondary}
                            />
                            <Text style={[styles.setupRowText, item.done && styles.setupRowTextDone]}>
                                {item.label}
                            </Text>
                            {!item.done ? (
                                <Ionicons name="chevron-forward" size={16} style={styles.setupIcon} color={colors.setupGlass.secondary} />
                            ) : null}
                        </TouchableOpacity>
                    ))}
                </View>
            ) : null}


            {/* Active share-code notice — easy to generate a code in Share
                Records and forget it's still open, so this surfaces it here
                too. Zero codes stays visible once the confirmed list has loaded. */}
            <ActiveShareCodeItem count={activeShares.length} expiresAt={soonestShare?.expiration_date} now={shareTime}
                loading={!sharesCache.hasFetched && dashboardLoading}
                unavailable={!sharesCache.hasFetched && !dashboardLoading}
                onPress={() => nav("share", null, { section: "activeRecentShares" })} />

            {/* Vaccination progress */}
            <VaccinationProgressCard completed={vaxProgress?.completed} total={vaxProgress?.total}
                nextVaccine={nextVax} loading={!vaccinationCache.hasFetched && dashboardLoading}
                error={!vaccinationCache.hasFetched && !dashboardLoading}
                onOpen={dose => nav("health", "immunizations", {
                    intent: "focus", sourceType: "vaccination", recordId: String(dose.id), childId: String(profile.id),
                })} />

            <BabyProfileCard profile={profile} age={ageText(profile.dateOfBirth)} measurements={measurements}
                loading={!growthCache.hasFetched && dashboardLoading} unavailable={!growthCache.hasFetched && !dashboardLoading}
                onViewProfile={() => nav("babyProfile", null, { childId: profile.id })} />

            {nutritionCache.hasFetched ? <TodaysFeedingOverviewCard summary={feedingSummary} onViewAll={() => nav("nutrition")}
                onOpenEntry={entryId => nav("nutrition", "entry", { childId: profile.id, entryId })} /> : <Text>{dashboardLoading ? t("screenRefreshing") : t("screenDataUnavailable")}</Text>}

            {/* Growth chart — reuses the same history the Health ID strip reads
                from, but limits its plot to the latest 30 calendar days. The strip
                above remains the latest all-time snapshot. */}
            <GrowthChart
                rows={growthRows}
                dateOfBirth={profile?.dateOfBirth}
                loading={!growthCache.hasFetched && dashboardLoading}
                title={t("growthLast30DaysTitle")}
                appearance="growthTracking"
                dateWindow={dashboardGrowthRange}
                emptyMessage={t("growthNoMeasurementsLast30Days")}
                onViewDetail={() => nav("growth")}
                plain
            />

            <MemoriesMilestonesCard records={memories.slice(0, 4)}
                onOpenMemory={memory => setDetailMemory({ ...memory, childId: profile.id })} onViewAll={() => nav("growth", "gallery")} />

                </>
            )}

            <MemoryDetail
                visible={!!detailMemory}
                memory={detailMemory}
                profile={profile}
                onClose={() => setDetailMemory(null)}
            />

        </PullToRefreshScrollView>
    );
}

const makeStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "transparent", // lets App.js's page gradient show through
    },
    // Padding lives on the content, not the ScrollView box — see Health.js.
    // The old contentContainerStyle only carried space.xxl (32) of bottom
    // padding, well short of the tab bar and floating button above it.
    content: {
        padding: space.lg,
    },

    // Error banner — shown when a fetch genuinely failed, so a network outage
    // never looks identical to "this child has no records yet".
    errorBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: space.sm,
        backgroundColor: colors.dangerBg,
        borderWidth: 1,
        borderColor: colors.danger,
        borderRadius: radius.lg,
        borderCurve: "continuous",
        padding: space.md,
        marginBottom: space.lg,
    },
    errorBannerText: { ...type.caption, color: colors.text, flex: 1 },
    errorBannerRetry: { ...type.caption, color: colors.danger },

    setupCard: {
        borderRadius: radius.xl,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: colors.setupGlass.border,
        padding: space.md,
        marginBottom: space.lg,
        boxShadow: colors.setupGlass.panelShadow,
    },
    setupMaterial: {
        ...StyleSheet.absoluteFill,
        borderRadius: radius.xl,
        borderCurve: "continuous",
        overflow: "hidden",
    },
    setupFallback: {
        backgroundColor: colors.setupGlass.fallback,
        ...(Platform.OS === "web" ? { backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } : {}),
    },
    setupIcon: { flexShrink: 0 },
    setupHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: space.sm,
    },
    setupTitle: { ...type.bodyStrong, color: colors.setupGlass.text, textTransform: "capitalize", flex: 1, marginRight: space.sm },
    // 26.4pt of visible button. The hitSlop at the call site is what brings the
    // real target to 44 — it was 8 (giving 42.4), a rounding error short.
    setupCloseBtn: {
        width: MIN_TOUCH * 0.6,
        height: MIN_TOUCH * 0.6,
        alignItems: "center",
        justifyContent: "center",
    },
    setupRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: space.sm,
        minHeight: MIN_TOUCH,
        paddingVertical: space.sm,
        borderTopWidth: 1,
        borderTopColor: colors.setupGlass.divider,
    },
    setupRowText: { ...type.body, color: colors.setupGlass.secondary, flex: 1, minWidth: 0 },
    setupRowTextDone: { color: colors.setupGlass.secondary },

});
