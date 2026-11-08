import SelectTrigger from "./SelectTrigger";
import { SunkenInputSurface } from "./Field";
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Image, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { MIN_TOUCH, type } from "../../theme";
import AnchoredMenu, { AnchoredMenuItem } from "./AnchoredMenu";
import Gradient from "./Gradient";
import EntriesButton from "./EntriesButton";
import GlassLighting from "./GlassLighting";
import ScrollContext from "../../context/ScrollContext";
import RecordIcon from "./RecordIcon";
import MemoryDateRow from "./MemoryDateRow";
import { SkeletonBlock } from "./Skeleton";
import useSoftPress from "./useSoftPress";
import useReducedMotion from "./useReducedMotion";
import { DOMAINS, developmentCategoryLabel, resolveDevelopmentCategory } from "../../utils/milestoneChecklist";

const FILTERS = [
    { key: "all", label: "All", icon: "grid" },
    { key: "milestone", label: "Milestones" },
    { key: "memory", label: "Memories" },
];
const SORTS = [{ key: "newest", label: "Newest first" }, { key: "oldest", label: "Oldest first" }];
const CATEGORIES = [{ key: "all", label: "All categories" }, ...DOMAINS, { key: "uncategorized", label: "Not categorized" }];

export function GalleryCategorySelect({ value, onSelect, blurTarget }) {
    const { colors } = useTheme();
    const glass = colors.growthDropdownGlass;
    const styles = useMemo(() => makeCategoryStyles(glass), [glass]);
    const selected = CATEGORIES.find(category => category.key === value) || CATEGORIES[0];
    const [open, setOpen] = useState(false), [anchor, setAnchor] = useState(null);
    const trigger = useRef(null);
    const { width, height, fontScale } = useWindowDimensions();
    const { scrollY, headerHeight, tabBarHeight } = useContext(ScrollContext);
    const updateAnchor = useCallback(() => {
        trigger.current?.measureInWindow((x, y, width, height) => {
            setAnchor(previous => previous?.x === x && previous?.y === y && previous?.width === width && previous?.height === height
                ? previous : { x, y, width, height });
        });
    }, []);
    useEffect(() => { setOpen(false); }, [value]);
    useEffect(() => {
        if (!open) return;
        updateAnchor();
        const listener = scrollY.addListener(updateAnchor);
        const observer = Platform.OS === "web" && globalThis.ResizeObserver ? new globalThis.ResizeObserver(updateAnchor) : null;
        let node = trigger.current;
        while (observer && node?.nodeType === 1) { observer.observe(node); node = node.parentElement; }
        return () => { scrollY.removeListener(listener); observer?.disconnect(); };
    }, [open, width, height, fontScale, headerHeight, tabBarHeight, scrollY, updateAnchor]);
    const openMenu = () => trigger.current?.measureInWindow((x, y, width, height) => {
        setAnchor({ x, y, width, height }); setOpen(true);
    });
    const header = (expanded = false, covered = false) => <TouchableOpacity
        ref={expanded ? undefined : trigger} testID={expanded ? "gallery-category-header" : "gallery-category-select"}
        onPress={expanded ? () => setOpen(false) : openMenu}
        onLayout={!expanded && open ? updateAnchor : undefined}
        style={[styles.control, expanded && styles.header, covered && { opacity: 0, pointerEvents: "none" }]}
        aria-hidden={covered || undefined} accessible={!covered}
        importantForAccessibility={covered ? "no-hide-descendants" : "auto"}
        {...(Platform.OS === "web" ? { tabIndex: covered ? -1 : 0 } : {})}
        accessibilityRole="button" accessibilityState={{ expanded }} aria-expanded={expanded}
        accessibilityLabel={`Development category, ${selected.label}`}>
        {!expanded ? <>
            <Gradient pointerEvents="none" colors={glass.popoverPanel} style={styles.face} />
            <GlassLighting material={glass} radius={22} />
        </> : null}
        <Text style={styles.label}>{selected.label}</Text>
        <Ionicons accessible={false} name={expanded ? "chevron-up" : "chevron-down"} size={18} color={glass.accent} />
    </TouchableOpacity>;
    return <View style={styles.container}>
        <AnchoredMenu visible={open} anchor={anchor} onClose={() => setOpen(false)}
            appearance="connectedSelect" variant="select" dimBackdrop={false} blurTarget={blurTarget}
            trigger={({ covered }) => header(false, covered)} header={header(true)}>
            {CATEGORIES.map(category => <AnchoredMenuItem key={category.key} variant="connectedSelect" label={category.label}
                selected={selected.key === category.key} onPress={() => { setOpen(false); onSelect(category.key); }} />)}
        </AnchoredMenu>
    </View>;
}

