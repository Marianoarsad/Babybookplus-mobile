import RecordCreationContext from "./context/RecordCreationContext";
import NeumorphicTabs from "./components/ui/NeumorphicTabs";
import SelectTrigger from "./components/ui/SelectTrigger";
import OptionSheet from "./components/ui/OptionSheet";
import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Pressable,
    StatusBar,
    TextInput,
    Image,

    Platform,
    Animated,
    Easing,
} from "react-native";
// react-native-safe-area-context, NOT React Native's own SafeAreaView, which
// this file used to use. RN's version is a no-op on Android — it renders a
// plain View — so the header sat under the Android status bar, and it exposes
// no inset VALUES, which meant the tab bar's bottom padding and the floating
// button's `bottom: 92` were both hardcoded guesses that could not account for
// a home indicator or gesture bar.
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { Asset } from "expo-asset";
import { BlurTargetView } from "expo-blur";
import { GlassTargetContext } from "./context/GlassTargetContext";
import { LanguageProvider, useLanguage } from "./context/LanguageContext";
import DatabaseLoadingProvider, { useDatabaseLoading } from "./context/DatabaseLoadingContext";
import Modal from "./components/ui/AppModal";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Archivo_600SemiBold, Archivo_700Bold } from "@expo-google-fonts/archivo";
import {
    PublicSans_400Regular,
    PublicSans_500Medium,
    PublicSans_600SemiBold,
    PublicSans_700Bold,
} from "@expo-google-fonts/public-sans";
import { settingsSelectionStyle,
    radius,
    space,
    shadow,
    type,
    MIN_TOUCH,
    motion,
    HEADER_TITLE_MAX,
    HEADER_TITLE_MIN,
    HEADER_COLLAPSE,
} from "./theme";
import ActionSheet from "./components/ui/ActionSheet";
import GlassFab from "./components/ui/GlassFab";
import GlassHeaderButton, { HEADER_ICON_SOURCES } from "./components/ui/GlassHeaderButton";
import TabBar, { TAB_BAR_BASE_HEIGHT, TAB_ICON_SOURCES } from "./components/ui/TabBar";
import BabyProfilePicker from "./components/ui/BabyProfilePicker";
import Gradient from "./components/ui/Gradient";
import { ScrollContext, useScrollController } from "./context/ScrollContext";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

// Guarded expo-haptics, same pattern as ui/Toast.js — a no-op if the module
// isn't available rather than a crash.
let Haptics = null;
try {
    // eslint-disable-next-line global-require
    Haptics = require("expo-haptics");
} catch (e) {
    Haptics = null;
}

// Guarded expo-font so the app still runs if it isn't available.
let ExpoFont = null;
try {
    // eslint-disable-next-line global-require
    ExpoFont = require("expo-font");
} catch (e) {
    ExpoFont = null;
}
// Keep the native splash (app.json) visible until startup resources,
// preferences, onboarding state, and the saved session are ready. Web uses
// the matching React fallback in components/Splash.js.
let SplashScreen = null;
if (Platform.OS !== "web") {
    try {
        // eslint-disable-next-line global-require
        SplashScreen = require("expo-splash-screen");
        SplashScreen.preventAutoHideAsync().catch(() => {});
    } catch (e) {
        SplashScreen = null;
    }
}
import StartupGuard from "./components/StartupGuard";
import ThemeProvider, { useTheme } from "./context/ThemeContext";
import { storage, removeLegacyOfflineSummaries } from "./utils/storageAdapter";
import { seen, markSeen } from "./utils/firstRun";

// Web only: one consistent muted-gray placeholder across every input, so raw
// TextInputs match the themed `colors.placeholder` used by shared components.
if (Platform.OS === "web" && typeof document !== "undefined") {
    const STYLE_ID = "bb-placeholder-style";
    if (!document.getElementById(STYLE_ID)) {
        const el = document.createElement("style");
        el.id = STYLE_ID;
        el.textContent =
            "input::placeholder,textarea::placeholder{color:#9AA0B4;opacity:1;}";
        document.head.appendChild(el);
    }
}

// Import Screen Components
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";
import { measureConfirmationAnchor } from "./utils/confirmationPosition.cjs";
import Button from "./components/ui/Button";
import ScreenHeader from "./components/ui/ScreenHeader";
import BabyProfileScreen from "./components/BabyProfileScreen";
import recordStore from "./utils/recordStore.cjs";
import Health from "./components/Health";
import Growth from "./components/Growth";
import Services from "./components/Services";
import NutritionTracker from "./components/NutritionTracker";
import ShareRecords from "./components/ShareRecords";
import ProfessionalView from "./components/ProfessionalView";
import consultationLinks from "./utils/consultationLinks.cjs";
import NotificationMenu from "./components/NotificationMenu";
import Notifications from "./components/Notifications";
import useNotificationInbox from "./utils/useNotificationInbox";
import EmptyChild from "./components/EmptyChild";
import Onboarding from "./components/Onboarding";
import ToastProvider, { useToast } from "./components/ui/Toast";
import MutationFeedback from "./components/ui/MutationFeedback";
import { useRecords, useSessionEpoch } from "./utils/useRecords";
import CalendarView from "./components/CalendarView";
import AllActivity from "./components/AllActivity";
import Search from "./components/Search";
import Splash from "./components/Splash";
import { DateField, TimeField, MeasurementField } from "./components/ui/DateField";
import Field from "./components/ui/Field";

import { SettingsCard } from "./components/settings/SettingsControls";
import RecordFormSheet, { RecordFormGroup, RecordFormRow, RecordFormScreen, DeleteConfirmation } from "./components/ui/RecordFormSheet";
import ViewProfile, { PROFILE_TITLES } from "./components/settings/ViewProfile";
import EditProfile from "./components/settings/EditProfile";
import GeneralSettings from "./components/settings/GeneralSettings";
import ThemePreferences from "./components/settings/ThemePreferences";
import LanguagePreferences from "./components/settings/LanguagePreferences";
import HelpSupport from "./components/settings/HelpSupport";
import AboutApp from "./components/settings/AboutApp";
import ChangePassword from "./components/settings/ChangePassword";
import PrivacySettings from "./components/settings/PrivacySettings";
import { api, getToken, setToken, clearToken } from "./utils/api";
import { scheduleReminder, morningOf, cancelRemindersOfKind } from "./utils/notifications";
import { childToProfile, profileFormToChild, stripDoctorPrefix } from "./utils/adapters";
import { todayLocal } from "./utils/dates";
import { pickImage, pickerAvailable } from "./utils/imagePicker";

// Header title shown ("← <title>") whenever currentView is a Profile-hub
// destination or one of the sub-screens below. The Profile hub owns the shared
// destination labels so the header and rows cannot drift apart. The 5 bottom tabs keep
// showing the baby's name, which is also the child switcher.
//
// EVERY sub-screen belongs in this map. Search and Recent Activity used to draw
// their own back headers instead, which worked while the app header sat above
// the page — but the header is position:absolute now (see styles.header), so a
// screen's own bar renders at y=0 UNDERNEATH it and the two titles overlap.
// Baby Profile owns its centered header; other new sub-screens use this map.
const SCREEN_TITLES = {
    viewProfile: "Profile",
    babyProfile: "Baby Profile",
    editBabyProfile: "Edit Baby Profile",
    ...PROFILE_TITLES,
    search: "Search",
    notifications: "Notifications",
    allActivity: "Recent Activity",
};

// The short form of a child's name, for the header title only.
//
// A large title only works with a short string. "Maria Auxiliadora
// Bituin-Villanueva" at 30px leaves room for about eight characters once the
// chevron, the alert dot and three 44pt buttons have taken their share — so the
// LARGE state would truncate harder than the small one, which reads as a bug.
// The switcher menu still lists full names, so nothing is lost.
//
// Same nickname-or-first-name rule the old Dashboard switcher pills used.
export function headerName(profile) {
    if (!profile) return "";
    return profile.nickname || String(profile.name || "").split(" ")[0] || profile.name || "";
}

