// Run: node utils/homeCards.check.js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { transformSync } = require("@babel/core");
const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const compiled = transformSync(read("utils/storageAdapter.js"), {
    babelrc: false, configFile: false, plugins: ["@babel/plugin-transform-modules-commonjs"],
}).code;
const original = {
    "bb_offline_summary:child-1": "snapshot",
    "bb_offline_summary:child-2": "snapshot",
    bb_seen_offlineSummary: "1",
    bb_token: "session",
    bb_theme_override: "boy",
    bb_seen_setup: "1",
    bb_seen_onboarding: "1",
    "other:bb_offline_summary:child": "unrelated",
    bb_offline_summary_preferences: "unrelated",
};
function adapter(mode, values, options = {}) {
    const data = new Map(Object.entries(values));
    const removed = [];
    let failRemoval = options.failRemoval;
    const remove = async (key) => {
        if (failRemoval) { failRemoval = false; throw new Error("Storage unavailable"); }
        removed.push(key);
        data.delete(key);
    };
    const native = {
        getAllKeys: async () => {
            if (options.failKeys) throw new Error("Storage unavailable");
            return [...data.keys()];
        },
        getItem: async (key) => data.get(key) ?? null,
        setItem: async (key, value) => data.set(key, value),
        removeItem: remove,
    };
    const web = {
        get length() { return data.size; },
        key: (index) => [...data.keys()][index],
        getItem: (key) => data.get(key) ?? null,
        setItem: (key, value) => data.set(key, value),
        removeItem: remove,
    };
    const module = { exports: {} };
    new Function("require", "module", "exports", "window", "localStorage", "console", compiled)(
        () => {
            if (mode === "fallback") throw new Error("No native storage");
            return { default: native };
        },
        module, module.exports, mode === "web" ? { localStorage: web } : undefined, web, { log() {} },
    );
    return { ...module.exports, data, removed };
}
(async () => {
    for (const mode of ["web", "native"]) {
        const test = adapter(mode, original);
        await test.removeLegacyOfflineSummaries();
        assert.deepEqual(test.removed.sort(), ["bb_offline_summary:child-1", "bb_offline_summary:child-2", "bb_seen_offlineSummary"]);
        for (const [key, value] of Object.entries(original)) {
            if (!test.removed.includes(key)) assert.equal(test.data.get(key), value);
        }
        await test.removeLegacyOfflineSummaries();
        assert.equal(test.removed.length, 3, "Repeat launch is safe");
    }
    const failed = adapter("native", original, { failRemoval: true });
    await failed.removeLegacyOfflineSummaries();
    await failed.removeLegacyOfflineSummaries();
    assert.equal(failed.data.has("bb_offline_summary:child-1"), false, "Next launch retries failed deletion");
    assert.equal(failed.data.get("bb_token"), "session");
    for (const test of [adapter("native", original, { failKeys: true }), adapter("fallback", original)]) {
        await assert.doesNotReject(test.removeLegacyOfflineSummaries());
        assert.equal(test.removed.length, 0);
    }
    const home = read("components/Dashboard.js");
    const nutrition = read("components/NutritionTracker.js");
    const feeding = read("components/ui/FeedingTodayCard.js");
    const growthChart = read("components/GrowthChart.js");
    const anchoredMenu = read("components/ui/AnchoredMenu.js");
    const app = read("App.js");
    assert(!/offlineSummary|OfflineSummary|cacheSummary|getSummary|offlinePrompt/.test(home + app));
    assert(!fs.existsSync(path.join(root, "components/OfflineSummaryView.js")));
    assert(!fs.existsSync(path.join(root, "utils/offlineSummary.js")));
    assert(app.includes("void removeLegacyOfflineSummaries();"), "Cleanup must not block startup");
    const vaccines = home.indexOf("{/* Vaccination progress */}");
    const profile = home.indexOf("<BabyProfileCard");
    const growth = home.indexOf("<GrowthChart");
    const today = home.indexOf("<TodaysFeedingOverviewCard summary=");
    const memories = home.indexOf("<MemoriesMilestonesCard records=");
    assert(vaccines < profile && profile < today && today < growth && growth < memories, "Home card order");
    assert(!home.includes('title="Recent Activity"') && !home.includes('nav("allActivity")'), "Home no longer renders the Recent Activity card");
    assert(!home.includes('useRecords(profile.id, "checkups")') && !home.includes('useRecords(profile.id, "milestones")'), "Home no longer subscribes to activity-only records");
    assert(app.includes('currentView === "allActivity"'), "Dedicated activity screen remains available to navigation");
    assert(!home.includes('accessibilityLabel={`Next:'), "Home no longer renders the Next Schedule card");
    assert(!home.includes("setUpcoming"), "Removed card has no remaining derived state");
    const feedingToday = home.slice(today, growth);
    assert(feedingToday.includes('nav("nutrition")'));
    assert(feedingToday.includes('nav("nutrition", "entry", { childId: profile.id, entryId })'));
    assert(!feedingToday.includes('nav("nutrition", "milk")'));
    assert(!feedingToday.includes('nav("nutrition", "solid")'));
    assert(!feedingToday.includes("not a medical assessment"));
    assert(feeding.includes("minHeight: 136"), "Feeding metrics have flexible compact heights");
    assert(!feeding.includes("aspectRatio: 1"), "Metrics grow for accessibility text");
    assert(feeding.includes('<MilkIcon size={56} backgroundShape="rounded-square" />'));
    assert(feeding.includes('<SolidFoodIcon size={56} showBackground={false} />'));
    for (const copy of ["Milk feeds", "Solid meals", "Bottle volume logged", "Breastfeeding time", "Latest", "Time not recorded", "Reaction recorded"]) {
        assert(feeding.includes(copy), "Feeding today content: " + copy);
    }
    const nutritionToday = nutrition.indexOf("<FeedingBreakdownCard date={today}");
    assert(nutritionToday >= 0 && nutritionToday < nutrition.indexOf('<SectionContainerCard title="Nutrition Over Time"'), "Detailed feeding card precedes Nutrition Over Time");
    assert(!home.includes("<FeedingTodayCard"), "Detailed feeding card is absent from Home");
    assert(nutrition.includes('<FeedingBreakdownCard date={today}'), "Daily feeding breakdown stays in Nutrition");
    assert(app.includes("initialRecord={navPayload}"), "Nutrition receives record deep-link payload");
    assert(home.slice(growth, memories).includes('nav("growth")'));
    assert(home.includes("recentDateRange(30, profile.dateOfBirth)"), "Home growth uses the rolling last 30 days");
    assert(home.includes('growthLast30DaysTitle') && home.includes('growthNoMeasurementsLast30Days'), "Home growth copy matches its rolling range");
    assert(home.includes('nav("share", null, { section: "activeRecentShares" })'), "Home active-share card targets its Share Records section");
    assert(app.includes("initialSection={navPayload?.section}"), "App forwards the Share Records section target");
    assert(home.slice(vaccines, profile).includes('nav("health", "immunizations", {'));
    assert(!home.includes('<SectionContainerCard title="Today"'), "Old compact Today card is removed");
    assert(!nutrition.includes('<SectionContainerCard title="Today"'), "Today card moved out of Nutrition");
    assert(!home.includes('upcoming?.key !== `vax-${nextVax.id}`'), "Soonest vaccine always remains visible");
    const attention = read("components/ui/NeedsAttentionCard.js");
    const notifications = read("components/Notifications.js");
    assert(!home.includes("NeedsAttentionCard") && !home.includes("setAttentionCollapsed"), "Home no longer owns Needs Attention");
    assert(!home.includes('"medical-history"'), "Home no longer fetches attention-only medical history");
    for (const contract of ["<NeedsAttentionCard items={attentionItems}", "collapsed={attentionCollapsed}", "setAttentionCollapsed(false)", 'onOpenItem={item => onNavigate("health", item.tab)}'])
        assert(notifications.includes(contract), "Needs attention Notifications owner contract: " + contract);
    assert(notifications.indexOf("<NeedsAttentionCard") < notifications.indexOf('accessibilityRole="tablist"'), "Attention precedes All/Unread");
    assert(attention.includes('<AnimatedReveal expanded={!collapsed} duration={260}'), "Attention uses the shared interruptible, reduced-motion reveal");
    assert(attention.includes("accessibilityState={{ expanded: !collapsed }}"));
    assert(growthChart.includes('variant="select"'), "Home growth selector uses anchored select behavior");
    assert(!growthChart.includes(" fold"), "Input selects inherit the shared fold instead of opting in per screen");
    assert(!growthChart.includes("minWidth={Math.min(metricMenuAnchor"), "Home growth menu follows trigger width");
    for (const contract of ['animationMode = animation || (select || connected ? "fold" : "scale")', "folding && !contentHeight", "outputRange: [connected ? a.height : 0, connected && !contentHeight ? a.height : foldHeight]", "motion.standard.duration", "useReducedMotion()"]) {
        assert(anchoredMenu.includes(contract), "Anchored menu fold contract: " + contract);
    }
    console.log("Home card checks passed: no Recent Activity card/fetches, card order, attention in Notifications, next vaccine, feeding summary and growth selector.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
