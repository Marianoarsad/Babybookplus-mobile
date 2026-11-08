import NeumorphicTabs from "./ui/NeumorphicTabs";
import { SolidFoodIcon, MilkIcon } from "./ui/RecordIcon";
import MilkTypeCard from "./ui/MilkTypeCard";
import { NutritionBackground, NutritionControl } from "./ui/NutritionVisuals";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform, AppState } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { settingsSelectionStyle, radius, space, shadow, type, MIN_TOUCH } from "../theme";
import { useScreenPadBottom, useScreenPadTop } from "../utils/responsive";
import { useTheme } from "../context/ThemeContext";
import { api } from "../utils/api";
import { useRecords, useConfirmedRecords, useRecordCache, useScreenRefresh, useRecordSave } from "../utils/useRecords";
import { nutritionToApp, nutritionFormToRecord, feedVolumeMl } from "../utils/adapters";
import SolidFoodsCard from "./ui/SolidFoodsCard";
import { FOOD_CATEGORIES, foodCategoryLabel } from "../utils/solidFoods";
import { useToast } from "./ui/Toast";
import { DateField, TimeField } from "./ui/DateField";
import { SectionContainerCard } from "./common/Cards";
import PullToRefreshScrollView from "./ui/PullToRefreshScrollView";
import MilkMeasureSelect from "./ui/MilkMeasureSelect";
import GlassChartFilterPopover from "./ui/GlassChartFilterPopover";
import NutritionDateFilter, { nutritionDateView } from "./ui/NutritionDateFilter";
import NutritionTrendChart from "./ui/NutritionTrendChart";
import FeedingBreakdownCard from "./ui/FeedingBreakdownCard";
import Field from "./ui/Field";

import RecordFormSheet, { DeleteConfirmation, RecordFormGroup, RecordFormRow } from "./ui/RecordFormSheet";
import PlanDetail from "./ui/PlanDetail";
import { storage } from "../utils/storageAdapter";
import {
    canStepFormulaScoops,
    formulaScoopsOrDefault,
    isFormulaScoopsDraft,
    isFormulaScoopsValue,
    nutritionFormDefaults,
    parseNutritionPrefs,
    recentNutritionFields,
    stepFormulaScoops,
} from "../utils/nutritionFormPrefs.cjs";
import numericInput from "../utils/numericInput.cjs";
import { toggleRequiredKey } from "../utils/growthMetricFilter.cjs";

const { decimalOnly, digitsOnly } = numericInput;
import {
    todayLocal,
    nowLocalTime,
    durationText,
} from "../utils/dates";
import {
    buildBuckets,
    foodSuggestions,
    hasBreastDurations,
    dailyFeedingSummary,
} from "../utils/feedingStats";

const MILK_TYPES = ["Breastmilk", "Formula", "Mixed"];
const METHODS = [
    { key: "breast", label: "Breast" },
    { key: "bottle", label: "Bottle" },
];
// "L" is deliberately absent. A single feed is never measured in litres, and
// one mis-tap used to multiply that feed by 1000 in the chart. The backend
// CHECK still accepts it so any older row keeps reading correctly.
const UNITS = ["mL", "oz"];
const SEVERITIES = [
    { key: "none", label: "None" },
    { key: "mild", label: "Mild" },
    { key: "severe", label: "Severe" },
];
const PREFS_KEY = "bb_nutrition_prefs";
const childPrefsKey = (childId) => `${PREFS_KEY}:${childId}`;
const RECENT_FOODS = 6;

// What the chart plots. "Feeds" is the only measure that counts a breastfeed
// and a bottle as the same event, which is why it's the default for any child
// who is breastfed at all — summing millilitres would render a day of eight
// breastfeeds as an empty bar, identical to a day with no feeding.
const MEASURES = [
    { key: "feeds", label: "Feeds", valueOf: () => 1, unit: "feeds" },
    { key: "volume", label: "Volume", valueOf: feedVolumeMl, unit: "mL" },
    {
        key: "breast",
        label: "Breast time",
        valueOf: (e) => (e.feedMethod === "breast" ? e.durationMinutes || 0 : 0),
        unit: "min",
    },
];
const NUTRITION_CHARTS = [
    { key: "milk", label: "Milk" },
    { key: "food", label: "Food" },
];
const NUTRITION_CHART_KEYS = NUTRITION_CHARTS.map((chart) => chart.key);

const emptyForm = (prefs, entryType = "milk") =>
    nutritionFormDefaults(prefs, entryType, todayLocal(), nowLocalTime());