function MainAppShell({
    onThemeGenderChange,
    themeOverride,
    onThemeOverrideChange,
    schemeOverride,
    onSchemeOverrideChange,
    preferencesReady,
    onStartupState,
}) {
    const { language, t, ready: languageReady } = useLanguage();
    const { setReady: setLoadingReady } = useDatabaseLoading();
    const { colors, scheme } = useTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const insets = useSafeAreaInsets();
    const sessionEpoch = useSessionEpoch();
    // The tab bar is MEASURED rather than assumed. Its height moves with the
    // OS font scale (it contains a text label) and with the bottom inset, so
    // the floating button's old hardcoded `bottom: 92` was only ever correct
    // on one device at one font size.
    const [tabBarHeight, setTabBarHeight] = useState(0);
    const blurTargetRef = useRef(null);
    const pageBlurTargetRef = useRef(null);
    // The header floats OVER the page now, so it reserves no layout space and
    // every scrolling screen has to pad for it. Measured, never hardcoded: it
    // moves with the safe-area inset and grows with the OS font scale.
    const [headerHeight, setHeaderHeight] = useState(0);
    const scroll = useScrollController(headerHeight, tabBarHeight);

    // Preload the icon and text fonts so buttons and copy never render blank.
    const [fontsReady, setFontsReady] = useState(false);
    useEffect(() => {
        let active = true;
        (async () => {
            try {
                if (ExpoFont && ExpoFont.loadAsync) {
                    await ExpoFont.loadAsync({
                        ...Ionicons.font,
                        ...MaterialCommunityIcons.font,
                        Archivo_600SemiBold,
                        Archivo_700Bold,
                        PublicSans_400Regular,
                        PublicSans_500Medium,
                        PublicSans_600SemiBold,
                        PublicSans_700Bold,
                    });
                }
            } catch (e) {
                console.log("font preload:", e.message);
            } finally {
                if (active) setFontsReady(true);
            }
        })();
        return () => {
            active = false;
        };
    }, []);

    // Welcome carousel — shown once, on the very first launch ever, ahead of
    // null = still checking storage (folds into the splash gate below, so
    // nothing flashes before the check resolves).
    const [onboarded, setOnboarded] = useState(null);
    useEffect(() => {
        seen("onboarding").then(setOnboarded);
    }, []);

    // Authentication State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    // The React splash owns its fade on web and when native splash is unavailable.
    const usesReactSplash = Platform.OS === "web" || !SplashScreen;
    const [reactSplashDone, setReactSplashDone] = useState(false);
    const [authScene, setAuthScene] = useState("login");
    const [authIntroVisible, setAuthIntroVisible] = useState(false);
    // Healthcare Professional mode (separate actor, no parent account)
    const [incomingShare, setIncomingShare] = useState(() => consultationLinks.browserConsultation());
    const [professionalMode, setProfessionalMode] = useState(() => !!consultationLinks.browserConsultation());
    useEffect(() => {
        if (Platform.OS !== "web") return undefined;
        const openShare = () => {
            const share = consultationLinks.browserConsultation();
            if (share) { setIncomingShare(share); setProfessionalMode(true); }
            else { setIncomingShare(null); setProfessionalMode(false); }
        };
        window.addEventListener("hashchange", openShare);
        window.addEventListener("popstate", openShare);
        return () => {
            window.removeEventListener("hashchange", openShare);
            window.removeEventListener("popstate", openShare);
        };
    }, []);
    // All three start EMPTY, and that is the point. parentName defaulted to
    // the literal string "Sarah" and parentAvatar to a stock photograph of a
    // stranger, so before the session was restored the app addressed every
    // parent by a name that was not theirs, beside a face that was not theirs.
    // Same family as the invented "Dr. Sarah Chen" removed from the Care Team
    // card. applyUser() fills these from the server; until it does, the header
    // shows nothing rather than showing a fiction, and ui/Avatar.js falls back
    // to the parent's own initials.
    const [parentName, setParentName] = useState("");
    // Who the account holder is to the child ("mother" | "father" |
    // "grandparent" | "guardian" | "other"). Replaced parentGender, which the
    // registration form asked for as Female/Male and nothing ever used except
    // to print it back. See utils/relationship.js.
    const [parentRelationship, setParentRelationship] = useState("");
    const [parentAvatar, setParentAvatar] = useState("");

    // Main navigation view
    const [currentView, setCurrentView] = useState("dashboard");
    // Growth unmounts when another screen is shown, so keep only its applied
    // date view here for the lifetime of the signed-in session. Each child
    // gets an independent view; drafts remain local to Growth.
    const growthDateViewsRef = useRef({});
    const nutritionDateViewsRef = useRef({});
    // Enter-only screen transition (fade + rise) — the outgoing screen is
    // swapped synchronously by React, only the incoming one animates in.
    // Keep the native transform driver off on web, where RNW does not support it.
    const contentOpacity = useRef(new Animated.Value(1)).current;
    const contentTranslateY = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        contentOpacity.setValue(0);
        contentTranslateY.setValue(8);
        Animated.parallel([
            Animated.timing(contentOpacity, {
                toValue: 1,
                duration: motion.standard.duration,
                easing: Easing.bezier(...motion.standard.bezier),
                useNativeDriver: Platform.OS !== "web",
            }),
            Animated.timing(contentTranslateY, {
                toValue: 0,
                duration: motion.standard.duration,
                easing: Easing.bezier(...motion.standard.bezier),
                useNativeDriver: Platform.OS !== "web",
            }),
        ]).start();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentView]);
    // Optional deep-link sub-tab for Health/Growth (set by Dashboard quick actions).
    // navKey bumps on every request so repeated taps re-apply the tab.
    const [navTab, setNavTab] = useState(null);
    const [navPayload, setNavPayload] = useState(null);
    const [navKey, setNavKey] = useState(0);
    // Back-button history for the global header — every navigation that goes
    // through changeView() pushes the screen it left, so goBack() can return
    // to wherever the parent actually came from (View Profile -> Edit Profile
    // -> back lands on View Profile, not Home). Capped so a long tab-hopping
    // session can't grow this unbounded; back only ever needs to pop one level.
    const historyRef = useRef([]);
    const [babyProfileTarget, setBabyProfileTarget] = useState(null);
    const profileFlow = useRef(null);
    const editTarget = useRef(null);
    const activeBabyId = useRef(null);
    const homeOffset = useRef(0);
    const [homeRestore, setHomeRestore] = useState(null);
    useEffect(() => {
        const listener = scroll.scrollY.addListener(({ value }) => {
            if (currentView === "dashboard") homeOffset.current = Math.max(0, value);
        });
        return () => scroll.scrollY.removeListener(listener);
    }, [currentView, scroll.scrollY]);
    const changeView = (view, tab = null, payload = null) => {
        if (currentView === "editBabyProfile" && view !== currentView) {
            editTarget.current = null;
            setFormAvatarUri("");
            setBloodTypeMenuOpen(false);
        }
        if (view === "babyProfile") {
            const id = String(payload?.childId || "");
            if (!id || id !== activeBabyId.current) return;
            setBabyProfileTarget({ id, epoch: sessionEpoch });
            profileFlow.current = { id, epoch: sessionEpoch, offset: currentView === "dashboard" ? homeOffset.current : null };
        } else if (!["babyProfile", "editBabyProfile"].includes(view)) {
            profileFlow.current = null;
            setHomeRestore(null);
        }
        setCurrentView((prevView) => {
            if (view !== prevView) {
                historyRef.current = [...historyRef.current, prevView].slice(-10);
            }
            return view;
        });
        // Always write the deep-link target, INCLUDING when it is null.
        //
        // This used to be `if (tab) { ... }`, which left the previous value in
        // place forever on a plain tab tap. Screens here are rendered
        // conditionally, so Health/Growth/Nutrition UNMOUNT when you navigate
        // away and their `useEffect(..., [navKey])` runs again on the next
        // mount regardless of whether navKey changed. So: use the "+" button
        // to add a vaccine, close it, go to the Dashboard, then tap the Health
        // tab — Health mounted fresh, read the stale "vaccine", and popped the
        // Add Vaccine form on its own. Same for Log Growth, Add Memory and
        // Log Milk on their tabs.
        setNavTab(tab);
        setNavPayload(payload);
        setNavKey((k) => k + 1);
        // The incoming screen mounts at offset 0. Without this the shared value
        // still holds the OUTGOING screen's offset and the header opens stuck
        // collapsed and white — the same stale-across-unmount trap as navTab
        // above, one layer up.
        scroll.resetScroll();
    };
    const openHeaderView = (view) => {
        if (view === currentView) scroll.scrollToTop();
        changeView(view);
    };
    const goBack = () => {
        if (currentView === "editBabyProfile") {
            editTarget.current = null;
            setFormAvatarUri("");
        }
        const prev = historyRef.current[historyRef.current.length - 1];
        historyRef.current = historyRef.current.slice(0, -1);
        if ((prev || "dashboard") === "dashboard" && profileFlow.current) {
            const flow = profileFlow.current;
            if (flow.id === activeBabyId.current && flow.epoch === recordStore.getEpoch()) setHomeRestore(flow);
            profileFlow.current = null;
        }
        setCurrentView(prev || "dashboard");
        // Back navigation bypasses changeView, so it has to clear the deep-link
        // target itself or it leaks the same stale alias.
        setNavTab(null);
        setNavPayload(null);
        setNavKey((k) => k + 1);
        // goBack bypasses changeView, so it clears the scroll offset itself for
        // the same reason it clears navTab itself.
        scroll.resetScroll();
    };

    // Floating "log something" button (bottom-right, above the tab bar) and
    // its action sheet. Reuses changeView the same way the tab bar does — no
    // new navigation method.
    const [actionSheetVisible, setActionSheetVisible] = useState(false);
    const [recordCreation, setRecordCreation] = useState(null);
    const runAction = (view, tab) => {
        setRecordCreation({ view, tab, childId: activeBabyId.current, epoch: sessionEpoch });
        setActionSheetVisible(false);
        changeView(view, tab);
    };
    // The actions themselves now live in ui/ActionSheet.js, alongside the
    // usage counters that order its shortcut row.
    //
    // The "+" only appears on the five bottom-tab screens. It used to render
    // everywhere, which put a "log something" affordance over Privacy
    // Settings, Search and Share Records.
    const FAB_VIEWS = ["dashboard", "health", "growth", "nutrition", "calendar"];
    const showFab = FAB_VIEWS.includes(currentView);
    const pageGradient = currentView === "search" ? colors.searchSurface.background : currentView === "share" ? colors.shareSurface.background
        : currentView === "viewProfile" ? colors.profileSettings.background : colors.pageGradient;

    // Core records lists — children now load from the backend.
    const [profiles, setProfiles] = useState([]);
    const [selectedProfileId, setSelectedProfileId] = useState(null);
    const [bootstrapping, setBootstrapping] = useState(true);
    const [assetsReady, setAssetsReady] = useState(false);
    const startupAssetsStartedRef = useRef(false);

    // These props are retained for prop compatibility but screens now
    // self-load their records from the backend.
    const [immunizations, setImmunizations] = useState([]);
    const [milestones, setMilestones] = useState([]);
    const [appointments, setAppointments] = useState([]);

    // Modal Control States
    const [showAddProfileModal, setShowAddProfileModal] = useState(false);
    const addedProfileId = useRef(null);
    useEffect(() => { if (showAddProfileModal) addedProfileId.current = null; }, [showAddProfileModal]);
    const [bloodTypeMenuOpen, setBloodTypeMenuOpen] = useState(false);
    const [bloodTypeMenuAnchor, setBloodTypeMenuAnchor] = useState(null);
    const bloodTypeTriggerRef = useRef(null);
    const babyFormBlurTarget = useRef(null);
    useEffect(() => { if (currentView !== "editBabyProfile" && !showAddProfileModal) setBloodTypeMenuOpen(false); }, [currentView, showAddProfileModal]);
    const [profileSaving, setProfileSaving] = useState(null);
    // Baby switcher, opened from the child's name in the header. It used to be
    // a row of pills pinned to the top of the Dashboard, which meant it cost a
    // row of vertical space on the busiest screen AND existed on only that one
    // screen — a parent on Health or Calendar had to go home to switch child.
    //
    // The menu hangs off the name rather than sliding up from the bottom, so it
    // needs the name's position in window coordinates. Measured at press time
    // rather than on layout: the name moves as the header collapses, and a
    // stale measurement would drop the menu in the wrong place.
    const [switcherOpen, setSwitcherOpen] = useState(false);
    const [switcherAnchor, setSwitcherAnchor] = useState(null);
    const nameRef = useRef(null);

    const openSwitcher = () => {
        if (nameRef.current && nameRef.current.measureInWindow) {
            nameRef.current.measureInWindow((x, y, width, height) => {
                if ([x, y, width, height].every(Number.isFinite) && width > 0 && height > 0) {
                    setSwitcherAnchor({ x, y, width, height });
                    setSwitcherOpen(true);
                }
            });
            return;
        }
    };
    // Annual data-retention re-consent (Data Privacy Act of 2012).
    const [consentDue, setConsentDue] = useState(false);
    const [withdrawConfirm, setWithdrawConfirm] = useState(false);
    const [consentAction, setConsentAction] = useState(null);

    // Form states for profile adding/editing
    const [formName, setFormName] = useState("");
    const [formDob, setFormDob] = useState("2025-12-16");
    const [formGender, setFormGender] = useState("girl");
    const [formWeight, setFormWeight] = useState("3.2");
    const [formHeight, setFormHeight] = useState("49.0");
    const [formBirthHead, setFormBirthHead] = useState("");
    const [formBloodType, setFormBloodType] = useState("");
    const [formHospital, setFormHospital] = useState("");
    const [formPediatrician, setFormPediatrician] = useState("");
    const [formPediatricianContact, setFormPediatricianContact] = useState("");
    const [formPediatricianClinic, setFormPediatricianClinic] = useState("");
    const [formObgyne, setFormObgyne] = useState("");
    const [formObgyneContact, setFormObgyneContact] = useState("");
    const [formEmergencyFirstName, setFormEmergencyFirstName] = useState("");
    const [formEmergencyLastName, setFormEmergencyLastName] = useState("");
    const [formEmergencyRelationship, setFormEmergencyRelationship] = useState("");
    const [formEmergencyNumber, setFormEmergencyNumber] = useState("");
    const [formNickname, setFormNickname] = useState("");
    const [formPlaceOfBirth, setFormPlaceOfBirth] = useState("");
    const [formTimeOfBirth, setFormTimeOfBirth] = useState("");
    // Profile picture: a picked device photo (uploaded on save) or a pasted URL.
    const [formAvatarUri, setFormAvatarUri] = useState("");

    const activeProfile =
        profiles.find((p) => p.id === selectedProfileId) || profiles[0];
    useEffect(() => {
        if (recordCreation && (recordCreation.view !== currentView || recordCreation.childId !== activeProfile?.id || recordCreation.epoch !== sessionEpoch)) setRecordCreation(null);
    }, [recordCreation, currentView, activeProfile?.id, sessionEpoch]);
    const creationFlow = useMemo(() => recordCreation ? {
        origin: recordCreation,
        finish: () => setRecordCreation(current => current === recordCreation ? null : current),
        back: () => { setRecordCreation(null); setNavTab(null); setNavPayload(null); setActionSheetVisible(true); },
    } : null, [recordCreation]);
    activeBabyId.current = activeProfile?.id;
    const viewedBaby = babyProfileTarget?.epoch === sessionEpoch && babyProfileTarget.id === activeProfile?.id
        ? profiles.find(profile => profile.id === babyProfileTarget.id) : null;
    useEffect(() => {
        const flow = profileFlow.current;
        const target = editTarget.current;
        if ((flow && (flow.id !== activeProfile?.id || flow.epoch !== sessionEpoch))
            || (target && (target.id !== activeProfile?.id || target.epoch !== sessionEpoch))) {
            profileFlow.current = null;
            editTarget.current = null;
            setBabyProfileTarget(null);
            setHomeRestore(null);
            setFormAvatarUri("");
            setBloodTypeMenuOpen(false);
            historyRef.current = [];
            setCurrentView("dashboard");
        }
    }, [activeProfile?.id, sessionEpoch]);
    const sharedGrowth = useRecords(professionalMode ? null : activeProfile?.id, "growth");
    useEffect(() => {
        if (professionalMode || !activeProfile) return;
        const rows = [...sharedGrowth].sort((a, b) => String(b.date_recorded).localeCompare(String(a.date_recorded)) || Number(b.id) - Number(a.id));
        const weight = rows.find((row) => row.weight != null)?.weight;
        const height = rows.find((row) => row.height != null)?.height;
        setProfiles(prev => {
            const profile = prev.find(item => item.id === activeProfile.id);
            if (!profile) return prev;
            const currentWeight = weight != null ? Number(weight) : profile.birthWeight;
            const currentHeight = height != null ? Number(height) : profile.birthHeight;
            if (profile.currentWeight === currentWeight && profile.currentHeight === currentHeight) return prev;
            return prev.map(item => item.id === profile.id ? { ...item, currentWeight, currentHeight } : item);
        });
    }, [professionalMode, activeProfile?.id, sharedGrowth]);
    const selectProfile = (profile) => {
        setSelectedProfileId(profile ? profile.id : null);
        if (onThemeGenderChange) onThemeGenderChange(profile ? profile.gender : undefined);
    };

    // Alert dots for the baby switcher. Without this a parent with two children
    // has to switch back and forth to find out whether the other one has
    // anything overdue, since Needs Attention is per-child.
    //
    // Lifted here from Dashboard.js when the switcher moved into the header:
    // the header is on all five tab screens, so the verdict has to be available
    // whether or not the Dashboard ever mounted. It therefore fetches for EVERY
    // child including the selected one, where the Dashboard's version could
    // lean on its own record bundle for that one.
    //
    // Kept as cheap as the signal allows: nothing at all on a single-child
    // account (there is no switcher to dot), only the two record types that can
    // raise a dot, one fetch per child per session, and a silent failure — a
    // dot that can't load simply doesn't appear rather than showing an error
    // for a child you aren't even looking at. This is a real cost on a slow
    // connection (PRODUCT.md Principle 3), so it stays strictly additive and
    // never blocks the header.
    // ponytail: 2 requests per child. If a parent ever has enough children for
    // that to bite, replace with one /children/alerts endpoint.
    //
    // requestedAlertsRef, not childAlerts, is what gates a fetch. Keying off
    // the map alone re-ran the effect while a child's request was still in
    // flight and fetched that child a second time.
    const [childAlerts, setChildAlerts] = useState({});
    // Avatars whose URL 404s. Uploads are ephemeral on the free Render tier, so
    // a stored URL can outlive its file; without this the switcher rows render
    // an empty grey square instead of the person glyph. Same fallback the
    // Dashboard uses, for the same reason.
    const [brokenAvatars, setBrokenAvatars] = useState(new Set());
    const requestedAlertsRef = useRef(new Set());
    const profileIdKey = profiles.map((p) => p.id).join(",");
    useEffect(() => {
        if (professionalMode || profiles.length < 2) return;
        const unknown = profiles.filter((p) => !requestedAlertsRef.current.has(p.id));
        if (!unknown.length) return;
        for (const p of unknown) requestedAlertsRef.current.add(p.id);
        let active = true;
        const todayStr = todayLocal();
        Promise.all(
            unknown.map(async (p) => {
                try {
                    const [vax, med] = await Promise.all([
                        api.listRecords(p.id, "vaccinations", { background: true }),
                        api.listRecords(p.id, "medical-history", { background: true }),
                    ]);
                    const overdue = (vax || []).some(
                        (v) => v.status !== "completed" && v.due_date && v.due_date < todayStr,
                    );
                    const ongoing = (med || []).some(
                        (m) =>
                            (m.category === "Illness" || m.category === "Hospitalization") &&
                            !m.resolved,
                    );
                    return [p.id, overdue || ongoing];
                } catch {
                    return null;
                }
            }),
        ).then((results) => {
            if (!active) return;
            const next = {};
            for (const r of results) if (r) next[r[0]] = r[1];
            // Only set when something actually resolved, or this re-runs
            // forever on a child whose fetch keeps failing.
            if (Object.keys(next).length) setChildAlerts((prev) => ({ ...prev, ...next }));
        });
        return () => {
            active = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [professionalMode, profileIdKey]);

    // True when some child OTHER than the one on screen needs attention — the
    // whole point of the dot on the header. The active child's own problems are
    // already stated, loudly, by the Needs Attention card.
    const otherChildNeedsAttention = profiles.some(
        (p) => p.id !== (activeProfile && activeProfile.id) && childAlerts[p.id],
    );

    // One scoped inbox controller supplies both the bell and its full screen.
    const toast = useToast();
    const [unseenCount, setUnseenCount] = useState(0);
    const notificationInbox = useNotificationInbox(professionalMode ? null : activeProfile?.id, setUnseenCount);
    useEffect(() => { setUnseenCount(0); }, [activeProfile?.id, sessionEpoch]);

    // Drive the app theme from the selected child's gender (girl/boy).
    useLayoutEffect(() => {
        if (onThemeGenderChange) onThemeGenderChange(activeProfile ? activeProfile.gender : undefined);
    }, [activeProfile ? activeProfile.gender : undefined]);

    // Apply a logged-in user's profile fields to local state.
    const applyUser = (user) => {
        if (!user) return;
        api.seedAccount(user);
        setParentName(user.fullName || user.full_name || "Parent");
        // Assigned unconditionally, not behind an `if`: a field the parent has
        // just CLEARED has to clear here too, and the old guarded form left the
        // previous value on screen after a successful save.
        setParentRelationship(user.relationship || "");
        setParentAvatar(user.avatarUrl || "");
        setConsentDue(!!user.consentReviewDue);
    };

    // Annual re-consent: keep the data for another year.
    const handleKeepData = async () => {
        if (consentAction) return;
        setConsentAction("renew");
        try {
            await api.renewConsent();
        } catch (e) {
            console.log("renew consent:", e.message);
        } finally {
            setConsentAction(null);
        }
        setConsentDue(false);
        setWithdrawConfirm(false);
    };
    // Withdraw consent: permanently delete the account and all data, then log out.
    const handleWithdrawData = async () => {
        if (consentAction) return;
        setConsentAction("delete");
        try {
            await api.deleteAccount();
        } catch (e) {
            console.log("delete account:", e.message);
        } finally {
            setConsentAction(null);
        }
        setConsentDue(false);
        setWithdrawConfirm(false);
        handleLogOut();
    };

    // Arms local notifications for vaccination doses due within the next 6
    // months only. A full EPI schedule is ~13 doses per child; scheduling
    // every dose for every child up front risks silently exceeding iOS's
    // ~64-pending-local-notification cap. Re-run on every app launch (via
    // loadChildren) and after creating a child so the window keeps sliding
    // forward — a stopgap until server-side push exists (see CLAUDE.md 4.5).
    const scheduleUpcomingVaccineReminders = async (childId) => {
        try {
            const rows = await api.listRecords(childId, "reminders", { background: true });
            const cutoff = new Date();
            cutoff.setMonth(cutoff.getMonth() + 6);
            const cutoffStr = cutoff.toISOString().split("T")[0];
            const upcoming = rows.filter(
                (r) =>
                    r.reminder_type === "Vaccination" &&
                    r.status === "Pending" &&
                    r.reminder_date &&
                    r.reminder_date <= cutoffStr,
            );
            // Withdraw the previous set first. This runs on every launch, and
            // scheduleNotificationAsync mints a NEW id each time — so without
            // this line ten launches queued ten identical notifications for
            // the same dose, and the iOS 64-pending cap this function exists to
            // respect was being burned by the function itself.
            await cancelRemindersOfKind("vaccination");
            for (const r of upcoming) {
                const when = morningOf(r.reminder_date);
                if (when) scheduleReminder("Vaccination reminder", `${r.title} due`, when, "vaccination");
            }
        } catch (e) {
            console.log("scheduleUpcomingVaccineReminders:", e.message);
        }
    };

    // Load this user's children from the backend into the app's profile shape.
    const loadChildren = async (opts = {}) => {
        try {
            const rows = await api.listChildren(opts);
            const mapped = rows.map(childToProfile);
            setProfiles(mapped);
            selectProfile(mapped[0] || null);
            mapped.forEach((p) => scheduleUpcomingVaccineReminders(p.id));
        } catch (e) {
            console.log("loadChildren:", e.message);
        }
    };

    // On launch, restore a saved session via the stored JWT.
    useEffect(() => {
        if (professionalMode) { setBootstrapping(false); return undefined; }
        let active = true;
        const controller = new AbortController();
        setBootstrapping(true);
        const startedAt = Date.now();
        const stage = name => { if (typeof __DEV__ !== "undefined" && __DEV__) console.log("Startup operation:", name, Date.now() - startedAt); };
        (async () => {
            try {
                stage("token");
                const token = await getToken();
                stage("token-ready");
                if (!active) return;
                if (token) {
                    stage("account");
                    const { user } = await api.me({ signal: controller.signal });
                    if (!active) return;
                    stage("account-ready");
                    setIsAuthenticated(true);
                    applyUser(user);
                    stage("children");
                    await loadChildren({ signal: controller.signal });
                    stage("children-ready");
                }
            } catch (e) {
                if (active && e.status === 401) await clearToken(); // token invalid/expired
            } finally {
                if (active) setBootstrapping(false);
            }
        })();
        return () => { active = false; controller.abort(); };
    }, [professionalMode]);

    // Preload only images that can appear immediately after startup. First
    // launch also gets the Auth illustrations because both onboarding CTAs lead there.
    useEffect(() => {
        if (onboarded === null || startupAssetsStartedRef.current) return undefined;
        startupAssetsStartedRef.current = true;
        let active = true;
        let completed = false;
        setAssetsReady(false);
        const sources = !onboarded
            ? [
                  require("./assets/onboarding-book-collage.png"),
                  require("./assets/onboarding-qr-hand.png"),
                  require("./assets/onboarding-care-circle.png"),
                  require("./assets/splash-icon.png"),
                  require("./assets/auth-login-hero.png"),
                  require("./assets/auth-register-hero.png"),
                  require("./assets/auth-details-hero.png"),
              ]
            : !isAuthenticated
              ? [
                    require("./assets/splash-icon.png"),
                    require("./assets/auth-login-hero.png"),
                    require("./assets/auth-register-hero.png"),
                    require("./assets/auth-details-hero.png"),
                ]
              : [];
        Asset.loadAsync([...sources, ...TAB_ICON_SOURCES, ...HEADER_ICON_SOURCES])
            .catch((e) => console.log("startup asset preload:", e.message || e))
            .finally(() => {
                completed = true;
                if (active) setAssetsReady(true);
            });
        return () => {
            active = false;
            if (!completed) startupAssetsStartedRef.current = false;
        };
    }, [onboarded, isAuthenticated]);

    // ORDER MATTERS. loadChildren() runs BEFORE setIsAuthenticated(true).
    //
    // Flipping isAuthenticated first triggers a render while profiles is still
    // [], and the render path below falls straight through to the
    // "profiles.length === 0" branch — which is EmptyChild, a full add-a-child
    // form. So every successful login flashed a blank "add your first child"
    // form for the length of one network request before the Dashboard appeared.
    //
    // The launch path (the restored-session effect above) never had this bug
    // because it holds `bootstrapping` true until after loadChildren, and the
    // splash gate covers that window. This path had no such guard.
    const handleLoginSuccess = async (user, token) => {
        try {
            await setToken(token);
        } catch (e) {
            console.log(e);
        }
        applyUser(user);
        await loadChildren();
        setIsAuthenticated(true);
    };

    const handleLogOut = async () => {
        setIsAuthenticated(false);
        setAuthScene("login");
        setProfiles([]);
        selectProfile(null);
        growthDateViewsRef.current = {};
        nutritionDateViewsRef.current = {};
        setCurrentView("dashboard");
        setNavTab(null); // nor let it carry the old session's pending deep link
        setNavPayload(null);
        historyRef.current = []; // don't let a new session's back arrow reach the old one
        try {
            await clearToken();
        } catch (e) {
            console.log(e);
        }
    };

    // Create the first child (from the EmptyChild screen).
    const handleCreateFirstChild = async (form) => {
        const created = await api.createChild(profileFormToChild(form, { includeBirth: true }));
        const prof = childToProfile(created);
        setProfiles((prev) => [...prev, prof]);
        selectProfile(prof);
        scheduleUpcomingVaccineReminders(prof.id);
    };

    const handleAddProfile = async () => {
        if (!formName) {
            toast.error("Please enter baby name");
            return;
        }
        if (profileSaving) return;
        setProfileSaving("add");
        try {
            const body = profileFormToChild(
                    {
                        name: formName,
                        nickname: formNickname,
                        dateOfBirth: formDob,
                        timeOfBirth: formTimeOfBirth,
                        placeOfBirth: formPlaceOfBirth,
                        gender: formGender,
                        weight: formWeight,
                        height: formHeight,
                        birthHeadCircumference: formBirthHead,
                        bloodType: formBloodType,
                        hospital: formHospital,
                        pediatrician: formPediatrician,
                        obgyne: formObgyne,
                        emergencyContactDetails: {
                            firstName: formEmergencyFirstName,
                            lastName: formEmergencyLastName,
                            relationship: formEmergencyRelationship,
                            contactNumber: formEmergencyNumber,
                        },
                    },
                    { includeBirth: true },
                );
            const created = addedProfileId.current
                ? await api.updateChild(addedProfileId.current, body)
                : await api.createChild(body);
            addedProfileId.current = created.id;
            let prof = childToProfile(created);
            if (formAvatarUri) {
                try {
                    const withAvatar = await api.uploadChildAvatar(created.id, formAvatarUri);
                    prof = childToProfile(withAvatar);
                } catch (e) {
                    throw new Error(`Baby profile saved, but its photo could not be saved: ${e.message}. Retry to finish without creating another profile.`);
                }
            }
            setProfiles((prev) => [...prev.filter((p) => p.id !== prof.id), prof]);
            selectProfile(prof);
            scheduleUpcomingVaccineReminders(prof.id);
            setShowAddProfileModal(false);
            setFormName("");
            setFormNickname("");
            setFormPlaceOfBirth("");
            setFormTimeOfBirth("");
            setFormBloodType("");
            setFormHospital("");
            setFormPediatrician("");
            setFormObgyne("");
            setFormEmergencyFirstName("");
            setFormEmergencyLastName("");
            setFormEmergencyRelationship("");
            setFormEmergencyNumber("");
            setFormAvatarUri("");
        } catch (e) {
            toast.error(e.message || "Could not add child");
        } finally {
            setProfileSaving(null);
        }
    };

    const handleEditProfile = async () => {
        const target = editTarget.current;
        const isCurrent = () => editTarget.current === target && target?.id === activeBabyId.current && target?.epoch === recordStore.getEpoch();
        if (!isCurrent()) return;
        if (!formName) {
            toast.error("Please enter baby name");
            return;
        }
        if (profileSaving) return;
        setProfileSaving("edit");
        try {
            const updated = await api.updateChild(
                target.id,
                profileFormToChild(
                    {
                        name: formName,
                        nickname: formNickname,
                        dateOfBirth: formDob,
                        timeOfBirth: formTimeOfBirth,
                        placeOfBirth: formPlaceOfBirth,
                        gender: formGender,
                        bloodType: formBloodType,
                        hospital: formHospital,
                        pediatrician: formPediatrician,
                        pediatricianContactNumber: formPediatricianContact,
                        birthHeadCircumference: formBirthHead,
                        pediatricianClinicHospital: formPediatricianClinic,
                        obgyne: formObgyne,
                        obgynContactNumber: formObgyneContact,
                        emergencyContactDetails: {
                            firstName: formEmergencyFirstName,
                            lastName: formEmergencyLastName,
                            relationship: formEmergencyRelationship,
                            contactNumber: formEmergencyNumber,
                        },
                    },
                    { includeBirth: false },
                ),
            );
            if (!isCurrent()) return;
            let prof = childToProfile(updated);
            setProfiles(prev => prev.map(p => p.id === prof.id ? { ...prof, currentWeight: p.currentWeight, currentHeight: p.currentHeight } : p));
            if (formAvatarUri) {
                try {
                    const withAvatar = await api.uploadChildAvatar(target.id, formAvatarUri);
                    if (!isCurrent()) return;
                    prof = childToProfile(withAvatar);
                } catch (e) {
                    throw new Error(`Profile saved, but its photo could not be saved: ${e.message}. Retry to finish.`);
                }
            }
            if (!isCurrent()) return;
            setProfiles((prev) => prev.map((p) => (p.id === prof.id ? { ...prof, currentWeight: p.currentWeight, currentHeight: p.currentHeight } : p)));
            setFormAvatarUri("");
            goBack();
        } catch (e) {
            if (isCurrent()) toast.error(e.message || "Could not update child");
        } finally {
            setProfileSaving(null);
        }
    };

    const [deleteProfileTarget, setDeleteProfileTarget] = useState(null);
    const deleteProfileLock = useRef(false);
    const deleteProfileButton = useRef(null);
    const handleDeleteBaby = async () => {
        const target = deleteProfileTarget;
        if (!target || deleteProfileLock.current || profileSaving || target.id !== activeBabyId.current || target.epoch !== recordStore.getEpoch()) return;
        deleteProfileLock.current = true; setProfileSaving("delete");
        try {
            await api.deleteChild(target.id);
            if (target.epoch !== recordStore.getEpoch()) return;
            recordStore.forgetChild(target.id);
            setProfiles(prev => prev.filter(p => p.id !== target.id));
            if (activeBabyId.current !== target.id) return;
            setSelectedProfileId(null);
            editTarget.current = null; profileFlow.current = null; historyRef.current = [];
            setBabyProfileTarget(null); setHomeRestore(null); setFormAvatarUri(""); setBloodTypeMenuOpen(false);
            setDeleteProfileTarget(null); setCurrentView("dashboard"); scroll.resetScroll();
            toast.success("Baby profile deleted");
        } catch (error) { throw new Error(error.message || "Could not delete the profile. Please try again."); }
        finally { deleteProfileLock.current = false; setProfileSaving(null); }
    };
    useEffect(() => { setDeleteProfileTarget(null); }, [activeProfile?.id, sessionEpoch, currentView]);

    const openEditModal = () => {
        if (!activeProfile || profileSaving) return;
        const target = { id: activeProfile.id, epoch: sessionEpoch };
        editTarget.current = target;
        if (currentView === "dashboard") profileFlow.current = { ...target, offset: homeOffset.current };

        const emergency = activeProfile.emergencyContactDetails || {};
        setFormBirthHead(activeProfile.birthHeadCircumference != null ? String(activeProfile.birthHeadCircumference) : "");
        setFormName(activeProfile.name);
        setFormDob(activeProfile.dateOfBirth);
        setFormGender(activeProfile.gender);
        setFormBloodType(activeProfile.bloodType || "");
        setFormHospital(activeProfile.hospital || "");
        setFormPediatrician(stripDoctorPrefix(activeProfile.pediatricianName));
        setFormPediatricianContact(activeProfile.pediatricianContactNumber || "");
        setFormPediatricianClinic(activeProfile.pediatricianClinicHospital || "");
        setFormObgyne(stripDoctorPrefix(activeProfile.obgynName));
        setFormObgyneContact(activeProfile.obgynContactNumber || "");
        setFormEmergencyFirstName(emergency.firstName || "");
        setFormEmergencyLastName(emergency.lastName || "");
        setFormEmergencyRelationship(emergency.relationship || "");
        setFormEmergencyNumber(emergency.contactNumber || "");
        setFormNickname(activeProfile.nickname || "");
        setFormPlaceOfBirth(activeProfile.placeOfBirth || "");
        setFormTimeOfBirth(activeProfile.timeOfBirth || "");
        setFormAvatarUri("");
        changeView("editBabyProfile");
    };

    const openBloodTypeMenu = () => {
        if (bloodTypeTriggerRef.current?.measureInWindow) {
            bloodTypeTriggerRef.current.measureInWindow((x, y, width, height) => {
                setBloodTypeMenuAnchor({ x, y, width, height });
                setBloodTypeMenuOpen(true);
            });
            return;
        }
        setBloodTypeMenuAnchor(null);
        setBloodTypeMenuOpen(true);
    };

    // Open the add-baby modal with a clean avatar picker + fields.
    const openAddModal = () => {
        setFormBirthHead("");
        setFormNickname("");
        setFormPlaceOfBirth("");
        setFormTimeOfBirth("");
        setFormAvatarUri("");
        setShowAddProfileModal(true);
    };

    // Reusable avatar picker used in both the add and edit baby modals.
    // `currentUrl` is the baby's existing photo (edit) shown until a new one is chosen.
    const renderAvatarPicker = (currentUrl) => {
        const preview = formAvatarUri || currentUrl || "";
        return (
            <View style={styles.avatarPickerWrap}>
                <TouchableOpacity
                    activeOpacity={pickerAvailable() ? 0.85 : 1}
                    onPress={async () => {
                        if (!pickerAvailable()) return;
                        const target = editTarget.current;
                        const epoch = recordStore.getEpoch();
                        const uri = await pickImage();
                        if (uri && recordStore.getEpoch() === epoch && editTarget.current === target) setFormAvatarUri(uri);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Choose baby photo"
                >
                    {preview ? (
                        <Image source={{ uri: preview }} style={styles.avatarPreview} />
                    ) : (
                        <View style={[styles.avatarPreview, styles.avatarPreviewEmpty]}>
                            <Ionicons name="person" size={38} color={colors.textMuted} />
                        </View>
                    )}
                    <View style={styles.avatarBadge}>
                        <Ionicons name="camera" size={15} color={colors.onAccent} />
                    </View>
                </TouchableOpacity>
                {pickerAvailable() ? (
                    <Text style={styles.avatarHint}>
                        {formAvatarUri ? "Photo selected — tap to change" : "Tap to choose a photo"}
                    </Text>
                ) : null}
            </View>
        );
    };

    useEffect(() => {
        onStartupState({ fonts: fontsReady, assets: assetsReady, preferences: preferencesReady,
            language: languageReady, session: !bootstrapping, onboarding: onboarded !== null });
    }, [fontsReady, assetsReady, preferencesReady, languageReady, bootstrapping, onboarded, onStartupState]);

    // Show the branded loading screen until icon fonts are ready, the saved
    // session has been restored, and the one-time onboarding check resolves —
    // so no screen ever renders with blank icons or a flash of the carousel.
    // React splash also waits for the logo's visible interval; native keeps
    // the OS splash until readiness without adding a second splash hold.
    const ready =
        fontsReady &&
        assetsReady &&
        preferencesReady &&
        languageReady &&
        !bootstrapping &&
        onboarded !== null;
    useEffect(() => {
        setLoadingReady(ready && (!usesReactSplash || reactSplashDone));
    }, [ready, usesReactSplash, reactSplashDone, setLoadingReady]);
    useEffect(() => {
        if (ready && Platform.OS !== "web" && SplashScreen) {
            SplashScreen.hideAsync().catch(() => {});
        }
    }, [ready]);

    if (!ready) {
        return usesReactSplash ? <Splash /> : null;
    }
    if (usesReactSplash && !reactSplashDone) {
        return <Splash appReady onFinished={() => setReactSplashDone(true)} />;
    }

    if (professionalMode) {
        return <ProfessionalView initialShare={incomingShare} onExit={() => {
            consultationLinks.clearBrowserConsultation(); setIncomingShare(null); setProfessionalMode(false);
        }} />;
    }

    if (!isAuthenticated) {
        // Welcome carousel — first launch ever. Both its CTAs mark the flag so
        // it never reappears, whichever one is used; logging out later does NOT
        // reset this (see handleLogOut).
        if (!onboarded || authIntroVisible) {
            return (
                <Onboarding
                    initialIndex={authIntroVisible ? 2 : 0}
                    onGetStarted={() => {
                        markSeen("onboarding");
                        setOnboarded(true);
                        setAuthScene("register");
                        setAuthIntroVisible(false);
                    }}
                    onLogin={() => {
                        markSeen("onboarding");
                        setOnboarded(true);
                        setAuthScene("login");
                        setAuthIntroVisible(false);
                    }}
                />
            );
        }
        // Revisit the finale without resetting the persisted first-launch completion flag.
        return (
            <Auth
                onLoginSuccess={handleLoginSuccess}
                onProfessional={() => setProfessionalMode(true)}
                onBack={() => setAuthIntroVisible(true)}
                initialScene={authScene}
            />
        );
    }

    // Authenticated but no children yet -> first-child setup.
    if (profiles.length === 0) {
        return (
            <EmptyChild
                parentName={parentName}
                onCreate={handleCreateFirstChild}
                onLogOut={handleLogOut}
            />
        );
    }

    return (
        // The page background is a gradient, not a flat fill, and its stops
        // come from the active palette; Search opts into its white-blue canvas.
        // Other screens switch with the child the same
        // way every accent already does. The final stop IS colors.background,
        // because every status and record-type colour in theme.js was
        // contrast-verified against that flat value. See theme.js pageGradient.
        //
        // The middle stop is at 0.5, not 0.3. This app puts a card about 14%
        // down every screen, so a fade that finished at 30% was almost entirely
        // hidden behind it — the only tinted area left was two 16px strips
        // beside the header, which is why the gradient read as "barely there".
        // Carrying colour to mid-page keeps it in the side margins and the gaps
        // between cards, which is where a page background is actually seen.
        <RecordCreationContext.Provider value={creationFlow}><GlassTargetContext.Provider value={blurTargetRef}><ScrollContext.Provider value={scroll}>
        <Gradient
            colors={pageGradient}
            locations={[0, 0.5, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[
                styles.container,
                // NO paddingTop here any more: the header is absolutely
                // positioned over the page, so it carries the top inset itself.
                // The bottom inset belongs to the tab bar, which must paint its
                // own background all the way down behind the home indicator
                // rather than leaving a bare strip.
                { paddingLeft: insets.left, paddingRight: insets.right },
            ]}
        >
            <StatusBar barStyle={scheme === "dark" ? "light-content" : "dark-content"} />
            <BlurTargetView ref={blurTargetRef} style={styles.blurTarget}>
            {/* Keep the checklist outside its own background capture. */}
            <BlurTargetView ref={pageBlurTargetRef} pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Gradient pointerEvents="none" colors={pageGradient} locations={[0, 0.5, 1]}
                start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
            </BlurTargetView>
            <MutationFeedback profiles={profiles} top={headerHeight + space.xs} />

            {/* Main Container View content */}
            <Animated.View
                style={[
                    styles.content,
                    { opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] },
                ]}
            >
                {currentView === "dashboard" && (
                    <Dashboard
                        backgroundBlurTarget={pageBlurTargetRef}
                        key={`${sessionEpoch}:${activeProfile.id}`}
                        profile={activeProfile}
                        initialScrollOffset={homeRestore?.id === activeProfile.id && homeRestore.epoch === sessionEpoch ? homeRestore.offset : null}
                        onScrollRestored={() => setHomeRestore(null)}
                        parentName={parentName}
                        onUpdateProfile={(updated) =>
                            setProfiles((prev) =>
                                prev.map((p) =>
                                    p.id === updated.id ? { ...p, ...updated } : p,
                                ),
                            )
                        }
                        onChangeView={changeView}
                    />
                )}
                {currentView === "babyProfile" && <BabyProfileScreen key={`${sessionEpoch}:${babyProfileTarget?.id}`}
                    profile={viewedBaby} />}
                {currentView === "health" && (
                    <Health
                        profile={activeProfile}
                        onUpdateProfile={(updated) =>
                            setProfiles((prev) =>
                                prev.map((p) =>
                                    p.id === updated.id ? { ...p, ...updated } : p,
                                ),
                            )
                        }
                        immunizations={immunizations}
                        setImmunizations={setImmunizations}
                        initialTab={navTab}
                        initialRecord={navPayload}
                        navKey={navKey}
                    />
                )}
                {currentView === "growth" && (
                    <Growth
                        blurTarget={blurTargetRef}
                        profile={activeProfile}
                        savedDateView={growthDateViewsRef.current[activeProfile.id] || null}
                        onDateViewChange={(view) => {
                            growthDateViewsRef.current[activeProfile.id] = view;
                        }}
                        onUpdateProfile={(updated) =>
                            setProfiles((prev) =>
                                prev.map((p) =>
                                    p.id === updated.id ? { ...p, ...updated } : p,
                                ),
                            )
                        }
                        milestones={milestones}
                        setMilestones={setMilestones}
                        initialTab={navTab}
                        navKey={navKey}
                    />
                )}
                {currentView === "nutrition" && (
                    <NutritionTracker
                        blurTarget={blurTargetRef}
                        profile={activeProfile}
                        savedDateView={nutritionDateViewsRef.current[activeProfile.id] || null}
                        onDateViewChange={(view) => {
                            nutritionDateViewsRef.current[activeProfile.id] = view;
                        }}
                        initialAction={navTab}
                        initialRecord={navPayload}
                        navKey={navKey}
                    />
                )}
                {currentView === "services" && <Services />}
                {currentView === "calendar" && <CalendarView profile={activeProfile} onNavigate={changeView} />}
                {currentView === "allActivity" && <AllActivity profile={activeProfile} />}
                {currentView === "notifications" && (
                    <Notifications key={`${sessionEpoch}:${activeProfile.id}`} profile={activeProfile} inbox={notificationInbox} onNavigate={changeView} />
                )}
                {currentView === "search" && (
                    <Search key={`${sessionEpoch}:${activeProfile.id}`} profile={activeProfile} onNavigate={changeView} />
                )}
                {currentView === "share" && (
                    <ShareRecords
                        key={`${sessionEpoch}:${activeProfile.id}`}
                        profile={activeProfile}
                        immunizations={immunizations}
                        milestones={milestones}
                        appointments={appointments}
                        initialSection={navPayload?.section}
                        initialAccessEntry={navPayload?.accessEntry}
                        onClose={goBack}
                    />
                )}
                {currentView === "viewProfile" && (
                    <ViewProfile
                        key={sessionEpoch}
                        parentName={parentName}
                        parentAvatar={parentAvatar}
                        parentRelationship={parentRelationship}
                        schemeOverride={schemeOverride}
                        onNavigate={changeView}
                        onLogout={handleLogOut}
                    />
                )}
                {currentView === "editProfile" && (
                    <EditProfile
                        parentName={parentName}
                        onUpdateParentName={setParentName}
                        parentAvatar={parentAvatar}
                        parentRelationship={parentRelationship}
                        onUpdateParentRelationship={setParentRelationship}
                    />
                )}
                {currentView === "generalSettings" && <GeneralSettings />}
                {currentView === "themePreferences" && (
                    <ThemePreferences
                        themeOverride={themeOverride}
                        onThemeOverrideChange={onThemeOverrideChange}
                        childGender={activeProfile ? activeProfile.gender : undefined}
                        schemeOverride={schemeOverride}
                        onSchemeOverrideChange={onSchemeOverrideChange}
                    />
                )}
                {currentView === "languagePreferences" && <LanguagePreferences />}
                {currentView === "helpSupport" && <HelpSupport />}
                {currentView === "aboutApp" && <AboutApp />}
                {currentView === "changePassword" && <ChangePassword />}
                {currentView === "privacySettings" && (
                    <PrivacySettings onAccountDeleted={handleLogOut} />
                )}

                {/* Screen: EDIT BABY PROFILE */}
                {currentView === "editBabyProfile" ? <RecordFormScreen
                    onSubmit={handleEditProfile} busy={!!profileSaving} submitLabel="Save Changes"
                    footer={<Button buttonRef={deleteProfileButton} title="Delete Profile" variant="danger" disabled={!!profileSaving}
                        style={{ marginTop: space.md }} onPress={event => measureConfirmationAnchor(deleteProfileButton, event, anchor => setDeleteProfileTarget({ ...editTarget.current, name: activeProfile.name, anchor }))} />}>
                    <SettingsCard headerStyle={{ display: "none" }} style={{ marginBottom: space.lg }}>
                        <View style={{ gap: space.sm }}>

                                {renderAvatarPicker(activeProfile.hasRecordedAvatar === false ? "" : activeProfile.avatarUrl)}

                                <Field appearance="settings" borderRadius={radius.pill} label={t("profileNameLabel")} value={formName}
                                    onChangeText={setFormName} />

                                <Field appearance="settings" borderRadius={radius.pill} label="Nickname" placeholder="e.g. Baby E"
                                    placeholderTextColor={colors.placeholder}
                                    value={formNickname}
                                    onChangeText={setFormNickname} />

                                <DateField appearance="settings"
                                    label={t("profileDobLabel")}
                                    value={formDob}
                                    onChange={setFormDob}
                                    maximumDate={todayLocal()}
                                />

                                <Text style={styles.modalLabel}>
                                    {t("profileGenderLabel")}
                                </Text>
                                <NeumorphicTabs selectionRole="radio" tabs={[{ key: "girl", label: t("female") }, { key: "boy", label: t("male") }]}
                                    value={formGender} onChange={setFormGender} style={{ marginBottom: space.md }} />

                                <SelectTrigger ref={bloodTypeTriggerRef} label="Blood Type" value={formBloodType}
                                    placeholder="Select blood type" visible={bloodTypeMenuOpen} onAnchorChange={setBloodTypeMenuAnchor}
                                    onPress={openBloodTypeMenu} />
                                <MeasurementField appearance="settings" label="Birth Head Circumference (optional)" unit="cm" min={20} max={65}
                                    value={formBirthHead} onChange={setFormBirthHead} />
                                <Field appearance="settings" borderRadius={radius.pill} label="Birth Hospital" value={formHospital}
                                    onChangeText={setFormHospital} />
                                <Field appearance="settings" borderRadius={radius.pill} label="Pediatrician" prefix="Dr." placeholder="Doctor's name"
                                    value={formPediatrician}
                                    onChangeText={(value) => setFormPediatrician(stripDoctorPrefix(value))}
                                    autoCapitalize="words" />
                                <Field appearance="settings" borderRadius={radius.pill} label="Pediatrician Contact Number" placeholder="Contact number"
                                    value={formPediatricianContact} onChangeText={setFormPediatricianContact}
                                    numericMode="digits" keyboardType="phone-pad" textContentType="telephoneNumber" />
                                <Field appearance="settings" borderRadius={radius.pill} label="Pediatrician Clinic/Hospital" placeholder="Clinic or hospital name"
                                    value={formPediatricianClinic} onChangeText={setFormPediatricianClinic}
                                    autoCapitalize="words" />
                                <Field appearance="settings" borderRadius={radius.pill} label="OB-GYNE" prefix="Dr." placeholder="Doctor's name"
                                    value={formObgyne}
                                    onChangeText={(value) => setFormObgyne(stripDoctorPrefix(value))}
                                    autoCapitalize="words" />
                                <Field appearance="settings" borderRadius={radius.pill} label="OB-GYNE Contact Number" placeholder="Contact number"
                                    value={formObgyneContact} onChangeText={setFormObgyneContact}
                                    numericMode="digits" keyboardType="phone-pad" textContentType="telephoneNumber" />
                                <Field appearance="settings" borderRadius={radius.pill} label="Emergency Contact First Name" placeholder="First name"
                                    value={formEmergencyFirstName} onChangeText={setFormEmergencyFirstName}
                                    autoCapitalize="words" />
                                <Field appearance="settings" borderRadius={radius.pill} label="Emergency Contact Last Name" placeholder="Last name"
                                    value={formEmergencyLastName} onChangeText={setFormEmergencyLastName}
                                    autoCapitalize="words" />
                                <Field appearance="settings" borderRadius={radius.pill} label="Emergency Contact Relationship" placeholder="e.g. Mother"
                                    value={formEmergencyRelationship} onChangeText={setFormEmergencyRelationship}
                                    autoCapitalize="words" />
                                <Field appearance="settings" borderRadius={radius.pill} label="Emergency Contact Number" placeholder="Contact number"
                                    value={formEmergencyNumber} onChangeText={setFormEmergencyNumber}
                                    numericMode="digits" keyboardType="phone-pad" textContentType="telephoneNumber" />

                                <Field appearance="settings" borderRadius={radius.pill} label="Place of Birth" value={formPlaceOfBirth}
                                    onChangeText={setFormPlaceOfBirth} />
                                <TimeField appearance="settings"
                                    label="Time of Birth (Optional)"
                                    value={formTimeOfBirth}
                                    onChange={setFormTimeOfBirth}
                                />

                        </View>
                    </SettingsCard>
                </RecordFormScreen> : null}
            </Animated.View>
            {/* Capture the scroll-fading ground, but never the foreground controls. */}
            {<Animated.View
                pointerEvents="none"
                style={[
                    styles.headerBg,
                    { height: headerHeight, bottom: undefined },
                    {
                        opacity: scroll.scrollY.interpolate({
                            inputRange: [0, HEADER_COLLAPSE],
                            outputRange: [0, 1],
                            extrapolate: "clamp",
                        }),
                    },
                ]}
            />}
            </BlurTargetView>

            {/* Dynamic Header — rendered AFTER the content below so it paints
                on top of it. It floats over the page rather than sitting above
                it, which is what lets content scroll beneath the bar and makes
                its white background mean something. */}
            {<Animated.View
                pointerEvents="box-none"
                style={[styles.header, { left: insets.left, right: insets.right, paddingTop: insets.top }]}
                onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
            >
                {SCREEN_TITLES[currentView] ? <ScreenHeader inset={false} title={SCREEN_TITLES[currentView]} onBack={goBack}
                    disabled={!!profileSaving} actions={currentView === "babyProfile" && viewedBaby ?
                        <GlassHeaderButton icon="edit" blurTarget={blurTargetRef} onPress={() => openEditModal()}
                            disabled={!!profileSaving} accessibilityLabel="Edit baby profile" /> : null} /> : <>
                <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                    {SCREEN_TITLES[currentView] ? (
                        <>
                            <TouchableOpacity
                                onPress={goBack}
                                style={styles.backBtn}
                                accessibilityRole="button"
                                accessibilityLabel="Back"
                            >
                                <Ionicons name="arrow-back" size={22} color={colors.text} />
                            </TouchableOpacity>
                            <Text style={styles.screenTitle} numberOfLines={1}>
                                {SCREEN_TITLES[currentView]}
                            </Text>
                        </>
                    ) : (
                        // The child's name IS the switcher. The chevron shows
                        // even with a single child, because the sheet also
                        // holds "Add another child" — the affordance that used
                        // to sit under the Dashboard's switcher row.
                        <Pressable
                            ref={nameRef}
                            onPress={openSwitcher}
                            style={({ pressed, hovered }) => [
                                styles.babyNameBtn,
                                { opacity: hovered ? 0.8 : pressed ? 0.7 : 1 },
                            ]}
                            accessibilityRole="button"
                            accessibilityState={{ expanded: switcherOpen }}
                            {...(Platform.OS === "web" ? { "aria-expanded": switcherOpen, "aria-haspopup": "dialog" } : {})}
                            accessibilityLabel={`${activeProfile.name}${
                                otherChildNeedsAttention
                                    ? ". Another child needs attention"
                                    : ""
                            }`}
                            accessibilityHint="Switches between your children"
                        >
                            {/* The name, alert dot and chevron scale as ONE
                                group, so the chevron shrinks with the title
                                instead of stranding a gap beside it.

                                The Pressable stays OUTSIDE this view, so the
                                touch target keeps its full 44pt at every scroll
                                position — scaling the tappable area down to
                                0.667 would leave a ~29pt target when collapsed.

                                Scale, not fontSize: animating fontSize re-lays
                                out the text every scroll frame and forces the
                                whole animation off the native driver.
                                transformOrigin keeps it pinned left (RN 0.74+;
                                this project is on 0.85). */}
                            <Animated.View
                                style={[
                                    styles.babyNameScale,
                                    {
                                        transform: [
                                            {
                                                scale: scroll.scrollY.interpolate({
                                                    inputRange: [0, HEADER_COLLAPSE],
                                                    outputRange: [1, HEADER_TITLE_MIN / HEADER_TITLE_MAX],
                                                    extrapolate: "clamp",
                                                }),
                                            },
                                        ],
                                    },
                                ]}
                            >
                                {/* numberOfLines is load-bearing: headerLeft
                                    and headerRight were both unbounded in a
                                    space-between row, so a long child name grew
                                    the left side until it pushed the search /
                                    QR / menu buttons off-screen. More so at
                                    30px. The name shown here is the SHORT form
                                    — see headerName() — because a full Filipino
                                    name at this size truncates to about eight
                                    characters, and the large state would then
                                    truncate harder than the small one. */}
                                <Text style={styles.babyName} numberOfLines={1} ellipsizeMode="tail">
                                    {headerName(activeProfile)}
                                </Text>
                                {/* Coral dot = some OTHER child needs attention.
                                    The active child's own problems are already
                                    stated by the Needs Attention card. */}
                                {otherChildNeedsAttention ? (
                                    <View style={styles.babyNameDot} />
                                ) : null}
                                <Ionicons
                                    name={switcherOpen ? "chevron-up" : "chevron-down"}
                                    size={20}
                                    color={colors.textMuted}
                                    style={styles.babyNameChevron}
                                />
                            </Animated.View>
                        </Pressable>
                    )}
                </View>
                <View style={styles.headerRight}>
                    {activeProfile ? <NotificationMenu count={notificationInbox.unreadCount} blurTarget={blurTargetRef}
                        onOpen={() => { openHeaderView("notifications"); notificationInbox.refresh(); }} /> : null}
                    <GlassHeaderButton icon="search" blurTarget={blurTargetRef}
                        onPress={() => openHeaderView("search")}
                        accessibilityLabel="Search records" />
                    <GlassHeaderButton icon="qr" blurTarget={blurTargetRef} badgeCount={unseenCount}
                        onPress={() => {
                            setUnseenCount(0);
                            openHeaderView("share");
                        }}
                        accessibilityLabel="Share records by QR code" />
                    <GlassHeaderButton icon="profile" blurTarget={blurTargetRef}
                        onPress={() => openHeaderView("viewProfile")}
                        selected={currentView === "viewProfile"}
                        accessibilityLabel="Open profile and settings" />
                </View>
                </View>
                </>}

            </Animated.View>}

            {currentView !== "babyProfile" && <TabBar activeView={currentView}
                blurTarget={blurTargetRef}
                onLayout={(event) => setTabBarHeight(event.nativeEvent.layout.height)}
                onSelect={(view) => {
                    if (Haptics?.selectionAsync) Haptics.selectionAsync().catch(() => {});
                    changeView(view);
                }}
            />}

            {/* Floating add button, above the tab bar on the five record
                screens. See FAB_VIEWS above for why it is no longer global. */}
            {showFab ? (
                <GlassFab onPress={() => setActionSheetVisible(true)} blurTarget={blurTargetRef}
                    appearance="azureGlass"
                    style={[styles.fab, {
                        bottom: (tabBarHeight || TAB_BAR_BASE_HEIGHT + insets.bottom) + space.md,
                    }]} />
            ) : null}

            <ActionSheet
                visible={actionSheetVisible}
                onClose={() => setActionSheetVisible(false)}
                onSelect={runAction}
            />

            {/* Modal: ADD BABY PROFILE */}
            <RecordFormSheet blurTargetRef={babyFormBlurTarget} visible={showAddProfileModal} title={t("profileAddTitle")}
                onClose={() => setShowAddProfileModal(false)} onSubmit={handleAddProfile} busy={profileSaving === "add"}
                cancelLabel={t("cancel")} submitLabel={t("save")}>
                <RecordFormGroup>

                            {renderAvatarPicker()}

                            <RecordFormRow label={<Text style={styles.modalLabel}>
                                {t("profileNameLabel")}
                            </Text>}>

                            <TextInput
                                style={[styles.modalInput, { backgroundColor: "transparent", borderWidth: 0 }]}
                                placeholder="Baby Full Name"
                                placeholderTextColor={colors.placeholder}
                                value={formName}
                                onChangeText={setFormName}
                            />
                            </RecordFormRow>

                            <RecordFormRow label={<Text style={styles.modalLabel}>Nickname</Text>}>

                            <TextInput
                                style={[styles.modalInput, { backgroundColor: "transparent", borderWidth: 0 }]}
                                placeholder="e.g. Baby E"
                                placeholderTextColor={colors.placeholder}
                                value={formNickname}
                                onChangeText={setFormNickname}
                            />
                            </RecordFormRow>

                            <DateField
                                label={t("profileDobLabel")}
                                value={formDob}
                                onChange={setFormDob}
                                maximumDate={todayLocal()}
                            />

                            <Text style={styles.modalLabel}>
                                {t("profileGenderLabel")}
                            </Text>
                            <NeumorphicTabs selectionRole="radio" tabs={[{ key: "girl", label: t("female") }, { key: "boy", label: t("male") }]}
                                value={formGender} onChange={setFormGender} style={{ marginBottom: space.lg }} />

                            <MeasurementField label="Birth Weight" unit="kg" min={0.3} max={40}
                                value={formWeight} onChange={setFormWeight} />
                            <MeasurementField label="Birth Height" unit="cm" min={20} max={140}
                                value={formHeight} onChange={setFormHeight} />
                            <MeasurementField label="Birth Head Circumference (optional)" unit="cm" min={20} max={65}
                                value={formBirthHead} onChange={setFormBirthHead} />

                            <SelectTrigger ref={bloodTypeTriggerRef} label="Blood Type" value={formBloodType}
                                placeholder="Select blood type" visible={bloodTypeMenuOpen} onAnchorChange={setBloodTypeMenuAnchor}
                                onPress={openBloodTypeMenu} />
                            <RecordFormRow label={<Text style={styles.modalLabel}>Birth Hospital</Text>}>

                            <TextInput
                                style={[styles.modalInput, { backgroundColor: "transparent", borderWidth: 0 }]}
                                value={formHospital}
                                onChangeText={setFormHospital}
                            />
                            </RecordFormRow>
                            <Field label="Pediatrician" prefix="Dr." placeholder="Doctor's name"
                                value={formPediatrician}
                                onChangeText={(value) => setFormPediatrician(stripDoctorPrefix(value))}
                                autoCapitalize="words" />
                            <Field label="OB-GYNE" prefix="Dr." placeholder="Doctor's name"
                                value={formObgyne}
                                onChangeText={(value) => setFormObgyne(stripDoctorPrefix(value))}
                                autoCapitalize="words" />
                            <Field label="Emergency Contact First Name" placeholder="First name"
                                value={formEmergencyFirstName} onChangeText={setFormEmergencyFirstName}
                                autoCapitalize="words" />
                            <Field label="Emergency Contact Last Name" placeholder="Last name"
                                value={formEmergencyLastName} onChangeText={setFormEmergencyLastName}
                                autoCapitalize="words" />
                            <Field label="Emergency Contact Relationship" placeholder="e.g. Mother"
                                value={formEmergencyRelationship} onChangeText={setFormEmergencyRelationship}
                                autoCapitalize="words" />
                            <Field label="Emergency Contact Number" placeholder="Contact number"
                                value={formEmergencyNumber} onChangeText={setFormEmergencyNumber}
                                numericMode="digits" keyboardType="phone-pad" textContentType="telephoneNumber" />

                            <RecordFormRow label={<Text style={styles.modalLabel}>Place of Birth</Text>}>

                            <TextInput
                                style={[styles.modalInput, { backgroundColor: "transparent", borderWidth: 0 }]}
                                value={formPlaceOfBirth}
                                onChangeText={setFormPlaceOfBirth}
                            />
                            </RecordFormRow>
                            <TimeField
                                label="Time of Birth"
                                value={formTimeOfBirth}
                                onChange={setFormTimeOfBirth}
                            />

                </RecordFormGroup>
            </RecordFormSheet>

            <DeleteConfirmation anchor={deleteProfileTarget?.anchor} visible={!!deleteProfileTarget} title="Delete baby profile?"
                message={`Permanently delete ${deleteProfileTarget?.name || "this baby"}'s profile and all associated records? This cannot be undone.`}
                deleteLabel="Delete Profile" busy={profileSaving === "delete"} blurTarget={blurTargetRef}
                onCancel={() => { if (!deleteProfileLock.current) setDeleteProfileTarget(null); }} onConfirm={handleDeleteBaby} />
            <OptionSheet visible={(currentView === "editBabyProfile" || showAddProfileModal) && bloodTypeMenuOpen}
                anchor={bloodTypeMenuAnchor} onClose={() => setBloodTypeMenuOpen(false)} blurTarget={showAddProfileModal ? babyFormBlurTarget : blurTargetRef}
                title="Select blood type" selectedKey={formBloodType}
                options={BLOOD_TYPES.map(value => ({ key: value, label: value }))}
                onSelect={value => { setFormBloodType(value); setBloodTypeMenuOpen(false); }} />

            {/* Annual data-retention re-consent (Data Privacy Act of 2012, RA 10173) */}
            <Modal visible={consentDue} transparent animationType="fade">
                <View style={styles.modalBg}>
                    <View style={styles.modalCard}>
                        {!withdrawConfirm ? (
                            <>
                                <Text style={styles.modalTitle}>Annual Data Review</Text>
                                <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: space.lg }}>
                                    It's been about a year since your last review. In line with the Data
                                    Privacy Act of 2012 (RA 10173), do you still want BabyBook+ to keep
                                    retaining your and your child's data?
                                </Text>
                                <TouchableOpacity
                                    onPress={handleKeepData}
                                    style={styles.modalSaveBtn}
                                    disabled={!!consentAction}
                                    accessibilityState={{ disabled: !!consentAction, busy: consentAction === "renew" }}
                                >
                                    {(<Text style={styles.modalSaveText}>Yes, keep my data for another year</Text>)}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setWithdrawConfirm(true)}
                                    style={{ marginTop: space.md, alignItems: "center", paddingVertical: 12 }}
                                    disabled={!!consentAction}
                                    accessibilityState={{ disabled: !!consentAction }}
                                >
                                    <Text style={{ color: colors.danger, fontWeight: "700", fontSize: 13 }}>
                                        No — withdraw & delete my data
                                    </Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <Text style={styles.modalTitle}>Delete everything?</Text>
                                <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: space.lg }}>
                                    This permanently deletes your account and all of your child's records.
                                    This cannot be undone.
                                </Text>
                                <TouchableOpacity
                                    onPress={handleWithdrawData}
                                    style={[styles.modalSaveBtn, { backgroundColor: colors.danger }]}
                                    disabled={!!consentAction}
                                    accessibilityState={{ disabled: !!consentAction, busy: consentAction === "delete" }}
                                >
                                    {(<Text style={styles.modalSaveText}>Permanently delete everything</Text>)}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setWithdrawConfirm(false)}
                                    style={{ marginTop: space.md, alignItems: "center", paddingVertical: 12 }}
                                    disabled={!!consentAction}
                                    accessibilityState={{ disabled: !!consentAction }}
                                >
                                    <Text style={{ color: colors.textSecondary, fontWeight: "700", fontSize: 13 }}>Go back</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Baby switcher. An anchored menu, not a bottom sheet: it belongs
                to the name that opened it and reads as an extension of it.
                Rows show the FULL name even though the header shows only the
                short form — this is the screen where a parent tells two
                siblings apart, so it is the one place the whole name belongs. */}
            <BabyProfilePicker
                visible={switcherOpen}
                anchor={switcherAnchor}
                triggerRef={nameRef}
                onAnchorChange={setSwitcherAnchor}
                profiles={profiles}
                selectedId={activeProfile?.id}
                alerts={childAlerts}
                brokenAvatars={brokenAvatars}
                onAvatarError={id => setBrokenAvatars(prev => new Set(prev).add(id))}
                onSelect={selectProfile}
                onAddChild={openAddModal}
                blurTarget={blurTargetRef}
                onClose={() => setSwitcherOpen(false)}
            />
        </Gradient>
        </ScrollContext.Provider></GlassTargetContext.Provider></RecordCreationContext.Provider>
    );
}

