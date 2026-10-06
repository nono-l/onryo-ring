/* このファイルは scripts/page-dates.mjs が書く。手で直さない。 */
export const PAGE_DATES: Record<string, { modified: string; published?: string }> = {
  "/": {
    "modified": "2026-10-06T18:23:44+09:00"
  },
  "/how": {
    "modified": "2026-10-06T18:22:26+09:00"
  },
  "/terms": {
    "modified": "2026-10-06T18:22:26+09:00"
  },
  "/login": {
    "modified": "2026-10-06T18:22:26+09:00"
  }
};

export const PAGE_DATE_LEDGER: Record<string, { modified: string; hash: string; published?: string }> = {
  "/": {
    "modified": "2026-10-06T18:23:44+09:00",
    "hash": "9a0eeafb487f1b9598b9358d310252c6124ac9d4ab6aa1af396dee6db9da8d05"
  },
  "/how": {
    "modified": "2026-10-06T18:22:26+09:00",
    "hash": "06a38f9acc47523422a4850ce5d1c4efed4ae9d3377c8d051aed41a009777a3e"
  },
  "/terms": {
    "modified": "2026-10-06T18:22:26+09:00",
    "hash": "767dddfe8d30309f3f7c94b62d38f96df9650c2f66612d412dd99798040d8688"
  },
  "/login": {
    "modified": "2026-10-06T18:22:26+09:00",
    "hash": "ab0d9acd2376a1a578d3f5fa121810582ce7b1de6c6c0944c5e8db1ddfbef655"
  }
};
