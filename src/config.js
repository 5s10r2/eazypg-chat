// ─── Config ───
export const ACCOUNT_VALUES = {
  pg_ids: [
    "l5zf3ckOnRQV9OHdv5YTTXkvLHp1",
    "egu5HmrYFMP8MRJyMsefnpaL7ka2",
    "Z2wyLOXXp5QA596DQ6aZAQpakmQ2",
    "UaDCGP3dzzZRgVIzBDgXb5ry5ng2",
    "EqhTMiUNksgXh5QhGQRsY5DQiO42",
    "fzDBxYtHgVV21ertfkUdSHeomiv2",
    "CUxtdeaGxYS8IMXmGZ1yUnqyfOn2",
    "wtlUSKV9H8bkNqvlGmnogwoqwyk2",
    "1Dy0t6YeIHh3kQhqvQR8tssHWKt1",
    "U2uYCaeiCebrE95iUDsS4PwEd1J2"
  ],
  brand_name: "OxOtel",
  cities: "Mumbai",
  areas: "Andheri, Kurla, Powai"
};

// ─── State ───
export let userId = localStorage.getItem("eazypg_user_id");
export let _carouselSeq = 0;
if (!userId) {
  userId = "uat_" + Math.random().toString(36).slice(2, 10);
  localStorage.setItem("eazypg_user_id", userId);
}
export let isWaiting  = false;
export let firstRequest = true;
export let chatHistory = [];

export function setIsWaiting(val) { isWaiting = val; }
export function setFirstRequest(val) { firstRequest = val; }
export function setChatHistory(val) { chatHistory = val; }
export function nextCarouselSeq() { return ++_carouselSeq; }
export function resetCarouselSeq() { _carouselSeq = 0; }