function Surface({ material, radius = 24 }) {
    const { colors } = useTheme();
    const p = colors.memoriesSurface;
    return <Gradient accessible={false} pointerEvents="none" colors={material}
        style={[StyleSheet.absoluteFill, { borderRadius: radius,
            boxShadow: `inset 1px 2px 2px ${p.highlight}, inset -1px -1px 2px ${p.shade}` }]} />;
}

function Control({ ref: controlRef, active = false, row = false, radius = 999, style, children, ...props }) {
    const { colors } = useTheme();
    const p = colors.memoriesSurface;
    const reduced = useReducedMotion(), { respond, transform } = useSoftPress();
    const selection = useRef(new Animated.Value(active ? 1 : 0)).current;
    const [pressed, setPressed] = useState(false), [focused, setFocused] = useState(false);
    useEffect(() => {
        selection.stopAnimation();
        if (reduced !== false) selection.setValue(active ? 1 : 0);
        else Animated.timing(selection, { toValue: active ? 1 : 0, duration: 200,
            easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== "web", isInteraction: false }).start();
        return () => selection.stopAnimation();
    }, [active, reduced, selection]);
    const press = down => { setPressed(down); respond(down); };
    const focus = event => setFocused(Platform.OS === "web" && Boolean(event.currentTarget?.matches?.(":focus-visible")));
    return <Pressable {...props} ref={controlRef} accessibilityRole="button" aria-pressed={props.accessibilityState?.selected}
        aria-expanded={props.accessibilityState?.expanded}
        onFocus={focus} onKeyDown={focus} onBlur={() => { setFocused(false); press(false); }}
        onPressIn={() => press(true)} onPressOut={() => press(false)}
        style={[{ minHeight: MIN_TOUCH, borderRadius: radius }, style, Platform.OS === "web" && {
            outlineStyle: focused ? "solid" : "none", outlineWidth: 2, outlineOffset: 3, outlineColor: p.accent }]}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, transform,
            boxShadow: pressed ? p.pressedShadow : active ? p.activeShadow : row ? p.itemShadow : p.controlShadow }]}>
            <Surface material={row ? p.item : p.control} radius={radius} />
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: selection }]}>
                <Surface material={p.active} radius={radius} />
            </Animated.View>
        </Animated.View>
        {children}
    </Pressable>;
}