export default function App() {
    const [attempt, setAttempt] = useState(0);
    return <StartupGuard key={attempt} retrying={attempt > 0} onRetry={() => setAttempt(value => value + 1)}
        hideSplash={() => SplashScreen?.hideAsync()}>
        {report => <AppSession onStartupState={report} />}
    </StartupGuard>;
}

function AppSession({ onStartupState }) {
    // Active child's gender drives the theme; a manual override from Settings
    // ("auto" | "girl" | "boy") can force it. Default is "auto".
    const [themeGender, setThemeGender] = useState(undefined);
    const [themeOverride, setThemeOverride] = useState("auto");
    // Independent light/dark axis — a manual "light"/"dark" choice, or
    // "system" to follow the OS setting. Combines with themeOverride above
    // (e.g. "girl" + "dark" = dark pink theme).
    //
    // Starts at "light", which is also what an absent bb_dark_mode key means:
    // the app opens light for everyone until a parent picks otherwise. The
    // effect below still restores a saved choice, so anyone who has already
    // chosen "system" or "dark" keeps it.
    const [schemeOverride, setSchemeOverride] = useState("light");
    const [preferencesReady, setPreferencesReady] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                // Cleanup runs independently of the startup preference/splash gate.
                void removeLegacyOfflineSummaries();
                const saved = await storage.getItem("bb_theme_override");
                if (saved) setThemeOverride(saved);
                const savedScheme = await storage.getItem("bb_dark_mode");
                if (savedScheme) setSchemeOverride(savedScheme);
            } catch (e) {
                /* ignore */
            } finally {
                setPreferencesReady(true);
            }
        })();
    }, []);

    const changeThemeOverride = async (v) => {
        setThemeOverride(v);
        try {
            await storage.setItem("bb_theme_override", v);
        } catch (e) {
            /* ignore */
        }
    };

    const changeSchemeOverride = async (v) => {
        setSchemeOverride(v);
        try {
            await storage.setItem("bb_dark_mode", v);
        } catch (e) {
            /* ignore */
        }
    };

    return (
        <SafeAreaProvider>
            <LanguageProvider>
                <ThemeProvider gender={themeGender} override={themeOverride} schemeOverride={schemeOverride}>
                    <DatabaseLoadingProvider>
                    <ToastProvider>
                        <MainAppShell
                            onThemeGenderChange={setThemeGender}
                            themeOverride={themeOverride}
                            onThemeOverrideChange={changeThemeOverride}
                            schemeOverride={schemeOverride}
                            onSchemeOverrideChange={changeSchemeOverride}
                            preferencesReady={preferencesReady}
                            onStartupState={onStartupState}
                        />
                    </ToastProvider>
                    </DatabaseLoadingProvider>
                </ThemeProvider>
            </LanguageProvider>
        </SafeAreaProvider>
    );
}

