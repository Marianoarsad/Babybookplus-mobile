const fs = require("fs");
const path = require("path");
const assert = require("assert");
const src = fs.readFileSync(path.join(__dirname, "pickers.js"), "utf8").replace(/export function/g, "function");
const { availablePickerDates, closestAvailableDate, durationParts, durationValue, pickerDateParts, pickerDateValue, pickerYears, selectableMonths, timeParts, timeValue } = new Function(
    `${src}\nreturn { availablePickerDates, closestAvailableDate, durationParts, durationValue, pickerDateParts, pickerDateValue, pickerYears, selectableMonths, timeParts, timeValue };`,
)();

assert.deepStrictEqual(timeParts("00:05"), { period: "AM", hour: 12, minute: 5 });
assert.deepStrictEqual(timeParts("13:47"), { period: "PM", hour: 1, minute: 47 });
assert.strictEqual(timeValue({ period: "PM", hour: 12, minute: 3 }), "12:03");
assert.strictEqual(timeValue({ period: "AM", hour: 12, minute: 3 }), "00:03");
assert.deepStrictEqual(durationParts(1), { hour: 0, minute: 1 });
assert.deepStrictEqual(durationParts(60), { hour: 1, minute: 0 });
assert.deepStrictEqual(durationParts(1440), { hour: 24, minute: 0 });
assert.strictEqual(durationValue({ hour: 0, minute: 0 }), 1);
assert.strictEqual(durationValue({ hour: 23, minute: 59 }), 1439);
assert.strictEqual(durationValue({ hour: 24, minute: 59 }), 1440);
assert.deepStrictEqual(pickerDateParts("2026-09-25", "2020-01-01"), { year: 2026, month: 9, day: 25 });
assert.deepStrictEqual(pickerDateParts("", "2020-01-01"), { year: 2020, month: 1, day: 1 });
assert.strictEqual(pickerDateValue({ year: 2024, month: 2, day: 31 }), "2024-02-29");
assert.strictEqual(pickerDateValue({ year: 2026, month: 1, day: 1 }, "2026-03-10"), "2026-03-10");
assert.strictEqual(pickerDateValue({ year: 2026, month: 12, day: 1 }, null, "2026-09-25"), "2026-09-25");
assert.deepStrictEqual(pickerYears("1975-04-04", null, null, 2026), Array.from({ length: 141 }, (_, i) => 1906 + i));
assert.deepStrictEqual(pickerYears("2026-09-25", "2024-01-01", "2026-12-31"), [2024, 2025, 2026]);
assert.deepStrictEqual(
    availablePickerDates(["2026-09-20", "2026-08-04", "2026-09-20", "invalid"], "2026-08-10", "2026-09-30"),
    ["2026-09-20"],
);
assert.strictEqual(closestAvailableDate(["2026-08-10", "2026-08-20"], "2026-08-15"), "2026-08-10");
assert.strictEqual(closestAvailableDate(["2026-08-10", "2026-09-03"], "2026-09-01"), "2026-09-03");
assert.strictEqual(closestAvailableDate([], "2026-09-01"), "");
assert.deepStrictEqual(selectableMonths(2026, new Date(2026, 8, 15)), [8, 9, 10, 11]);
assert.deepStrictEqual(selectableMonths(2025, new Date(2026, 8, 15)), []);

const read = file => fs.readFileSync(path.join(__dirname, "../components/", file), "utf8");
const fields = read("ui/DateField.js"), growth = read("Growth.js"), card = read("ui/GrowthMeasurementsCard.js"), filter = read("ui/NutritionDateFilter.js");
assert(growth.includes("<GrowthMeasurementsCard"), "Growth uses the current measurement/filter composition");
assert(card.includes("<NutritionDateFilter") && filter.includes("<DateWheelPicker"), "Growth reaches the shared date wheel through its filter");
assert(filter.includes("availableDates={availableDates}"), "Recorded-date restrictions reach the wheel");
for (const mode of ['visible={visible}', 'visible={open && mode === "time"}', 'visible={open}']) assert(fields.includes('<WheelPickerModal '+mode), "Every modal wheel uses the shared glass shell");
assert(fields.includes('onChange(timeValue(pendingTime)); setOpen(false);'));
assert(fields.includes('onChange(measurementValue(draft, min, max)); setOpen(false);'));
assert(fields.includes('onChange(draft); onClose();'));
assert(fields.includes('export function DurationWheel') && fields.includes('nestedScrollEnabled'));
// Execute the actual wheel handlers/drafts/material/geometry checks, rather than old screen-markup assertions.
require('../components/ui/DateWheelPicker.check.js');
console.log("picker helpers and current shared-screen integration: ok");