export function MemoryRecordRow({ record, onOpen, thumbnailWidth = 100, compact = false }) {
    const { colors } = useTheme();
    const p = colors.memoriesSurface;
    const s = useMemo(() => makeStyles(p), [p]);
    const milestone = record.kind === "milestone";
    const categoryMaterial = colors.developmentChecklist.categoryArt[resolveDevelopmentCategory(record, record.kind)];
    return <Control row radius={24} onPress={() => onOpen(record)} accessibilityLabel={`View ${record.title}`}
        style={[s.record, compact && { padding: 8, gap: 8 }]}>
        <View style={[s.thumbnail, { width: thumbnailWidth, height: Math.max(100, Math.min(115, thumbnailWidth + 10)) }]}>
            {record.photoUrl ? <Image accessible={false} source={{ uri: record.photoUrl }} resizeMode="cover" style={StyleSheet.absoluteFill} />
                : milestone ? <RecordIcon category="milestone" size={44} />
                    : <RecordIcon category="memory" size={28} showBackground={false} />}
            {milestone && record.photoUrl ? <View pointerEvents="none" style={s.flag}><RecordIcon category="milestone" size={25} /></View> : null}
        </View>
        <View style={s.details}>
            <Text style={s.recordTitle}>{record.title}</Text>
            <View style={s.badges}>
                {categoryMaterial ? <View style={s.badge}>
                    <Surface material={categoryMaterial.surface} radius={999} />
                    <Text style={[s.badgeText, { color: categoryMaterial.badgeInk }]}>{developmentCategoryLabel(record, record.kind)}</Text>
                </View> : null}
                <View style={s.badge}>
                    <Surface material={milestone ? colors.milestoneIcon.background : p.control} radius={999} />
                    <Text style={[s.badgeText, milestone && { color: colors.milestoneIcon.badgeInk }]}>{milestone ? "Milestone" : "Memory"}</Text>
                </View>
            </View>
            {record.description ? <Text style={s.description}>{record.description}</Text> : null}
            <MemoryDateRow date={record.date} />
        </View>
        <View pointerEvents="none" accessible={false} style={[s.chevron, compact && { width: 28, height: 28 }]}>
            <Surface material={p.control} radius={999} />
            <Ionicons name="chevron-forward" size={21} color={p.accent} />
        </View>
    </Control>;
}

