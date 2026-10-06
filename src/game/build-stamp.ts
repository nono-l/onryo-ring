/*
  タイトルに出すビルド時刻。日本時間。実行のたびに now を取らない。
*/
export const BUILD_STAMP: string = import.meta.env.VITE_BUILD_STAMP;
