// ─── Fullscreen Image Lightbox ───
// Helps users feel a space before visiting — swipe through property photos
// with a clean, distraction-free overlay.

let _overlay = null;
let _images = [];
let _currentIdx = 0;

function _createOverlay() {
  if (_overlay) return _overlay;
  const el = document.createElement("div");
  el.className = "lb-overlay";
  el.innerHTML = `
    <div class="lb-header">
      <span class="lb-title"></span>
      <span class="lb-counter"></span>
      <button class="lb-close" aria-label="Close">&times;</button>
    </div>
    <div class="lb-body">
      <button class="lb-arrow lb-prev" aria-label="Previous">&#8249;</button>
      <div class="lb-img-wrap"><img class="lb-img" src="" alt="" /></div>
      <button class="lb-arrow lb-next" aria-label="Next">&#8250;</button>
    </div>
  `;
  document.body.appendChild(el);

  el.querySelector(".lb-close").addEventListener("click", closeLightbox);
  el.querySelector(".lb-prev").addEventListener("click", () => _navigate(-1));
  el.querySelector(".lb-next").addEventListener("click", () => _navigate(1));
  el.addEventListener("click", e => { if (e.target === el) closeLightbox(); });

  // Keyboard navigation
  document.addEventListener("keydown", _onKey);

  // Swipe support (mobile)
  let startX = 0;
  const body = el.querySelector(".lb-body");
  body.addEventListener("touchstart", e => { startX = e.touches[0].clientX; }, { passive: true });
  body.addEventListener("touchend", e => {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) _navigate(dx < 0 ? 1 : -1);
  }, { passive: true });

  _overlay = el;
  return el;
}

function _onKey(e) {
  if (!_overlay || !_overlay.classList.contains("lb-open")) return;
  if (e.key === "Escape") closeLightbox();
  else if (e.key === "ArrowLeft") _navigate(-1);
  else if (e.key === "ArrowRight") _navigate(1);
}

function _navigate(dir) {
  _currentIdx = (_currentIdx + dir + _images.length) % _images.length;
  _updateView();
}

function _updateView() {
  if (!_overlay) return;
  const img = _overlay.querySelector(".lb-img");
  const counter = _overlay.querySelector(".lb-counter");
  const src = _images[_currentIdx]?.url || "";
  const caption = _images[_currentIdx]?.caption || "";

  img.src = src;
  img.alt = caption || "Property photo";
  counter.textContent = `${_currentIdx + 1} / ${_images.length}`;

  // Show/hide arrows for single image
  _overlay.querySelector(".lb-prev").style.display = _images.length > 1 ? "" : "none";
  _overlay.querySelector(".lb-next").style.display = _images.length > 1 ? "" : "none";
}

export function openLightbox(images, startIndex = 0, propertyName = "") {
  if (!images || !images.length) return;
  _images = images;
  _currentIdx = startIndex;

  const overlay = _createOverlay();
  overlay.querySelector(".lb-title").textContent = propertyName;
  _updateView();

  // Trigger open with a frame delay for CSS transition
  requestAnimationFrame(() => overlay.classList.add("lb-open"));
  document.body.style.overflow = "hidden";
}

export function closeLightbox() {
  if (!_overlay) return;
  _overlay.classList.remove("lb-open");
  document.body.style.overflow = "";
}
