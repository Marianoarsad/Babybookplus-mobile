import GrowthMeasurementsCard from "./ui/GrowthMeasurementsCard";
import MemoriesMilestonesCollection from "./ui/MemoriesMilestonesCollection";
import { GALLERY_DEFAULTS, memoryGalleryView } from "../utils/memoryGallery";
import DevelopmentChecklistCard from "./ui/DevelopmentChecklistCard";
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { StyleSheet } from "react-native";
import { api } from "../utils/api";
import { useRecords, useScreenRefresh } from "../utils/useRecords";
import { milestoneToApp, memoryToApp } from "../utils/adapters";
import { useToast } from "./ui/Toast";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import { space } from "../theme";
import { useScreenPadBottom, useScreenPadTop } from "../utils/responsive";
import PullToRefreshScrollView from "./ui/PullToRefreshScrollView";
import MemoryDetail from "./MemoryDetail";
import TipStrip from "./ui/TipStrip";
import { growthMeasurements } from "./common/RecordSummaries";
import {
    todayLocal,
    monthsBetween,
    ageLabel,
    recentDateRange,
} from "../utils/dates";
import AddMemoryModal from "./ui/AddMemoryModal";
import GrowthModal from "./ui/GrowthModal";
import NeumorphicTabs from "./ui/NeumorphicTabs";
import { GrowthIcon } from "./ui/RecordIcon";
import PlanDetail from "./ui/PlanDetail";
import { DeleteConfirmation } from "./ui/RecordFormSheet";
import { GROWTH_METRIC_KEYS } from "../utils/growthMetricFilter.cjs";
import {
    CHECKPOINTS,
    bandLabel,
    checkpointFor,
    findRecorded,
    itemsForCheckpoint,
    resolveDevelopmentCategory,
} from "../utils/milestoneChecklist";

// Display names for growth_records.measured_at (migration 007). Reading only:
// the app never treats one place as more or less trustworthy than another.
const PLACE_LABELS = {
    home: "At home",
    health_center: "Health center",
    clinic: "Clinic",
    hospital: "Hospital",
};

const defaultGrowthRange = (dateOfBirth) => recentDateRange(30, dateOfBirth);
const yearRangeToDates = (range) => ({
    from: `${range.from}-01-01`,
    to: `${range.to}-12-31`,
});
const normalizeDateView = (saved, dateOfBirth) => {
    const today = todayLocal();
    const currentYear = Number(today.slice(0, 4));
    const yearRange = saved?.yearRange || (saved?.selectedYear
        ? { from: saved.selectedYear, to: saved.selectedYear }
        : { from: currentYear, to: currentYear });
    const savedPreset = saved?.appliedDatePreset;
    const preset = savedPreset === "all"
        ? "year"
        : ["week", "month", "year"].includes(savedPreset)
          ? savedPreset
          : null;
    const dateRange = saved?.dateRange
        || (preset === "year" ? yearRangeToDates(yearRange) : defaultGrowthRange(dateOfBirth));
    return { dateRange, preset, yearRange };
};

// ageLabel now lives in utils/dates.js -- the Dashboard's Growth Chart needs
// the same string, and a second copy is how formatters drift apart.



const GROWTH_TABS = [
    { key: "metrics", label: "Growth" },
    { key: "milestones", label: "Milestones" },
    { key: "gallery", label: "Gallery" },
];