export default function MemoriesMilestonesCollection({ result, view, loading, onChangeView, onShowMore, onOpenRecord, blurTarget }) {
    const { colors } = useTheme();
    const p = colors.memoriesSurface;
    const s = useMemo(() => makeStyles(p), [p]);
    const { fontScale } = useWindowDimensions();
    const [width, setWidth] = useState(0), [searchFocused, setSearchFocused] = useState(false);
    const [sortOpen, setSortOpen] = useState(false), [sortAnchor, setSortAnchor] = useState(null);
    const sortTrigger = useRef(null);
    const selectedCategory = CATEGORIES.find(category => category.key === view.developmentCategory) || CATEGORIES[0];
    const compact = width > 0 && width < 330;
    const thumbnailWidth = fontScale > 1.2 ? 72 : width > 0 ? Math.max(80, Math.min(120, (width - (compact ? 24 : 32)) * 0.3)) : 100;
    const selectedFilter = FILTERS.find(filter => filter.key === view.category) || FILTERS[0];
    const selectedSort = SORTS.find(sort => sort.key === view.sort) || SORTS[0];
    const empty = !result.counts.all ? "No memories or milestones recorded yet."
        : view.query.trim() || selectedCategory.key !== "all" ? "No matching memories or milestones found."
            : view.category === "milestone" ? "No milestones recorded yet." : "No memories recorded yet.";
    return <View onLayout={event => setWidth(Math.floor(event.nativeEvent.layout.width))}
        style={[s.panel, compact && { padding: 12 }]}>
        <Surface material={p.panel} radius={28} />
        <View style={s.header}>
            <RecordIcon category="milestone" size={48} showBackground={false} />
            <View style={s.headingText}>
                <Text accessibilityRole="header" style={s.title}>Memories &amp; Milestones</Text>
                <Text style={s.subtitle}>A collection of special moments and developmental milestones.</Text>
            </View>
        </View>
        <View style={[[s.search, Platform.OS === "web" && { outlineStyle: searchFocused ? "solid" : "none",
            outlineWidth: 2, outlineOffset: 3, outlineColor: p.accent }], { boxShadow: "none", backgroundColor: "transparent", position: "relative" }]}>
            <SunkenInputSurface />
            <Ionicons accessible={false} name="search-outline" size={21} color={p.secondary} />
            <TextInput value={view.query} onChangeText={query => onChangeView({ query })}
                accessibilityLabel="Search memories and milestones" placeholder="Search memories and milestones..."
                placeholderTextColor={p.secondary} style={s.input} onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
                autoCapitalize="none" autoCorrect={false} returnKeyType="search" />
            {view.query ? <Pressable onPress={() => onChangeView({ query: "" })} style={s.clear}
                accessibilityRole="button" accessibilityLabel="Clear memories search"><Ionicons name="close-circle" size={20} color={p.accent} /></Pressable> : null}
        </View>
        <GalleryCategorySelect value={selectedCategory.key} onSelect={developmentCategory => onChangeView({ developmentCategory })} blurTarget={blurTarget} />
        <View style={s.toolbar}>
            <SelectTrigger ref={sortTrigger} value={selectedSort.label} visible={sortOpen} onAnchorChange={setSortAnchor}
                leading={<Ionicons accessible={false} name="swap-vertical" size={19} color={p.accent} />}
                accessibilityLabel={`Filter and sort memories, ${selectedFilter.label}, ${selectedSort.label}`} containerStyle={{ marginLeft: "auto", minWidth: 180, maxWidth: "100%" }}
                onPress={() => sortTrigger.current?.measureInWindow((x,y,width,height) => {
                    setSortAnchor({x,y,width,height}); setSortOpen(true);
                })} />
        </View>
        {loading ? <View accessibilityLabel="Loading memories and milestones" style={s.groups}>
            {[0, 1].map(index => <View key={index} style={s.loadingRow}>
                <Surface material={p.item} radius={24} />
                <SkeletonBlock width={thumbnailWidth} height={110} radius={18} />
                <View style={s.details}><SkeletonBlock width="90%" height={18} /><SkeletonBlock width="70%" height={13} style={{ marginTop: 10 }} /><SkeletonBlock width="85%" height={13} style={{ marginTop: 16 }} /></View>
            </View>)}
        </View> : result.total ? <View style={s.groups}>
            {result.groups.map(group => <View key={group.key} style={s.group}>
                <Text accessibilityRole="header" style={s.month}>{group.label}</Text>
                {group.items.map(record => <MemoryRecordRow key={`${record.kind}-${record.id}`} record={record}
                    onOpen={onOpenRecord} compact={compact} thumbnailWidth={thumbnailWidth} />)}
            </View>)}
            {result.remaining > 0 ? <EntriesButton onPress={onShowMore}
                accessibilityLabel={`Show more memories and milestones, ${result.remaining} remaining`}
                label={`Show more (${result.remaining} remaining)`} /> : null}
        </View> : <View style={s.empty}>
            <Surface material={p.item} radius={24} />
            {view.category === "memory" && !view.query.trim() ? <RecordIcon category="memory" size={30} showBackground={false} />
                : <Ionicons accessible={false} name={view.query.trim() ? "search-outline" : "images-outline"} size={30} color={p.secondary} />}
            <Text style={s.emptyText}>{empty}</Text>
        </View>}
        <AnchoredMenu visible={sortOpen} anchor={sortAnchor} onClose={() => setSortOpen(false)}
            appearance="connectedSelect" variant="select" dimBackdrop={false} blurTarget={blurTarget}
            header={<SelectTrigger expanded value={selectedSort.label}
                leading={<Ionicons accessible={false} name="swap-vertical" size={19} color={p.accent} />}
                accessibilityLabel={`Close filters, ${selectedFilter.label}, ${selectedSort.label}`}
                onPress={() => setSortOpen(false)} />}>
            <Text accessibilityRole="header" style={s.filterHeading}>Record type</Text>
            {FILTERS.map(filter => <AnchoredMenuItem key={filter.key} label={filter.label}
                variant="connectedSelect" selected={view.category === filter.key}
                leading={filter.key === "milestone" ? <RecordIcon category="milestone" size={23} />
                    : filter.key === "memory" ? <RecordIcon category="memory" size={19} showBackground={false} />
                    : <Ionicons accessible={false} name={filter.icon} size={19} color={p.accent} />}
                accessibilityLabel={`${filter.label}, ${result.counts[filter.key]} total records`}
                onPress={() => { onChangeView({ category: filter.key }); setSortOpen(false); }} />)}
            <View pointerEvents="none" style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.growthDropdownGlass.divider, marginVertical: 8 }} />
            <Text accessibilityRole="header" style={s.filterHeading}>Sort order</Text>
            {SORTS.map(sort => <AnchoredMenuItem key={sort.key} label={sort.label}
                variant="connectedSelect" selected={view.sort === sort.key}
                accessibilityLabel={`Sort order, ${sort.label}`}
                onPress={() => { onChangeView({ sort: sort.key }); setSortOpen(false); }} />)}
        </AnchoredMenu>
    </View>;
}

