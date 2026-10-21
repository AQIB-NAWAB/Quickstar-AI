import assert from "node:assert/strict";
import test from "node:test";
import type { CampaignSchedule } from "../domain/types.js";
import { evaluateCallingWindow, isValidIanaTimezone } from "../utils/schedule-window.js";

test("isValidIanaTimezone validates IANA identifiers correctly", () => {
  assert.equal(isValidIanaTimezone("America/New_York"), true);
  assert.equal(isValidIanaTimezone("Europe/London"), true);
  assert.equal(isValidIanaTimezone("Asia/Karachi"), true);
  assert.equal(isValidIanaTimezone("UTC"), true);

  assert.equal(isValidIanaTimezone("Invalid/Tz_Name"), false);
  assert.equal(isValidIanaTimezone(""), false);
  assert.equal(isValidIanaTimezone(null as unknown as string), false);
});

test("evaluateCallingWindow: recipient-local mode holds contacts with missing or invalid timezone", () => {
  const schedule: CampaignSchedule = {
    startDate: "2026-01-01",
    startTime: "09:00",
    timezone: "UTC",
    dailyWindowFrom: "09:00",
    dailyWindowTo: "17:00",
    weekdays: ["mon", "tue", "wed", "thu", "fri"],
    timezoneMode: "recipient_local",
  };

  // Missing timezone -> hold
  const resMissing = evaluateCallingWindow(schedule, null);
  assert.equal(resMissing.inWindow, false);
  assert.equal(resMissing.held, true);
  assert.equal(resMissing.heldReason, "unknown_timezone");

  // Invalid timezone -> hold
  const resInvalid = evaluateCallingWindow(schedule, "Mars/Olympus_Mons");
  assert.equal(resInvalid.inWindow, false);
  assert.equal(resInvalid.held, true);
  assert.equal(resInvalid.heldReason, "unknown_timezone");
});

test("evaluateCallingWindow: rejects overnight daily windows", () => {
  const schedule: CampaignSchedule = {
    startDate: "2026-01-01",
    startTime: "21:00",
    timezone: "UTC",
    dailyWindowFrom: "21:00",
    dailyWindowTo: "06:00", // Overnight
    weekdays: ["mon", "tue", "wed", "thu", "fri"],
    timezoneMode: "campaign_fixed",
  };

  const res = evaluateCallingWindow(schedule, undefined, new Date("2026-10-19T22:00:00Z"));
  assert.equal(res.inWindow, false);
  assert.equal(res.held, false);
  assert.match(res.reason ?? "", /overnight/i);
});

test("evaluateCallingWindow: checks active weekdays", () => {
  const schedule: CampaignSchedule = {
    startDate: "2026-01-01",
    startTime: "09:00",
    timezone: "UTC",
    dailyWindowFrom: "09:00",
    dailyWindowTo: "17:00",
    weekdays: ["mon", "tue", "wed", "thu", "fri"], // Weekdays only
    timezoneMode: "campaign_fixed",
  };

  // 2026-10-18 was a Sunday
  const sundayNoon = new Date("2026-10-18T12:00:00Z");
  const resSunday = evaluateCallingWindow(schedule, undefined, sundayNoon);
  assert.equal(resSunday.inWindow, false);
  assert.match(resSunday.reason ?? "", /not in active campaign weekdays/i);

  // 2026-10-19 is a Monday
  const mondayNoon = new Date("2026-10-19T12:00:00Z");
  const resMonday = evaluateCallingWindow(schedule, undefined, mondayNoon);
  assert.equal(resMonday.inWindow, true);
  assert.equal(resMonday.held, false);
});

test("evaluateCallingWindow: checks campaign start and end dates", () => {
  const schedule: CampaignSchedule = {
    startDate: "2026-11-01",
    endDate: "2026-11-30",
    startTime: "09:00",
    timezone: "UTC",
    dailyWindowFrom: "09:00",
    dailyWindowTo: "17:00",
    weekdays: ["mon", "tue", "wed", "thu", "fri"],
    timezoneMode: "campaign_fixed",
  };

  // Date before start date
  const beforeStart = new Date("2026-10-19T12:00:00Z");
  const resBefore = evaluateCallingWindow(schedule, undefined, beforeStart);
  assert.equal(resBefore.inWindow, false);
  assert.match(resBefore.reason ?? "", /has not started yet/i);
});
