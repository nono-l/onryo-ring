import assert from "node:assert/strict";
import test from "node:test";
import { chooseModified } from "./page-dates.mjs";

test("同じ内容なら前の更新日を保つ", () => {
  const chosen = chooseModified({
    hash: "abc",
    prev: { hash: "abc", modified: "2026-09-24T12:20:08+09:00" },
    git: "2026-10-03T07:15:00+09:00",
    dirty: "2026-10-03T07:15:01+09:00",
  });
  assert.equal(chosen.modified, "2026-09-24T12:20:08+09:00");
  assert.equal(chosen.published, undefined);
});

test("未コミットの保存時刻を、コミット時刻より優先する", () => {
  const chosen = chooseModified({
    hash: "new",
    prev: { hash: "old", modified: "2026-09-24T12:20:08+09:00" },
    git: "2026-09-24T12:20:08+09:00",
    dirty: "2026-10-03T06:42:24+09:00",
  });
  assert.equal(chosen.modified, "2026-10-03T06:42:24+09:00");
});

test("コミット済みの変更はコミット時刻", () => {
  const chosen = chooseModified({
    hash: "new",
    prev: { hash: "old", modified: "2026-09-01T12:00:00+09:00" },
    git: "2026-09-24T12:20:08+09:00",
    dirty: null,
  });
  assert.equal(chosen.modified, "2026-09-24T12:20:08+09:00");
});

test("公開日は更新日と同じ値なら捨てる", () => {
  const chosen = chooseModified({
    hash: "abc",
    prev: { hash: "abc", modified: "2026-09-24T12:20:08+09:00", published: "2026-09-24T12:20:08+09:00" },
    git: null,
    dirty: null,
  });
  assert.equal(chosen.published, undefined);
});

test("別の公開日だけ残す", () => {
  const chosen = chooseModified({
    hash: "new",
    prev: { hash: "old", modified: "2026-09-01T12:00:00+09:00", published: "2026-09-01T12:00:00+09:00" },
    git: "2026-10-03T06:42:24+09:00",
    dirty: null,
  });
  assert.equal(chosen.modified, "2026-10-03T06:42:24+09:00");
  assert.equal(chosen.published, "2026-09-01T12:00:00+09:00");
});

test("根拠が無いときは日付を作らない", () => {
  assert.equal(chooseModified({ hash: "x", prev: null, git: null, dirty: null }), null);
});