const makeCategoryStyles = glass => StyleSheet.create({
    container: { marginBottom: 12 },
    control: { minHeight: MIN_TOUCH, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8,
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 22, borderCurve: "continuous",
        backgroundColor: "transparent", boxShadow: glass.panelShadow },
    header: { flex: 1, minWidth: 0, borderRadius: 0, boxShadow: "none", borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: glass.divider },
    face: { ...StyleSheet.absoluteFill, borderRadius: 22 },
    label: { ...type.label, fontSize: 13, lineHeight: 18, color: glass.text, flex: 1, minWidth: 0 },
});

const makeStyles = p => StyleSheet.create({
    panel: { padding: 16, borderRadius: 28, marginBottom: 16, boxShadow: p.panelShadow, overflow: "visible" },
    header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 },
    headingText: { flex: 1, minWidth: 0 },
    title: { ...type.title, fontSize: 21, lineHeight: 26, color: p.text },
    subtitle: { ...type.caption, color: p.secondary, marginTop: 5 },
    search: { minHeight: 50, flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 14,
        paddingRight: 6, borderRadius: 999, boxShadow: p.controlShadow, marginBottom: 18 },
    input: { ...type.body, color: p.text, minHeight: 50, flex: 1, minWidth: 0, position: "relative",
        ...(Platform.OS === "web" ? { outlineStyle: "none" } : {}) },
    clear: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: "center", justifyContent: "center" },
    filterHeading: { ...type.caption, color: p.secondary, fontWeight: "600", paddingHorizontal: 10, paddingVertical: 6 },
    toolbar: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 22 },
    groups: { gap: 18 }, group: { gap: 12 },
    month: { ...type.label, color: p.secondary, textTransform: "uppercase", marginTop: 2 },
    record: { flexDirection: "row", alignItems: "center", padding: 10, gap: 10, width: "100%" },
    thumbnail: { borderRadius: 18, overflow: "hidden", flexShrink: 0, alignItems: "center", justifyContent: "center", backgroundColor: p.control[1] },
    flag: { position: "absolute", top: 6, left: 6 },
    details: { flex: 1, minWidth: 0 },
    recordTitle: { ...type.bodyStrong, fontSize: 15, lineHeight: 20, color: p.text },
    description: { ...type.caption, color: p.secondary, marginTop: 5 },
    badges: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
    badge: { alignSelf: "flex-start", maxWidth: "100%", paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 999, boxShadow: p.controlShadow },
    badgeText: { ...type.caption, color: p.accent, flexShrink: 1 },
    chevron: { width: 32, height: 32, borderRadius: 999, flexShrink: 0, alignItems: "center", justifyContent: "center", boxShadow: p.controlShadow },
    empty: { padding: 24, borderRadius: 24, alignItems: "center", gap: 12, boxShadow: p.itemShadow },
    emptyText: { ...type.body, color: p.secondary, textAlign: "center" },
    loadingRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: 24, boxShadow: p.itemShadow },
});
