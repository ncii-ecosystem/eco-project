(function () {
  "use strict";
  const devices = window.matchMedia(
    "(max-width: 900px), (hover: none) and (pointer: coarse)",
  );
  const notice = document.getElementById("desktop-only-notice");
  window.StoryDevice = { mobile: devices.matches };
  notice.inert = !devices.matches;
  if (devices.matches) {
    Array.from(document.body.children).forEach((node) => {
      if (node !== notice && !node.classList.contains("site-topnav"))
        node.inert = true;
    });
    notice.focus({ preventScroll: true });
    window.storyReady = Promise.resolve();
  } else {
    const sources = [
      "/src/story/navigation.js?v=1",
      "/src/story/scenes.js?v=102",
      "/src/story/main.js?v=127",
      "/src/story/motion.js?v=62",
      "/src/story/windows.js?v=4",
      "/src/story/finale.js?v=21",
    ];
    window.storyReady = Promise.all(
      sources.map(
        (src) =>
          new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = src;
            script.async = false;
            script.onload = resolve;
            script.onerror = () =>
              reject(new Error("Could not load the story: " + src));
            document.body.appendChild(script);
          }),
      ),
    );
  }
  devices.addEventListener("change", () => window.location.reload());
})();