const makeStyles = (colors) => StyleSheet.create({
    // No backgroundColor on either of these: the root is a Gradient and the
    // header sits ON it, so the tint runs unbroken from under the status bar
    // down through the header into the page.
    container: {
        flex: 1,
    },
    // Absolute, so the page scrolls UNDERNEATH it. That is the whole reason the
    // white background exists — with the header in flow there would be nothing
    // for it to cover. zIndex rather than moving 200 lines of JSX below the
    // content: an absolutely-positioned sibling with a zIndex paints above
    // in-flow siblings on both native and web.
    header: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: space.lg,
        paddingVertical: space.md,
    },
    // The white ground that fades in on scroll. Absolute-fill inside the header
    // so it also covers the status-bar inset, which is part of the bar.
    headerBg: {
        ...StyleSheet.absoluteFill,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.hairline,
    },
    // The left side takes the slack and shrinks; the right side (four fixed
    // 44pt buttons) never does. Previously both were unbounded, so whichever
    // had more content won and the other overflowed the screen edge.
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        minWidth: 0,
        marginRight: space.sm,
    },
    headerRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: space.xs,
        flexShrink: 0,
    },
    babyNameBtn: {
        flexDirection: "row",
        alignItems: "center",
        minHeight: MIN_TOUCH,
        flexShrink: 1,
        minWidth: 0,
        // Pulls the text back to the screen's left margin — the row's own
        // padding already provides it, and the touch target extends past it.
        marginLeft: -space.xs,
        paddingLeft: space.xs,
    },
    // The group that scales with scroll. transformOrigin pins it to the left so
    // the title shrinks toward the margin instead of toward its own centre,
    // which is what would happen with RN's default centre origin.
    babyNameScale: {
        flexDirection: "row",
        alignItems: "center",
        flexShrink: 1,
        minWidth: 0,
        transformOrigin: "left center",
    },
    // Ink, not brand colour. The page gradient behind this now carries the
    // girl/boy read; a coloured name would state the same thing twice.
    //
    // Laid out at HEADER_TITLE_MAX and scaled DOWN from there — never scaled
    // up, which would soften the glyphs.
    babyName: {
        ...type.title,
        fontSize: HEADER_TITLE_MAX,
        lineHeight: Math.round(HEADER_TITLE_MAX * 1.2),
        color: colors.text,
        flexShrink: 1,
        minWidth: 0,
    },
    // Coral = overdue, the same tone the Needs Attention card uses.
    babyNameDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        borderCurve: "continuous",
        backgroundColor: colors.danger,
        marginLeft: space.xs,
        flexShrink: 0,
    },
    babyNameChevron: { marginLeft: space.xs, flexShrink: 0 },
    backBtn: {
        width: MIN_TOUCH,
        height: MIN_TOUCH,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: -space.sm, // optical alignment with the screen content below
    },
    screenTitle: { ...type.heading, color: colors.text, flexShrink: 1 },
    content: {
        flex: 1,
    },
    blurTarget: {
        flex: 1,
    },

    fab: { position: "absolute", right: space.lg },
    modalBg: {
        flex: 1,
        backgroundColor: "rgba(28,25,23,0.55)",
        justifyContent: "center",
        alignItems: "center",
        padding: space.xl,
    },

    avatarPickerWrap: {
        alignItems: "center",
        marginBottom: space.lg,
    },
    avatarPreview: {
        width: 96,
        height: 96,
        borderRadius: 48,
        borderWidth: 3,
        borderColor: colors.surface,
        backgroundColor: colors.surfaceAlt,
        ...shadow.card,
    },
    avatarPreviewEmpty: {
        alignItems: "center",
        justifyContent: "center",
        borderColor: colors.border,
        borderStyle: "dashed",
    },
    avatarBadge: {
        position: "absolute",
        right: -2,
        bottom: -2,
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: colors.accentStrong,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: colors.background,
    },
    avatarHint: {
        marginTop: space.sm,
        ...type.caption,
        fontWeight: "600",
        color: colors.textMuted,
    },
    modalCard: {
        backgroundColor: colors.background,
        borderRadius: radius.xl,
        borderCurve: "continuous",
        padding: space.xl,
        width: "100%",
        // 440, not 360: at 360 the sheet stayed narrower than the phone it was
        // sitting on once the screen reached 390 or 430pt.
        maxWidth: 440,
        borderWidth: 1,
        borderColor: colors.hairline,
        ...shadow.raised,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "800",
        color: colors.text,
        letterSpacing: -0.2,
        marginBottom: space.lg,
    },
    modalLabel: {
        ...type.caption,
        fontWeight: "700",
        color: colors.textSecondary,
        marginBottom: 6,
    },
    modalInput: {
        backgroundColor: colors.surfaceAlt,
        borderWidth: 0,
        borderColor: colors.border,
        borderRadius: radius.lg,
        borderCurve: "continuous",
        paddingHorizontal: space.lg,
        minHeight: 52,
            paddingVertical: space.sm,
        fontSize: 16,
        color: colors.text,
        marginBottom: space.lg,
    },
    dropdownText: { ...type.body, color: colors.text, flex: 1, minWidth: 0 },
    dropdownPlaceholder: { color: colors.placeholder },
    bloodTypeTrigger: {
        minHeight: 52,
        paddingHorizontal: space.md,
        backgroundColor: "transparent",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: space.sm,
    },
    modalSaveBtn: {
        paddingVertical: 12,
        paddingHorizontal: space.lg,
        borderRadius: radius.pill,
        borderCurve: "continuous",
        backgroundColor: colors.accentStrong,
        ...shadow.accent,
    },
    modalSaveText: {
        fontSize: 14,
        fontWeight: "800",
        color: colors.onAccent,
    },

});
