const carousel = document.querySelector("[data-impact-carousel]");
const track = carousel.querySelector("[data-carousel-track]");
const photos = track.querySelectorAll("[data-carousel-photo]");
const controls = carousel.querySelector("[data-carousel-controls]");

for (const button of controls.querySelectorAll("[data-carousel-step]")) {
  button.addEventListener("click", () => {
    const current = Math.round(track.scrollLeft / track.clientWidth);
    const step = Number(button.dataset.carouselStep);
    const next = (current + step + photos.length) % photos.length;
    track.scrollTo({ left: next * track.clientWidth });
  });
}

controls.hidden = false;