export default function Growth({
    profile,
    onUpdateProfile,
    milestones,
    setMilestones,
    initialTab,
    navKey,
    savedDateView,
    onDateViewChange,
    blurTarget,
}) {
    const { language, t } = useLanguage();
    const toast = useToast();
    const { colors } = useTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const padBottom = useScreenPadBottom();
    const padTop = useScreenPadTop();
    // Leftmost tab, same rule as Health.js. Note this does NOT open the Log
    // Growth form: that is fired by the deep-link effect below only when
    // initialTab === "metrics" arrives from the FAB, never from the default.
    const [growthTab, setGrowthTab] = useState("metrics");

    // The checklist band this child's own age falls in. Everything about the
    // Milestones tab keys off this: the tab used to open on the youngest band
    // regardless of the child, so a parent of a three-year-old was shown
    // two-month milestones every single time.
    const ageMonths = useMemo(
        () => monthsBetween(profile.dateOfBirth, todayLocal()),
        [profile.dateOfBirth],
    );
    const ownBand = useMemo(() => checkpointFor(ageMonths), [ageMonths]);
    const [selectedBand, setSelectedBand] = useState(ownBand);

    // Rows for the age menu. "Your baby" is suppressed when the birth date was
    // never recorded: monthsBetween returns null there and checkpointFor falls
    // back to the first band, so labelling it would tell a parent their child
    // is two months old on the strength of a missing field.
    const bandOptions = useMemo(
        () =>
            CHECKPOINTS.map((c) => ({
                key: c,
                label: bandLabel(c),
                note: ageMonths != null && c === ownBand ? "Your baby" : null,
            })),
        [ageMonths, ownBand],
    );

    // Follow the child when the selected child changes — without this, a
    // switch from a newborn to a five-year-old keeps the newborn's band.
    useEffect(() => {
        setSelectedBand(ownBand);
    }, [ownBand, profile.id]);

    const bandItems = useMemo(() => itemsForCheckpoint(selectedBand), [selectedBand]);
    // Apply a deep-link tab request from the floating log button, and — for
    // "Log Growth"/"Schedule Checkup" — open the matching form directly
    // instead of just switching tabs, the same way NutritionTracker.js
    // already does for "Log Milk"/"Log Food".
    // Same rule Health.js follows: a plain tab name only switches tabs, an
    // alias switches and opens a form. "metrics" is the one legacy exception,
    // kept because the FAB's Log Growth shortcut has always used it.
    useEffect(() => {
        const tabFor = {
            milestones: "milestones",
            metrics: "metrics",
            gallery: "gallery",
            memory: "gallery",
        };
        if (initialTab && tabFor[initialTab]) {
            setGrowthTab(tabFor[initialTab]);
            if (initialTab === "metrics") setShowMetricsModal(true);
            if (initialTab === "memory") setShowAddMemory(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navKey]);

    // Milestones load from / persist to the backend. Nutrition moved to its
    // own top-level screen (App.js) — see NutritionTracker.js. Checkups moved
    // to the Health screen — see Health.js.
    const milestoneRows = useRecords(profile.id, "milestones");
    const mstones = useMemo(() => milestoneRows.map(milestoneToApp), [milestoneRows]);
    const [milestoneBusy, setMilestoneBusy] = useState(null);
    const memoryRows = useRecords(profile.id, "memories");
    const memories = useMemo(() => memoryRows.map(memoryToApp), [memoryRows]);
    const [galleryView, setGalleryView] = useState(() => ({ ...GALLERY_DEFAULTS }));
    const changeGalleryView = patch => setGalleryView(current => ({ ...current, ...patch, visible: 10 }));
    useEffect(() => { setGalleryView({ ...GALLERY_DEFAULTS }); }, [profile.id]);
    const [showAddMemory, setShowAddMemory] = useState(false);
    const [detailMemory, setDetailMemory] = useState(null);
    useEffect(() => setDetailMemory(null), [profile.id]);
    // Raw growth_records rows. The Metrics tab used to show only the two values
    // cached on the profile, so there was no history and nothing to plot.
    const growthRows = useRecords(profile.id, "growth");
    const [metricKeys, setMetricKeys] = useState(() => [...GROWTH_METRIC_KEYS]);
    const initialDateView = normalizeDateView(savedDateView, profile.dateOfBirth);
    const savedYearRange = initialDateView.yearRange;
    const [yearRange, setYearRange] = useState(savedYearRange);
    const [dateRange, setDateRange] = useState(initialDateView.dateRange);
    const [appliedDatePreset, setAppliedDatePreset] = useState(initialDateView.preset);
    const loadGrowth = useCallback(async () => {
        const resources = ["milestones", "growth", "memories"];
        const results = await Promise.allSettled(resources.map((resource) =>
            api.listRecords(profile.id, resource, { loading: "nonblocking" })));
        return resources.filter((_, index) => results[index].status === "rejected");
    }, [profile.id]);
    const { refreshing: growthLoading, failures: refreshFailures, refresh: refreshGrowth, isActive } =
        useScreenRefresh(profile.id, loadGrowth);

    useEffect(() => {
        const restored = normalizeDateView(savedDateView, profile.dateOfBirth);
        const initial = { ...restored.dateRange };
        setDateRange(initial);
        setAppliedDatePreset(restored.preset);
        setYearRange(restored.yearRange);
        setMetricKeys([...GROWTH_METRIC_KEYS]);
    }, [profile.id, profile.dateOfBirth]);


    const measurements = useMemo(() => growthMeasurements(growthRows, profile.dateOfBirth), [growthRows, profile.dateOfBirth]);
    const latestMeasurement = measurements[0] || null;

    // Achieved milestones the parent actually authored — one carrying a photo
    // or a note. A bare checklist tick is a record, not a keepsake: the
    // Development Checklist now offers ~146 items, and including every tick
    // here would bury a family's photographs under rows of plain text they
    // never wrote. Ticks still show on the checklist itself, with their date.
    const completedMilestones = useMemo(
        () => mstones.filter((m) => m.isCompleted && (m.photoUrl || m.description)),
        [mstones],
    );

    const galleryItems = useMemo(() => [
        ...memories.map(memory => ({ ...memory, kind: "memory" })),
        ...completedMilestones.map(milestone => ({ ...milestone, kind: "milestone" })),
    ], [memories, completedMilestones]);
    const galleryResult = useMemo(() => memoryGalleryView(galleryItems, galleryView), [galleryItems, galleryView]);

    const todayStr = () => todayLocal();
    const handleToggleMilestone = async (title) => {
        const existing = findRecorded(mstones, title);
        setMilestoneBusy(title);
        try {
            await api.optimisticRecord(profile.id, "milestones", existing ? "update" : "create", existing?.id,
                { ...(existing ? {} : { title }), development_category: resolveDevelopmentCategory(existing || { title }, "milestone") || null,
                    is_completed: existing ? !existing.isCompleted : true, date_recorded: todayStr() },
                { entity: existing?.id || title.trim().toLowerCase().replace(/\s+/g, " "), label: "Milestone" });
        } catch (e) { toast.error(e.message || "Could not save milestone"); }
        finally { setMilestoneBusy((current) => current === title ? null : current); }
    };

    // Metric adding state
    const [showMetricsModal, setShowMetricsModal] = useState(false);
    // Separate confirmation state protects a newly opened form from late responses.
    const [editingGrowth, setEditingGrowth] = useState(null);
    const [detailGrowth, setDetailGrowth] = useState(null);
    const [deleteGrowthCandidate, setDeleteGrowthCandidate] = useState(null);
    const deleteAnchor = useRef(null);
    const [deletingGrowthId, setDeletingGrowthId] = useState(null);
    const deletePending = useRef(null);
    useEffect(() => { deletePending.current = null; setDeleteGrowthCandidate(null); setDeletingGrowthId(null); }, [profile.id]);

    // The form owns validation, the save, and the toast now — see
    // ui/GrowthModal.js. All this has to do is refresh the list so the chart
    // and history include what just changed.
    const handleGrowthSaved = () => {}; // Confirmed rows are published by the shared client.

    const handleDeleteGrowth = async (id) => {
        if (id == null || deletePending.current || !isActive()) return false;
        const operation = {}; deletePending.current = operation;
        setDeletingGrowthId(id);
        try {
            await api.optimisticRecord(profile.id, "growth", "delete", id, {}, { label: "Measurement" });
            if (!isActive()) return false;
            setDeleteGrowthCandidate(null); setDetailGrowth(null); setShowMetricsModal(false);
            toast.success(t("growthMeasurementRemoved"));
            return true;
        } catch (e) { if (isActive()) toast.error(e.message || t("growthMeasurementRemoveFailed")); return false; }
        finally { if (deletePending.current === operation) { deletePending.current = null; if (isActive()) setDeletingGrowthId(null); } }
    };

    const growthDetailPlan = detailGrowth ? {
        title: t("growthMeasurementDetails"),
        date: detailGrowth.date,
        showTime: false,
        categoryLabel: t("growthMeasurementDetails"),
        color: colors.recGrowth.on,
        details: [
            { label: t("growthDetailAge"), value: detailGrowth.day != null ? ageLabel(detailGrowth.day) : "—" },
            { label: t("growthWeight"), value: detailGrowth.weight != null ? `${detailGrowth.weight} kg` : "—" },
            { label: t("growthHeight"), value: detailGrowth.height != null ? `${detailGrowth.height} cm` : "—" },
            { label: t("growthHeadCirc"), value: detailGrowth.head_circumference != null ? `${detailGrowth.head_circumference} cm` : "—" },
            { label: t("growthDetailLocation"), value: PLACE_LABELS[detailGrowth.measured_at] || "—" },
        ],
        notes: detailGrowth.notes,
        showReminder: false,
        deleteLabel: t("delete"),
    } : null;

    return (
        <PullToRefreshScrollView scope={profile.id} refreshing={growthLoading} onRefresh={refreshGrowth}
            error={refreshFailures.length ? "Some records could not be refreshed. Please retry." : ""}
            style={styles.container}
            contentContainerStyle={[styles.content, { paddingTop: padTop, paddingBottom: padBottom }]}
            keyboardShouldPersistTaps="handled"
        >
            <TipStrip tipKey="tip_growth" style={{ marginHorizontal: 0, marginBottom: space.sm * 1.8 }}>
                {t("growthTip")}
            </TipStrip>

            <NeumorphicTabs tabs={GROWTH_TABS} value={growthTab} onChange={setGrowthTab}
                style={styles.tabContainer} />

            {/* Age/profile changes reopen the independently collapsible categories. */}
            {growthTab === "milestones" && (
                <DevelopmentChecklistCard key={`development-${profile.id}`}
                    items={bandItems} milestones={mstones} selectedBand={selectedBand}
                    subtitle={t("growthMilestonesSub")} busy={milestoneBusy}
                    onToggle={handleToggleMilestone} ageOptions={bandOptions} onSelectAge={setSelectedBand} blurTarget={blurTarget} />
            )}

            {growthTab === "gallery" && <MemoriesMilestonesCollection key={`gallery-${profile.id}`}
                result={galleryResult} view={galleryView} loading={growthLoading}
                onChangeView={changeGalleryView}
                onShowMore={() => setGalleryView(current => ({ ...current, visible: current.visible + 10 }))}
                onOpenRecord={memory => setDetailMemory({ ...memory, childId: profile.id })} blurTarget={blurTarget} />}

            {/* GROWTH TAB: PHYSICAL METRICS */}
            {growthTab === "metrics" && (
                    <GrowthMeasurementsCard key={`${profile.id}:${profile.dateOfBirth || ""}`} rows={growthRows} dateOfBirth={profile.dateOfBirth}
                        dateView={{ dateRange, preset: appliedDatePreset, yearRange }} metricKeys={metricKeys}
                        onMetricKeysChange={setMetricKeys} loading={growthLoading} blurTarget={blurTarget}
                        onDateViewChange={next => {
                            setDateRange(next.dateRange);
                            setAppliedDatePreset(next.preset);
                            const nextYears = next.preset === "year" ? next.yearRange : yearRange;
                            setYearRange(nextYears);
                            onDateViewChange?.({ dateRange: next.dateRange, appliedDatePreset: next.preset, yearRange: { ...nextYears } });
                        }} />

            )}

            <PlanDetail
                visible={!!detailGrowth}
                plan={growthDetailPlan}
                heroContent={<GrowthIcon size={56} />}
                onClose={() => setDetailGrowth(null)}
                onEdit={() => {
                    setEditingGrowth(detailGrowth?.raw || null);
                    setDetailGrowth(null);
                    setShowMetricsModal(true);
                }}
                onDelete={anchor => { deleteAnchor.current = anchor; setDeleteGrowthCandidate(detailGrowth); }}
                deleting={deletingGrowthId === detailGrowth?.id}
            />

            <DeleteConfirmation anchor={deleteAnchor.current}
                visible={!!deleteGrowthCandidate} blurTarget={blurTarget}
                title={t("growthDeleteConfirm")}
                message={t("growthDeleteConfirm")}
                busy={deletingGrowthId === deleteGrowthCandidate?.id}
                onCancel={() => setDeleteGrowthCandidate(null)}
                onConfirm={() => handleDeleteGrowth(deleteGrowthCandidate?.id)}
            />

            {/* One form for adding a measurement and for correcting one.
                It owns its own validation, save and toast now: the old
                inline version announced success from outside its try/catch
                and lost the measurement on a failed request. */}
            <GrowthModal
                visible={showMetricsModal}
                profile={profile}
                record={editingGrowth}
                suggestedValues={latestMeasurement}
                onDelete={(record) => handleDeleteGrowth(record.id)}
                onClose={() => {
                    setShowMetricsModal(false);
                    setEditingGrowth(null);
                }}
                onSaved={handleGrowthSaved}
            />

            <MemoryDetail
                visible={!!detailMemory}
                memory={detailMemory}
                recordKind={detailMemory?.kind || "memory"}
                profile={profile}
                onClose={() => setDetailMemory(null)}
            />


            {/* One form for both kinds. `milestones` feeds its suggestion
                chips, which offer only checklist items this child has not
                recorded yet — so tapping one cannot create a duplicate. */}
            <AddMemoryModal
                visible={showAddMemory}
                profile={profile}
                milestones={mstones}
                onClose={() => setShowAddMemory(false)}
                onSaved={() => {}}
            />
        </PullToRefreshScrollView>
    );
}

const makeStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "transparent", // lets App.js's page gradient show through
    },
    // See the note on Health.js's `content`: padding on the ScrollView's own
    // box does not scroll, so the bottom clearance has to live on the content.
    content: {
        padding: space.lg,
    },
    tabContainer: { marginBottom: space.lg },


});
