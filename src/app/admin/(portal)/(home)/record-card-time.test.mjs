import assert from "node:assert/strict";
import test from "node:test";

import { clockLabel, joinTime, timeParts } from "./record-card-time.ts";

for (const [time, label, parts] of [
  ["00:00", "12:00 AM", { hour: "12", minute: "00", meridiem: "AM" }],
  ["11:59", "11:59 AM", { hour: "11", minute: "59", meridiem: "AM" }],
  ["12:00", "12:00 PM", { hour: "12", minute: "00", meridiem: "PM" }],
  ["13:05", "1:05 PM", { hour: "1", minute: "05", meridiem: "PM" }],
  ["23:59", "11:59 PM", { hour: "11", minute: "59", meridiem: "PM" }],
]) {
  test(`${time} uses the correct wall-clock label and wheel values`, () => {
    assert.equal(clockLabel(time), label);
    assert.deepEqual(timeParts(time), parts);
    assert.equal(joinTime(parts), time);
  });
}

test("an incomplete or impossible wheel selection cannot commit a time", () => {
  for (const parts of [
    { hour: "", minute: "00", meridiem: "AM" },
    { hour: "12", minute: "", meridiem: "AM" },
    { hour: "12", minute: "00", meridiem: "" },
    { hour: "12", minute: "99", meridiem: "PM" },
  ]) {
    assert.equal(joinTime(parts), "");
  }
  assert.equal(clockLabel(""), "");
  assert.equal(clockLabel("24:00"), "");
});