export default function NutritionTracker({ profile, childId, initialAction, initialRecord, navKey, savedDateView, onDateViewChange, blurTarget }) {
    // `profile` is the whole child; childId stays accepted so an older call
    // site can't silently break the screen.
    const id = profile?.id || childId;
    const dob = profile?.dateOfBirth || profile?.dob || "";
    const [today, setToday] = useState(todayLocal);
    useEffect(() => {
        const updateDay = () => setToday(todayLocal());
        const timer = setInterval(updateDay, 60000);
        const subscription = AppState.addEventListener("change", state => { if (state === "active") updateDay(); });
        return () => { clearInterval(timer); subscription.remove(); };
    }, []);
    const minimumDate = dob && String(dob).slice(0, 10) <= today ? String(dob).slice(0, 10) : null;
    const toast = useToast();
    const { colors } = useTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const padBottom = useScreenPadBottom();
    const padTop = useScreenPadTop();
    const recordRows = useRecords(id, "nutrition");
    const nutritionCache = useRecordCache(id, "nutrition");
    const entries = useMemo(() => recordRows.map(nutritionToApp), [recordRows]);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const deletePending = useRef(null);
    const [detailEntry, setDetailEntry] = useState(null);
    const handledEntryNavKey = useRef(null);
    const nutritionScrollRef = useRef(null);
    useEffect(() => { setDetailEntry(null); handledEntryNavKey.current = null; }, [id]);
    const [deleteCandidate, setDeleteCandidate] = useState(null);
    const deleteAnchor = useRef(null);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const saveRecord = useRecordSave(showModal, id, "nutrition", editingId);
    const [prefs, setPrefs] = useState(null);
    const [prefsChildId, setPrefsChildId] = useState(null);
    const [form, setForm] = useState(() => emptyForm(null));
    const [errors, setErrors] = useState({});
    const [dateView, setDateView] = useState(() => nutritionDateView(savedDateView, minimumDate));
    const [chartKeys, setChartKeys] = useState(() => [...NUTRITION_CHART_KEYS]);
    const [scopeMenuOpen, setScopeMenuOpen] = useState(false);
    const [scopeMenuAnchor, setScopeMenuAnchor] = useState(null);
    const scopeTriggerRef = useRef(null);
    const [measure, setMeasure] = useState(null); // null = follow the data
    const [showFeedingEntries, setShowFeedingEntries] = useState(false);
    useEffect(() => { setShowFeedingEntries(false); }, [id, today]);
    const showMilkChart = chartKeys.includes("milk");
    const showFoodChart = chartKeys.includes("food");

    const loadNutrition = useCallback(async () => {
        const resources = ["nutrition"];
        const results = await Promise.allSettled(resources.map(resource => api.listRecords(id, resource, { loading: "nonblocking" })));
        return resources.filter((_, i) => results[i].status === "rejected");
    }, [id]);
    const { refreshing: loading, failures: refreshFailures, refresh: load, isActive } = useScreenRefresh(id, loadNutrition);

    useEffect(() => {
        setDateView(nutritionDateView(savedDateView, minimumDate));
    }, [id, minimumDate]);

    const readPrefs = useCallback(async () => {
        const [scoped, legacy] = await Promise.all([
            storage.getItem(childPrefsKey(id)),
            storage.getItem(PREFS_KEY),
        ]);
        return parseNutritionPrefs(scoped, legacy);
    }, [id]);

    // Keep recent form values local to this child and entry type. The legacy
    // key remains a one-time fallback for existing milk preferences.
    useEffect(() => {
        let active = true;
        setPrefs(null);
        setPrefsChildId(null);
        readPrefs()
            .then((next) => {
                if (active) {
                    setPrefs(next);
                    setPrefsChildId(id);
                }
            })
            .catch(() => {});
        return () => {
            active = false;
        };
    }, [id, readPrefs]);


    const setF = (k, v) =>
        setForm((p) => {
            const next = { ...p, [k]: v };
            // Formula and mixed feeds use the bottle fields, so their hidden
            // method state must agree with the visible form.
            if (k === "milkType" && (v === "Formula" || v === "Mixed")) {
                next.feedMethod = "bottle";
                next.formulaScoops = formulaScoopsOrDefault(next.formulaScoops);
            }
            return next;
        });
    const clearError = (k) => setErrors((p) => (p[k] ? { ...p, [k]: undefined } : p));

    const openAdd = useCallback(
        async (entryType) => {
            setEditingId(null);
            setErrors({});
            const recent = prefsChildId === id && prefs ? prefs : await readPrefs();
            setPrefs(recent);
            setPrefsChildId(id);
            setForm(emptyForm(recent, entryType));
            setShowModal(true);
        },
        [id, prefs, prefsChildId, readPrefs],
    );

    // Deep-link from the floating "+" sheet: open straight into the Add modal,
    // preset to the right entry type. Mirrors Health.js and Growth.js.
    useEffect(() => {
        if (initialAction === "milk" || initialAction === "solid") openAdd(initialAction);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navKey]);
    useEffect(() => {
        if (initialAction !== "entry" || handledEntryNavKey.current === navKey
            || String(initialRecord?.childId) !== String(id) || initialRecord?.entryId == null) return;
        if (!nutritionCache.hasFetched && entries.length === 0) return;
        handledEntryNavKey.current = navKey;
        setDetailEntry(entries.find(entry => entry.id === String(initialRecord.entryId)) || null);
    }, [initialAction, initialRecord?.childId, initialRecord?.entryId, navKey, id, entries, nutritionCache.hasFetched]);

    const openEdit = (e) => {
        setEditingId(e.id);
        setErrors({});
        setForm({
            entryType: e.entryType || "milk",
            milkType: MILK_TYPES.includes(e.milkType) ? e.milkType : "",
            feedMethod:
                e.milkType === "Formula" || e.milkType === "Mixed"
                    ? "bottle"
                    : e.feedMethod || "bottle",
            formulaBrand: e.formulaBrand || "",
            formulaScoops:
                e.milkType === "Formula" || e.milkType === "Mixed"
                    ? formulaScoopsOrDefault(e.formulaScoops)
                    : "",
            quantity: e.quantity != null ? String(e.quantity) : "",
            breastmilkQuantity: e.breastmilkQuantity != null ? String(e.breastmilkQuantity) : "",
            unit: UNITS.includes(e.unit) ? e.unit : "mL",
            durationMinutes: e.durationMinutes != null ? String(e.durationMinutes) : "",
            foodIntroduced: e.foodIntroduced || "",
            foodCategory: e.foodCategory || "",
            // A pre-migration row has no severity. Free text alongside it means
            // something happened; blank means nothing was recorded either way.
            reactionSeverity: e.reactionSeverity || "",
            reaction: e.reaction || "",
            date: e.date || todayLocal(),
            time: e.time || "",
            notes: e.notes || "",
        });
        setShowModal(true);
    };

    const isBreast =
        form.entryType === "milk" && form.milkType === "Breastmilk" && form.feedMethod === "breast";
    const showFormula = form.milkType === "Formula" || form.milkType === "Mixed";
    const canDecreaseScoops = canStepFormulaScoops(form.formulaScoops, -1);
    const canIncreaseScoops = canStepFormulaScoops(form.formulaScoops, 1);

    // Inline, field-level errors. A toast for "enter a quantity" points at
    // nothing — it fades from the top of the screen while the empty field it
    // was about sits untouched further down.
    const validate = () => {
        const next = {};
        if (form.entryType === "milk") {
            if (!MILK_TYPES.includes(form.milkType)) next.milkType = "Choose Breastmilk, Formula or Mixed.";
            if (
                (form.milkType === "Formula" || form.milkType === "Mixed") &&
                !isFormulaScoopsValue(form.formulaScoops)
            ) {
                next.formulaScoops = "Enter a valid number of scoops.";
            }
            if (isBreast) {
                // Blank is valid — the feed itself is the record. Only a value
                // that IS entered has to make sense.
                if (form.durationMinutes.trim()) {
                    const mins = Number(form.durationMinutes);
                    if (!Number.isFinite(mins) || mins <= 0) {
                        next.durationMinutes = "Enter minutes, or leave this blank.";
                    } else if (mins > 240) {
                        next.durationMinutes = "That's over 4 hours — check the number.";
                    }
                }
            } else {
                const qty = Number(form.quantity);
                if (!form.quantity || !Number.isFinite(qty) || qty <= 0) {
                    next.quantity = "Enter how much was taken.";
                }
                if (form.milkType === "Mixed") {
                    const breastmilkQty = Number(form.breastmilkQuantity);
                    if (!form.breastmilkQuantity || !Number.isFinite(breastmilkQty) || breastmilkQty <= 0) {
                        next.breastmilkQuantity = "Enter how much breastmilk was taken.";
                    }
                }
            }
        } else if (!form.foodIntroduced.trim()) {
            next.foodIntroduced = "Enter the food.";
        }
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        if (saving) return;
        setSaving(true);
        const body = nutritionFormToRecord(form);
        try {
            if (editingId) {
                await saveRecord(body);
                toast.success("Entry updated");
            } else {
                await saveRecord(body);
                toast.success("Entry saved");
            }
            const current = prefsChildId === id && prefs ? prefs : await readPrefs();
            const next = { ...current, [form.entryType]: recentNutritionFields(form) };
            setPrefs(next);
            setPrefsChildId(id);
            storage.setItem(childPrefsKey(id), JSON.stringify(next)).catch(() => {});
            setShowModal(false);
        } catch (e) {
            toast.error(e.message || "Could not save entry");
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => { deletePending.current = null; setDeleteCandidate(null); setDeletingId(null); }, [id]);
    const handleDelete = async (entryId) => {
        if (entryId == null || deletePending.current || !isActive()) return false;
        const operation = {}; deletePending.current = operation;
        setDeletingId(entryId);
        try {
            await api.optimisticRecord(id, "nutrition", "delete", entryId, {}, { label: "Feeding entry" });
            if (!isActive()) return false;
            setShowModal(false); setDetailEntry(null); setDeleteCandidate(null);
            toast.success("Entry removed");
            return true;
        } catch (e) {
            if (isActive()) toast.error(e.message || "Could not delete entry");
            return false;
        } finally {
            if (deletePending.current === operation) { deletePending.current = null; if (isActive()) setDeletingId(null); }
        }
    };

    const milk = useMemo(() => entries.filter((e) => e.entryType === "milk" && e.date), [entries]);
    const solids = useMemo(() => entries.filter((e) => e.entryType === "solid" && e.date), [entries]);
    const rangeObj = dateView.dateRange;
    const availableDates = useMemo(
        () => [...new Set(entries.map((entry) => entry.date).filter(Boolean))],
        [entries],
    );
    const applyDateView = (next) => {
        setDateView(next);
        onDateViewChange?.(next);
    };

    // Any breastfeeding at all makes "feeds" the honest default — it's the one
    // measure that counts both kinds of feed as the same event.
    const hasBreast = useMemo(() => milk.some((e) => e.feedMethod === "breast"), [milk]);
    // "Breast time" is only offered once some breastfeed actually carries a
    // duration. Duration is optional, so a child can have hundreds of
    // breastfeeds and no minutes — and a flat-zero chart reads as "no
    // feeding", which is exactly the confusion the measure switch exists to
    // prevent. Same for "Volume" when every feed was at the breast.
    const measures = useMemo(
        () =>
            MEASURES.filter(
                (m) =>
                    (m.key !== "breast" || hasBreastDurations(milk)) &&
                    (m.key !== "volume" || milk.some((e) => feedVolumeMl(e) > 0)),
            ),
        [milk],
    );
    const fallbackKey = hasBreast ? "feeds" : "volume";
    const requested = measure || fallbackKey;
    const measureKey = measures.some((m) => m.key === requested)
        ? requested
        : measures[0]?.key || "feeds";
    const activeMeasure = MEASURES.find((m) => m.key === measureKey) || MEASURES[0];
    const { bars: milkBars, total: milkTotal, granularity: milkGranularity } = useMemo(
        () => buildBuckets(milk, rangeObj, activeMeasure.valueOf),
        [milk, rangeObj.from, rangeObj.to, measureKey],
    );
    const milkBucketAverage = milkBars.length ? milkTotal / milkBars.length : 0;
    const { bars: foodBars, total: foodTotal, granularity: foodGranularity } = useMemo(
        () => buildBuckets(solids, rangeObj, () => 1),
        [solids, rangeObj.from, rangeObj.to],
    );
    const foodBucketAverage = foodBars.length ? foodTotal / foodBars.length : 0;

    const feedingSummary = useMemo(() => dailyFeedingSummary(entries, today), [entries, today]);


    const openScopeMenu = () => {
        scopeTriggerRef.current?.measureInWindow((x, y, width, height) => {
            setScopeMenuAnchor({ x, y, width, height });
            setScopeMenuOpen(true);
        });
    };

    // --- Solid foods ---


    // One-tap chips for the food field. Beyond speed, reusing a name keeps the
    // spelling consistent, without which the distinct count above reads
    // "Banana", "banana" and " Banana " as three different foods. With no
    // history yet the starter list stands in, so a parent's first solid-food
    // entry isn't typed into a bare box.
    const foodChips = useMemo(() => foodSuggestions(solids, RECENT_FOODS), [solids]);

    const entryTitle = (e) => {
        if (e.entryType !== "milk") return e.foodIntroduced || "Solid food";
        const base = e.milkType || "Milk";
        if (e.feedMethod === "breast") {
            // Duration is optional, so the title falls back to the milk type
            // alone; "At the breast" still appears in the subtitle below.
            const mins = durationText(e.durationMinutes);
            return mins ? `${base} — ${mins}` : base;
        }
        if (e.milkType === "Mixed" && e.quantity != null && e.breastmilkQuantity != null) {
            return `${base} — ${e.quantity} ${e.unit || "mL"} formula + ${e.breastmilkQuantity} ${e.unit || "mL"} breastmilk`;
        }
        return e.quantity != null ? `${base} — ${e.quantity} ${e.unit || "mL"}` : base;
    };
    const nutritionDetailPlan = detailEntry ? {
        title: entryTitle(detailEntry),
        date: detailEntry.date,
        time: detailEntry.time,
        categoryLabel: detailEntry.entryType === "milk" ? "Milk feed" : "Solid food",
        color: colors.recordCategory[detailEntry.entryType === "milk" ? "milk" : "food"].ink,
        details: detailEntry.entryType === "milk"
            ? [
                  { label: "Milk type", value: detailEntry.milkType || "—" },
                  { label: "Feeding method", value: detailEntry.feedMethod === "breast" ? "At the breast" : "Bottle" },
                  detailEntry.formulaBrand ? { label: "Formula brand", value: detailEntry.formulaBrand } : null,
                  detailEntry.formulaScoops != null
                      ? { label: "Scoops", value: String(detailEntry.formulaScoops) }
                      : null,
                  detailEntry.quantity != null
                      ? {
                            label: detailEntry.milkType === "Mixed" ? "Formula amount" : "Amount",
                            value: `${detailEntry.quantity} ${detailEntry.unit || "mL"}`,
                        }
                      : null,
                  detailEntry.breastmilkQuantity != null
                      ? { label: "Breastmilk amount", value: `${detailEntry.breastmilkQuantity} ${detailEntry.unit || "mL"}` }
                      : null,
                  detailEntry.durationMinutes != null
                      ? { label: "Duration", value: durationText(detailEntry.durationMinutes) }
                      : null,
              ].filter(Boolean)
            : [
                  { label: "Food", value: detailEntry.foodIntroduced || "—" },
                  { label: "Food category", value: foodCategoryLabel(detailEntry.foodCategory) },
                  {
                      label: "Reaction",
                      value: detailEntry.reactionSeverity
                          ? detailEntry.reactionSeverity.charAt(0).toUpperCase() + detailEntry.reactionSeverity.slice(1)
                          : "Not recorded",
                  },
                  detailEntry.reaction ? { label: "Reaction details", value: detailEntry.reaction } : null,
              ].filter(Boolean),
        notes: detailEntry.notes,
        showReminder: false,
        deleteLabel: detailEntry.entryType === "milk" ? "Delete milk entry" : "Delete solid food entry",
    } : null;

    return (
        <PullToRefreshScrollView scope={id} refreshing={loading} onRefresh={load} scrollRef={nutritionScrollRef}
            error={refreshFailures.length ? "Some records could not be refreshed. Please retry." : ""}
            style={styles.container}
            contentContainerStyle={[styles.content, { paddingTop: padTop, paddingBottom: padBottom }]}
            keyboardShouldPersistTaps="handled"
        >
            <FeedingBreakdownCard date={today} summary={feedingSummary} entriesVisible={showFeedingEntries}
                onToggleEntries={() => setShowFeedingEntries(visible => !visible)} onOpenEntry={setDetailEntry}
                entryTitle={entryTitle} loading={loading} loadFailed={refreshFailures.includes("nutrition")} onRetry={load} />

            <SectionContainerCard title="Nutrition Over Time" subtitle="Milk and solid-food trends"
                background={<NutritionBackground kind="panel" radius={28} />}
                style={styles.nutritionPanel} minimumTitleWidth={112}
                action={<View style={styles.chartControls}>
                    <NutritionDateFilter
                        key={profile.id}
                        blurTarget={blurTarget}
                        value={dateView}
                        onChange={applyDateView}
                        minimumDate={minimumDate}
                        availableDates={availableDates}
                    />
                    <NutritionControl
                        ref={scopeTriggerRef} circular
                        style={styles.metricFilterButton}
                        onPress={openScopeMenu}
                        accessibilityRole="button"
                        accessibilityState={{ expanded: scopeMenuOpen }}
                        accessibilityLabel={`Nutrition chart filter, ${chartKeys.length} charts shown`}
                    >
                        <MaterialCommunityIcons name="tune" size={26} color={colors.nutritionSurface.histogramAccent} />
                    </NutritionControl>
                </View>}>

                <View style={styles.trendCharts}>
                    {showMilkChart ? (
                        <NutritionTrendChart
                            title="Milk"
                            headerIcon={<MilkIcon size={48} showBackground={false} />}
                            bars={milkBars}
                            unit={activeMeasure.unit}
                            color={colors.nutritionSurface.series}
                            dateWindow={rangeObj}
                            datePreset={dateView.preset}
                            average={milkBucketAverage}
                            granularity={milkGranularity}
                            loading={loading}
                            emptyMessage="No milk entries in this period yet."
                            headerControl={(
                                <MilkMeasureSelect key={id} selected={activeMeasure} options={measures}
                                    onSelect={setMeasure} blurTarget={blurTarget} />
                            )}
                        />
                    ) : null}
                    {showFoodChart ? (
                        <View style={styles.foodChart}>
                            <NutritionTrendChart
                                title="Food"
                                headerIcon={<SolidFoodIcon size={48} showBackground={false} />}
                                bars={foodBars}
                                unit="entries"
                                color={colors.nutritionSurface.series}
                                dateWindow={rangeObj}
                                datePreset={dateView.preset}
                                average={foodBucketAverage}
                                granularity={foodGranularity}
                                loading={loading}
                                emptyMessage="No food entries in this period yet."
                            />
                        </View>
                    ) : null}
                </View>
            </SectionContainerCard>

            <GlassChartFilterPopover
                visible={scopeMenuOpen}
                anchor={scopeMenuAnchor}
                onClose={() => setScopeMenuOpen(false)}
                blurTarget={blurTarget}
                title="Nutrition charts"
                closeLabel="Close nutrition chart filter"
                options={NUTRITION_CHARTS.map(chart => ({
                    ...chart,
                    icon: chart.key === "food" ? <SolidFoodIcon size={40} /> : <MilkIcon size={40} />,
                }))}
                selectedKeys={chartKeys}
                onToggle={key => setChartKeys(current => toggleRequiredKey(current, key, NUTRITION_CHART_KEYS))}
                testIDPrefix="nutrition-chart-toggle"
            />



            <MilkTypeCard key={`milk-types-${id}`} feeds={milk} today={today} minimumDate={minimumDate}
                feedsUnavailable={!nutritionCache.hasFetched} feedsFailed={refreshFailures.includes("nutrition")} onOpenEntry={setDetailEntry} />

            <SolidFoodsCard key={`solid-foods-${id}`} entries={entries} dob={dob} today={today}
                unavailable={!nutritionCache.hasFetched} failed={refreshFailures.includes("nutrition")}
                onRetry={load} onOpenEntry={setDetailEntry} />


            <PlanDetail
                visible={!!detailEntry}
                plan={nutritionDetailPlan}
                heroContent={detailEntry?.entryType === "solid" ? <SolidFoodIcon size={56} /> : detailEntry?.entryType === "milk" ? <MilkIcon size={56} /> : undefined}
                onClose={() => setDetailEntry(null)}
                onEdit={() => {
                    const entry = detailEntry;
                    setDetailEntry(null);
                    if (entry) openEdit(entry);
                }}
                onDelete={anchor => { deleteAnchor.current = anchor; setDeleteCandidate(detailEntry); }}
                deleting={deletingId === detailEntry?.id}
            />

            <DeleteConfirmation anchor={deleteAnchor.current}
                visible={!!deleteCandidate}
                title={deleteCandidate?.entryType === "milk" ? "Delete milk entry?" : "Delete solid food entry?"}
                message={deleteCandidate?.entryType === "solid" ? "Delete this solid food entry? This cannot be undone." : "Delete this nutrition entry? This cannot be undone."}
                blurTarget={blurTarget}
                busy={deletingId === deleteCandidate?.id}
                onCancel={() => setDeleteCandidate(null)}
                onConfirm={() => handleDelete(deleteCandidate?.id)}
            />

            {/* Add / Edit Modal */}
            <RecordFormSheet creationKey={form.entryType === "milk" ? "milk" : "solid"} visible={showModal} title={`${editingId ? "Edit" : "Add"} ${form.entryType === "milk" ? "Milk" : "Solid Food"} Entry`}
                onClose={() => setShowModal(false)} onSubmit={handleSave} busy={saving}
                cancelLabel={"Cancel"} submitLabel={editingId ? "Update" : "Save"} error={Object.values(errors).filter(Boolean).join("\n")}
                record={editingId != null ? { id: editingId } : null} onDelete={editingId != null ? () => handleDelete(editingId) : undefined} deleteTitle={`Delete ${form.entryType === "milk" ? "milk" : "solid food"} entry?`} deleteMessage={`Delete this ${form.entryType === "milk" ? "milk" : "solid food"} entry? This cannot be undone.`}>
                <RecordFormGroup>
                                {form.entryType === "milk" ? (
                                    <View>
                                        <Text style={styles.label}>Milk Type (required)</Text>
                                        <NeumorphicTabs selectionRole="radio" tabs={MILK_TYPES.map(label => ({ key: label, label }))} value={form.milkType} onChange={value => setF("milkType", value)} style={{ marginBottom: space.lg }} />

                                        {errors.milkType ? <Text accessibilityRole="alert" style={{ ...type.caption, color: colors.danger }}>{errors.milkType}</Text> : null}

                                        {/* Formula and Mixed use the bottle fields, so
                                            Breastmilk is the only real method choice. */}
                                        {form.milkType === "Breastmilk" ? (
                                            <View>
                                                <Text style={styles.label}>Fed By</Text>
                                                <NeumorphicTabs selectionRole="radio" tabs={METHODS} value={form.feedMethod} onChange={value => setF("feedMethod", value)} style={{ marginBottom: space.lg }} />
                                            </View>
                                        ) : null}

                                        {isBreast ? (
                                            <View>
                                                <Field
                                                        label="Duration (optional)"
                                                        trailing={<Text style={styles.inlineUnit}>minutes</Text>}
                                                        accessibilityLabel="Duration in minutes"
                                                        style={{ marginBottom: 0 }}
                                                        keyboardType="numeric"
                                                        numericMode="digits"
                                                        placeholder="e.g. 18"
                                                        value={form.durationMinutes}
                                                        onChangeText={(v) => {
                                                            setF("durationMinutes", v);
                                                            clearError("durationMinutes");
                                                        }}
                                                        error={!!errors.durationMinutes}
                                                    />
                                                {errors.durationMinutes ? (
                                                    <Text style={styles.errorText}>{errors.durationMinutes}</Text>
                                                ) : (
                                                    <Text style={styles.hint}>
                                                        Leave blank if you're not sure — the feed is still recorded.
                                                    </Text>
                                                )}
                                            </View>
                                        ) : (
                                            <View>
                                                {showFormula ? (
                                                    <View>
                                                        <View style={styles.formulaBrandField}>
                                                            <RecordFormRow divider={false} label={<Text style={styles.label}>Formula Brand</Text>}>

                                                            <TextInput
                                                                style={[styles.input, { backgroundColor: "transparent", borderWidth: 0 }]}
                                                                placeholder="e.g. Enfamil A+"
                                                                placeholderTextColor={colors.placeholder}
                                                                value={form.formulaBrand}
                                                                onChangeText={(v) => setF("formulaBrand", v)}
                                                                accessibilityLabel="Formula brand"
                                                            />
                                                            </RecordFormRow>
                                                        </View>
                                                        <RecordFormRow outlined={false} divider={false} label={<Text style={styles.label}>Scoops</Text>}>
                                                            <View style={styles.scoopStepper}>
                                                                <TouchableOpacity
                                                                    style={[[
                                                                        styles.scoopStepButton,
                                                                        !canDecreaseScoops && styles.scoopStepButtonDisabled,
                                                                    ]]}
                                                                    onPress={() => {
                                                                        setF("formulaScoops", stepFormulaScoops(form.formulaScoops, -1));
                                                                        clearError("formulaScoops");
                                                                    }}
                                                                    disabled={!canDecreaseScoops}
                                                                    accessibilityRole="button"
                                                                    accessibilityLabel="Decrease formula scoops"
                                                                    accessibilityState={{ disabled: !canDecreaseScoops }}
                                                                >
                                                                    <Ionicons name="remove" size={20} color={colors.textSecondary} />
                                                                </TouchableOpacity>
                                                                <TextInput
                                                                    style={[[
                                                                        styles.scoopStepInput,
                                                                        errors.formulaScoops && styles.inputError,
                                                                    ], { backgroundColor: "transparent", borderWidth: 0 }]}
                                                                    keyboardType="decimal-pad"
                                                                    value={form.formulaScoops}
                                                                    maxLength={6}
                                                                    selectTextOnFocus
                                                                    onChangeText={(v) => {
                                                                        const next = decimalOnly(v);
                                                                        if (!isFormulaScoopsDraft(next)) return;
                                                                        setF("formulaScoops", next);
                                                                        clearError("formulaScoops");
                                                                    }}
                                                                    accessibilityLabel="Formula scoops"
                                                                />
                                                                <TouchableOpacity
                                                                    style={[[
                                                                        styles.scoopStepButton,
                                                                        !canIncreaseScoops && styles.scoopStepButtonDisabled,
                                                                    ]]}
                                                                    onPress={() => {
                                                                        setF("formulaScoops", stepFormulaScoops(form.formulaScoops, 1));
                                                                        clearError("formulaScoops");
                                                                    }}
                                                                    disabled={!canIncreaseScoops}
                                                                    accessibilityRole="button"
                                                                    accessibilityLabel="Increase formula scoops"
                                                                    accessibilityState={{ disabled: !canIncreaseScoops }}
                                                                >
                                                                    <Ionicons name="add" size={20} color={colors.textSecondary} />
                                                                </TouchableOpacity>
                                                            </View>
                                                            {errors.formulaScoops ? (
                                                                <Text style={styles.errorText}>{errors.formulaScoops}</Text>
                                                            ) : null}
                                                        </RecordFormRow>
                                                    </View>
                                                ) : null}

                                                {/* The unit sat behind an open/close
                                                    dropdown on a form used six times a
                                                    day. Two options belong inline. */}
                                                <Field trailing={<View style={styles.unitSegment}>
                                                        {UNITS.map((u) => (
                                                            <TouchableOpacity
                                                                key={u}
                                                                style={[styles.unitBtn, form.unit === u && styles.segBtnActive, settingsSelectionStyle(colors, !!(form.unit === u))]}
                                                                onPress={() => setF("unit", u)}
                                                                accessibilityRole="button"
                                                                accessibilityLabel={`Measure in ${u}`}
                                                            >
                                                                <Text
                                                                    style={[[
                                                                        styles.segText,
                                                                        form.unit === u && styles.segTextActive,
                                                                    ], {color: (form.unit === u) ? colors.profileSettings.accent : colors.profileSettings.text}]}
                                                                >
                                                                    {u}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        ))}
                                                    </View>}
                                                        label={form.milkType === "Mixed" ? "Formula Amount" : "Amount"}
                                                        style={{ marginBottom: 0 }}
                                                        keyboardType="numeric"
                                                        numericMode="decimal"
                                                        placeholder="e.g. 120"
                                                        value={form.quantity}
                                                        onChangeText={(v) => {
                                                            setF("quantity", v);
                                                            clearError("quantity");
                                                        }}
                                                        error={!!errors.quantity}
                                                    />
                                                {errors.quantity ? <Text style={styles.errorText}>{errors.quantity}</Text> : null}
                                                {form.milkType === "Mixed" ? (
                                                    <View>
                                                        <Field trailing={<Text style={styles.inlineUnit}>{form.unit}</Text>}
                                                                label="Breastmilk Amount"
                                                                style={{ marginBottom: 0 }}
                                                                keyboardType="numeric"
                                                                numericMode="decimal"
                                                                placeholder="e.g. 60"
                                                                value={form.breastmilkQuantity}
                                                                onChangeText={(v) => {
                                                                    setF("breastmilkQuantity", v);
                                                                    clearError("breastmilkQuantity");
                                                                }}
                                                                error={!!errors.breastmilkQuantity}
                                                            />
                                                        {errors.breastmilkQuantity ? (
                                                            <Text style={styles.errorText}>{errors.breastmilkQuantity}</Text>
                                                        ) : null}
                                                    </View>
                                                ) : null}
                                            </View>
                                        )}
                                    </View>
                                ) : (
                                    <View>
                                        <RecordFormRow error={!!errors.foodIntroduced} divider={false} label={<Text style={styles.label}>Food</Text>}>

                                        <TextInput
                                            style={[[styles.input, errors.foodIntroduced && styles.inputError], { backgroundColor: "transparent", borderWidth: 0 }]}
                                            placeholder="e.g. Mashed banana"
                                            placeholderTextColor={colors.placeholder}
                                            value={form.foodIntroduced}
                                            onChangeText={(v) => {
                                                setF("foodIntroduced", v);
                                                clearError("foodIntroduced");
                                            }}
                                            accessibilityLabel="Food"
                                        />
                                        </RecordFormRow>
                                        {errors.foodIntroduced ? (
                                            <Text style={styles.errorText}>{errors.foodIntroduced}</Text>
                                        ) : null}
                                        <Text style={styles.label}>Food category (optional)</Text>
                                        <View style={styles.chipRow}>{["", ...FOOD_CATEGORIES].map(category => (
                                            <TouchableOpacity key={category || "unrecorded"} style={[styles.foodChip, form.foodCategory === category && styles.segBtnActive, settingsSelectionStyle(colors, !!(form.foodCategory === category))]}
                                                onPress={() => setF("foodCategory", category)} accessibilityRole="button"
                                                accessibilityLabel={`Food category ${category ? foodCategoryLabel(category) : "Not recorded"}`}
                                                aria-pressed={form.foodCategory === category}
                                                accessibilityState={{ selected: form.foodCategory === category }}>
                                                <Text style={[styles.segText, {color: (form.foodCategory === category) ? colors.profileSettings.accent : colors.profileSettings.text}]}>{category ? foodCategoryLabel(category) : "Not recorded"}</Text>
                                            </TouchableOpacity>
                                        ))}</View>
                                        {foodChips.foods.length ? (
                                            <View>
                                                {/* Labelled differently in each
                                                    case on purpose — a parent
                                                    must never mistake a
                                                    suggestion for something
                                                    they already recorded. */}
                                                <Text style={styles.hint}>
                                                    {foodChips.fromHistory
                                                        ? "Recently logged — tap to reuse"
                                                        : "Common first foods — tap to fill"}
                                                </Text>
                                                <View style={styles.chipRow}>
                                                {foodChips.foods.map((f) => (
                                                    <TouchableOpacity
                                                        key={f}
                                                        style={styles.foodChip}
                                                        onPress={() => {
                                                            setF("foodIntroduced", f);
                                                            clearError("foodIntroduced");
                                                        }}
                                                        accessibilityRole="button"
                                                        accessibilityLabel={`Use ${f}`}
                                                    >
                                                        <Text style={styles.foodChipText} numberOfLines={1}>
                                                            {f}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                                </View>
                                            </View>
                                        ) : null}

                                        <Text style={styles.label}>Any reaction?</Text>
                                        {form.reactionSeverity === "" ? <Text style={styles.hint}>Severity not recorded. Existing symptoms are preserved unless you change them.</Text> : null}
                                        <NeumorphicTabs selectionRole="radio" tabs={SEVERITIES} value={form.reactionSeverity} onChange={value => setF("reactionSeverity", value)} style={{ marginBottom: space.lg }} />
                                        {form.reactionSeverity !== "none" ? (
                                            <View>
                                                <RecordFormRow divider={false} label={<Text style={styles.label}>What happened</Text>}>

                                                <TextInput
                                                    style={[styles.input, { backgroundColor: "transparent", borderWidth: 0 }]}
                                                    placeholder="e.g. Rash around the mouth, gone in an hour"
                                                    placeholderTextColor={colors.placeholder}
                                                    value={form.reaction}
                                                    onChangeText={(v) => setF("reaction", v)}
                                                    accessibilityLabel="What happened"
                                                />
                                                </RecordFormRow>
                                                {/* The app records what the parent
                                                    observed. Turning that into an
                                                    allergy on the child's profile is a
                                                    diagnosis, and theirs to make. */}
                                                <Text style={styles.hint}>
                                                    Saved with this food only. If it turns out to be an allergy, add it in
                                                    the child's profile.
                                                </Text>
                                            </View>
                                        ) : null}
                                    </View>
                                )}

                                <View style={{ flexDirection: "row", gap: space.sm }}>
                                    <View style={{ flex: 1 }}>
                                        <RecordFormRow divider={false} label={<Text style={styles.label}>Date</Text>}>

                                        <DateField value={form.date} onChange={(v) => setF("date", v)} />
                                        </RecordFormRow>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <RecordFormRow divider={false} label={<Text style={styles.label}>Time</Text>}>

                                        <TimeField value={form.time} onChange={(v) => setF("time", v)} />
                                        </RecordFormRow>
                                    </View>
                                </View>

                                <RecordFormRow divider={false} label={<Text style={styles.label}>Notes (optional)</Text>}>

                                <TextInput
                                    style={[styles.input, { backgroundColor: "transparent", borderWidth: 0 }]}
                                    placeholder="Anything worth remembering"
                                    placeholderTextColor={colors.placeholder}
                                    value={form.notes}
                                    onChangeText={(v) => setF("notes", v)}
                                    accessibilityLabel="Notes"
                                />
                                </RecordFormRow>

                </RecordFormGroup>
            </RecordFormSheet>
        </PullToRefreshScrollView>
    );
}

const makeStyles = (colors) =>
    StyleSheet.create({
        // transparent, not colors.background: App.js paints the page gradient.

        container: { flex: 1, backgroundColor: "transparent" },
        // Padding on the content, not the ScrollView box — see Health.js.
        content: { padding: space.lg },



        // Food suggestions and categories
        chipRow: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginBottom: space.md },

        nutritionPanel: { borderRadius: 28, borderWidth: 0, boxShadow: colors.nutritionSurface.panelShadow },
        foodChart: { marginTop: 0 },
        chartControls: {
            flexDirection: "row",
            alignItems: "center",
            gap: space.sm,
        },
        metricFilterButton: {
            width: MIN_TOUCH,
            height: MIN_TOUCH,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: radius.pill,
            flexShrink: 0,
        },
        trendCharts: { gap: space.md },

        // Modal

        label: { ...type.label, color: colors.textSecondary, marginBottom: 6 },
        formulaBrandField: { paddingTop: space.md },
        hint: { ...type.caption, color: colors.textMuted, marginBottom: space.sm },
        errorText: { ...type.caption, color: colors.danger, marginTop: -space.sm, marginBottom: space.md },
        input: {
            backgroundColor: colors.surfaceAlt,
            borderWidth: 0,
            borderColor: colors.border,
            borderRadius: radius.lg,
            borderCurve: "continuous",
            paddingHorizontal: space.lg,
            minHeight: 52,
            paddingVertical: space.sm,
            ...type.body,
            color: colors.text,
            marginBottom: space.md,
        },
        inputError: { borderWidth: 1, borderColor: colors.danger },
        scoopStepper: {
            alignSelf: "flex-end",
            flexDirection: "row",
            alignItems: "center",
            minHeight: 52,
            padding: 4,
            backgroundColor: colors.surfaceAlt,
            borderRadius: radius.lg,
            borderCurve: "continuous",
        },
        scoopStepButton: {
            width: MIN_TOUCH,
            height: MIN_TOUCH,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: radius.md,
            borderCurve: "continuous",
        },
        scoopStepButtonDisabled: { opacity: 0.35 },
        scoopStepInput: {
            width: 68,
            height: MIN_TOUCH,
            paddingHorizontal: space.xs,
            paddingVertical: 0,
            backgroundColor: colors.surface,
            borderWidth: 0,
            borderColor: colors.danger,
            borderRadius: radius.md,
            borderCurve: "continuous",
            textAlign: "center",
            ...type.body,
            fontVariant: ["tabular-nums"],
            color: colors.text,
            ...shadow.card,
        },
        // minWidth: 0 is load-bearing, not tidying. react-native-web renders
        // TextInput as a real <input>, and unlike View it gets no min-width
        // reset — so `min-width: auto` resolves to the element's INTRINSIC
        // width (measured: 228px here). With flex-basis at 0% the field still
        // refuses to shrink below that, and whatever shares the row gets
        // pushed out of the card: the mL/oz selector was 9px past the edge at
        // 390pt and 79px past it at 320pt, leaving "oz" unreachable.
        // Same family as the `flex: 0` trap noted in Dashboard.js, mirrored.
        inputFlex: { flex: 1, minWidth: 0, marginBottom: space.md },
        inlineRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
        // Both of inlineRow's trailing items hold their width: once the field
        // can shrink, flex would otherwise take it out of these instead and
        // clip "oz" / "minutes".
        inlineUnit: { ...type.body, color: colors.textSecondary, marginBottom: 0, flexShrink: 0 },
        unitSegment: {
            flexDirection: "row",
            flexShrink: 0,
            backgroundColor: colors.surfaceAlt,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.md,
            borderCurve: "continuous",
            padding: 4,
            marginBottom: 0,
        },
        unitBtn: {
            minWidth: 48,
            paddingVertical: 12,
            borderRadius: radius.sm,
            borderCurve: "continuous",
            alignItems: "center",
        },
        foodChip: {
            minHeight: MIN_TOUCH,
            justifyContent: "center",
            paddingHorizontal: space.md,
            paddingVertical: 8,
            borderRadius: radius.pill,
            borderCurve: "continuous",
            borderWidth: 1,
            borderColor: "transparent",
            backgroundColor: colors.profileSettings.control[1],
            boxShadow: colors.profileSettings.iconShadow,
            maxWidth: "100%",
        },
        foodChipText: { ...type.caption, color: colors.textSecondary },
        segment: {
            flexDirection: "row",
            backgroundColor: colors.surfaceAlt,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.md,
            borderCurve: "continuous",
            padding: 4,
            marginBottom: space.md,
        },
        segBtn: {
            flex: 1,
            paddingVertical: 12,
            paddingHorizontal: 0,
            borderRadius: radius.sm,
            borderCurve: "continuous",
            alignItems: "center",
        },
        segBtnActive: { backgroundColor: colors.surface, ...shadow.card },
        // Both states are the same size, per DESIGN.md's Weight Ladder Rule —
        // growing the active label is what used to overflow tab boxes.
        segText: { ...type.caption, fontWeight: "700", color: colors.textMuted },
        segTextActive: { color: colors.primary },

    });
