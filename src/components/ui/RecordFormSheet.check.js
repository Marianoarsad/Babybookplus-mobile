const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { parse } = require("@babel/parser");
const { canDeleteRecord, deleteRecordAndClose, headerActionIcon } = require("./recordFormActions.cjs");

async function check() {
    let staleClosed = false;
    assert.equal(await deleteRecordAndClose(async () => true, () => { staleClosed = true; }, () => false), true);
    assert.equal(staleClosed, false, "A late deletion must not close a different form");
    for (const [cancel, save] of [["Cancel", "Save Record"], ["Kanselahin", "I-save ang Record"], ["Cancel", "Save na ang Record"]]) {
        assert.equal(headerActionIcon(cancel, "cancel", cancel), "close");
        assert.equal(headerActionIcon(save, "save", save), "checkmark");
        assert.equal(headerActionIcon("Save", "save", save), "checkmark");
        assert.equal(headerActionIcon("Cancel", "cancel", cancel), "close");
        for (const label of ["Add", "Update", "Schedule", "Confirm", "Create Profile", "Log out"]) {
            assert.equal(headerActionIcon(label, "save", save), null);
            assert.equal(headerActionIcon(label, "cancel", cancel), null);
        }
    }
    const remove = () => true;
    assert.equal(canDeleteRecord(null, remove), false, "Create forms cannot delete");
    assert.equal(canDeleteRecord({ id: 1 }, undefined), false, "Profiles/create-only records have no delete callback");
    assert.equal(canDeleteRecord({ id: 1 }, remove), true);
    let closed = 0;
    const close = () => { closed++; };
    assert.equal(await deleteRecordAndClose(async () => false, close), false);
    assert.equal(await deleteRecordAndClose(async () => undefined, close), false);
    assert.equal(closed, 0, "A caught error/unspecified result must not discard the draft");
    await assert.rejects(deleteRecordAndClose(async () => { throw new Error("Offline"); }, close), /Offline/);
    assert.equal(closed, 0);
    assert.equal(await deleteRecordAndClose(async () => true, close), true);
    assert.equal(closed, 1);

    const root = path.resolve(__dirname, "..");
    const files = ["../App.js", "EmptyChild.js", "Health.js", "CalendarView.js", "NutritionTracker.js",
        "Growth.js", "Notifications.js", "ui/GrowthModal.js", "ui/MedicineModal.js", "ui/MedicalEventModal.js", "ui/AddMemoryModal.js",
        "ui/Field.js", "ui/DateField.js", "ui/RecordFormSheet.js"];
    let sheets = 0;
    function walk(node, visit) {
        if (!node || typeof node !== "object") return;
        if (node.type) visit(node);
        for (const [key, value] of Object.entries(node)) {
            if (key === "loc") continue;
            if (Array.isArray(value)) value.forEach((item) => walk(item, visit));
            else if (value && typeof value === "object") walk(value, visit);
        }
    }
    for (const file of files) {
        const source = fs.readFileSync(path.join(root, file), "utf8");
        const tree = parse(source, { sourceType: "module", plugins: ["jsx"] });
        walk(tree, (node) => {
            if (node.type !== "JSXOpeningElement" || node.name.name !== "RecordFormSheet") return;
            sheets++;
            const attributes = new Map(node.attributes.map((a) => [a.name?.name, a]));
            for (const name of ["title", "onClose", "onSubmit", "busy"])
                assert(attributes.has(name), `${file}: missing ${name}`);
            if (attributes.has("onDelete")) assert(attributes.has("record"), `${file}: deleting requires an existing record`);
            if (["../App.js", "EmptyChild.js", "ui/AddMemoryModal.js"].includes(file))
                assert(!attributes.has("onDelete"), `${file}: no profile/create-only deletion`);
        });
    }
    assert.equal(sheets, 12, "All twelve bottom-sheet record form presentations use the shared sheet");
    const sheet = fs.readFileSync(path.join(root, "ui/RecordFormSheet.js"), "utf8");
    assert(sheet.includes('animationType="none"'));
    assert(sheet.includes("useBottomSheetMotion"));
    assert(sheet.includes("gestureEnabled: !blocked && !confirming, dismissible"));
    assert(sheet.includes("fontSize: type.heading.fontSize * 1.3"));
    assert(sheet.includes('variant="settings"') && sheet.includes('<SheetGrabber motion={motion}'));
    assert(sheet.includes("if (deleteLock.current || busy || !onDelete) return"));
    assert(sheet.includes("submitLock.current"));
    assert(sheet.includes("accessibilityElementsHidden={confirming}"));
    assert(sheet.includes("Animated.timing(warp") && sheet.includes("motion.entrance.duration"));
    assert(sheet.includes("scaleX: warp.interpolate") && sheet.includes("scaleY: warp.interpolate"));
    assert(sheet.includes("useReducedMotion(visible)"));
    assert(sheet.includes('accessibilityViewIsModal onAccessibilityEscape={cancel}') && sheet.includes('transparent animationType="none"'));
    assert(sheet.includes('height: motion.height'));
    assert(/sheet:\s*\{[^}]*width: "100%"/.test(sheet));
    assert(!/sheet:\s*\{[^}]*maxWidth/.test(sheet), "Record sheets must span the screen on every display width");
    assert(sheet.includes('title={dismissLabel}'));
    assert(sheet.includes('title={submitLabel}'));
    assert(sheet.includes('ScrollView style={{ flex: 1, minHeight: 0 }}'));
    assert(sheet.includes("export function RecordFormScreen"));
    assert(sheet.includes("<Animated.ScrollView"));
    assert(sheet.includes('bottom: 0, left: 0'), "Full-screen forms must extend behind the floating tab bar");
    assert(sheet.includes('submitLabel = "Save Changes"'));
    const menu = fs.readFileSync(path.join(root, "ui/ActionSheet.js"), "utf8");
    for (const source of [sheet, menu]) assert(source.includes("recordSheetHeight("), "Both sheets share their height calculation");
    for (const source of [sheet, menu]) assert(source.includes("height: motion.height"), "Both sheets measure scrolling against their visible height");
    for (const source of [sheet, menu]) assert(source.includes("<SheetGrabber motion={motion}"));
    const grabber = fs.readFileSync(path.join(root, "ui/SheetGrabber.js"), "utf8");
    assert(grabber.includes("[0, 1].map"));
    assert(grabber.includes("...motion.grabberPan.panHandlers"));
    const app = fs.readFileSync(path.join(root, "../App.js"), "utf8");
    const editStart = app.indexOf("{/* Screen: EDIT BABY PROFILE */}");
    const mainContentStart = app.indexOf("{/* Main Container View content */}");
    const elements = node => !node || typeof node !== "object" ? [] : [node, ...Object.values(node).flatMap(value => Array.isArray(value) ? value.flatMap(elements) : elements(value))];
    const target = elements(require("@babel/parser").parse(app, { sourceType: "module", plugins: ["jsx"] })).find(node =>
        node.type === "JSXElement" && node.openingElement.name.name === "BlurTargetView" && node.openingElement.attributes.some(attr => attr.name?.name === "ref" && attr.value?.expression?.name === "blurTargetRef"));
    const blurTargetClose = target.closingElement.start;
    const editProfile = app.slice(editStart, blurTargetClose);
    assert(mainContentStart < editStart && editStart < blurTargetClose,
        "Edit Baby Profile must share the header's BlurTargetView stacking context");
    assert.equal((app.match(/\{\/\* Screen: EDIT BABY PROFILE \*\/\}/g) || []).length, 1,
        "Edit Baby Profile must have exactly one render site");
    assert(editProfile.includes('<RecordFormScreen'));
    assert(!editProfile.includes('<RecordFormSheet'));
    assert(app.includes('editBabyProfile: "Edit Baby Profile"'));
    assert(app.includes('changeView("editBabyProfile")'));
    assert(app.includes("onPress={goBack}"), "The shared Back button must keep the navigation history handler");
    for (const destination of ["search", "share", "viewProfile"])
        assert(app.includes(`openHeaderView("${destination}")`), `Missing shared header route to ${destination}`);
    assert(app.slice(app.indexOf("const openHeaderView ="), app.indexOf("const goBack =")).includes("changeView(view)"));
    for (const bloodType of ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"])
        assert(app.includes(`"${bloodType}"`), `Missing blood type option ${bloodType}`);
    assert(editProfile.includes('<SettingsCard headerStyle={{ display: "none" }}'), "Profile form reuses the raised settings parent without an empty heading");
    assert(!editProfile.includes('<RecordFormGroup'), "The raised parent replaces rather than wraps the flat form group");
    assert(app.includes('blurTarget={showAddProfileModal ? babyFormBlurTarget : blurTargetRef}'), "Profile dropdown uses its owning form capture");
    assert(editProfile.includes('<SelectTrigger ref={bloodTypeTriggerRef} label="Blood Type"'));
    assert(editProfile.includes('visible={bloodTypeMenuOpen} onAnchorChange={setBloodTypeMenuAnchor}'));
    const optionSheet = fs.readFileSync(path.join(root, "ui/OptionSheet.js"), "utf8");
    assert(optionSheet.includes('appearance="connectedSelect"'));
    assert(optionSheet.includes('variant="connectedSelect"'));
    assert(!sheet.includes('bottom: tabBarHeight, left: 0, zIndex: 1'), "Full-screen forms must not cover the global header touch layer");
    assert(/pointerEvents="box-none"\s+style=\{\[styles\.header/.test(app), "Global header children must remain interactive over full-screen forms");
    assert(sheet.includes("const padTop = useScreenPadTop();"), "Full-screen forms must clear the measured global header");
    assert(sheet.includes('paddingTop: padTop'), "Full-screen form content must retain the shared header inset");
    assert(sheet.includes("const padBottom = useScreenPadBottom();"), "Full-screen forms must measure bottom navigation clearance");
    assert(sheet.includes('paddingBottom: padBottom'), "Full-screen form content must remain reachable above the tab bar");
    assert(!editProfile.includes('placeholder="e.g. O+"'), "Edit Baby Profile blood type must not remain free text");
    const anchoredMenu = fs.readFileSync(path.join(root, "ui/AnchoredMenu.js"), "utf8");
    assert(anchoredMenu.includes('variant === "select"'));
    assert(anchoredMenu.includes("width: panelWidth"), "Select menus must match their trigger width");
    assert(anchoredMenu.includes("selected && !select"), "Select menus use a row highlight instead of a checkmark");
    const responsive = fs.readFileSync(path.join(root, "../utils/responsive.js"), "utf8");
    const sizing = parse(responsive, { sourceType: "module" }).program.body
        .find((node) => node.declaration?.id?.name === "recordSheetHeight").declaration;
    const recordSheetHeight = new Function("space", "type", "MIN_TOUCH",
        `${responsive.slice(sizing.start, sizing.end)}; return recordSheetHeight;`)(
        { sm: 8, md: 12, xl: 24 }, { heading: { lineHeight: 23 }, label: { lineHeight: 18 } }, 44);
    assert.equal(recordSheetHeight(800), 575, "Retain the original add-record menu height at normal text size");
    assert(responsive.includes("export function expandedSheetHeight"));
    const expandedNode = parse(responsive, { sourceType: "module" }).program.body
        .find(node => node.declaration?.id?.name === "expandedSheetHeight").declaration;
    const expandedSheetHeight = new Function("space", `${responsive.slice(expandedNode.start, expandedNode.end)}; return expandedSheetHeight;`)({ md: 12 });
    for (const height of [0, 320, 600, 844, 1080]) for (const scale of [1, 2, 3]) {
        for (const top of [0, 44]) for (const bottom of [0, 34]) {
            const actual = recordSheetHeight(height, scale, top, bottom);
            const expanded = expandedSheetHeight(height, actual, top);
            assert.equal(expanded, Math.max(0, height - Math.max(top, 12)), "Expansion reaches the safe-area ceiling");
            if (expanded > 200) assert(expanded - actual >= 64, "Reserve meaningful expansion with larger text or a short viewport");
            assert(actual >= 0 && actual <= Math.max(0, height - Math.max(top, 12)), "Fit the available safe area");
            assert(actual >= recordSheetHeight(height, 1, top, bottom), "Accommodate larger text without shrinking the sheet");
        }
    }
    const medical = fs.readFileSync(path.join(root, "ui/MedicalEventModal.js"), "utf8");
    assert(medical.includes('modalTitle: "Log an illness"'));
    assert(medical.includes('modalTitle: "Log a hospital stay"'));
    assert(!medical.includes("You can also record the stay itself under"));
    console.log("Record form checks passed: 12 sheets, full-screen Edit Baby Profile, blood-type dropdown, scrolling, delete guards and reduced motion.");
}

check().catch((error) => { console.error(error); process.exitCode = 1; });
