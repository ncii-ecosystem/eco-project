/* The narrative index is independent of page position and rendering. */
(function (root) {
  "use strict";
  class StoryNavigation {
    constructor(steps, render) {
      this.steps = steps;
      this.render = render;
      this.index = -1;
    }
    get active() {
      return this.steps[this.index] || null;
    }
    goTo(target) {
      const index =
        typeof target === "number" ? target : this.steps.indexOf(target);
      if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= this.steps.length ||
        index === this.index
      )
        return false;
      this.index = index;
      this.render(this.active, index);
      return true;
    }
    move(delta) {
      return this.index >= 0 && this.goTo(this.index + delta);
    }
  }
  root.StoryNavigation = StoryNavigation;

  const scopes = [];
  root.createStoryMotionScope = function (replaying) {
    const jobs = new Map();
    let serial = 0;
    function cancel(id) {
      const job = jobs.get(id);
      if (!job) return;
      job.cancel(job.handle);
      jobs.delete(id);
    }
    function schedule(fn, ms, kind) {
      if (replaying()) {
        fn(performance.now() + 1e6);
        return 0;
      }
      const repeat = kind === "interval";
      const invoke = (value) => {
        if (!repeat) jobs.delete(id);
        fn(value);
      };
      const start =
        kind === "frame"
          ? window.requestAnimationFrame
          : repeat
            ? window.setInterval
            : window.setTimeout;
      const stop =
        kind === "frame"
          ? window.cancelAnimationFrame
          : repeat
            ? window.clearInterval
            : window.clearTimeout;
      const id = ++serial;
      const handle = start.call(window, invoke, ms);
      jobs.set(id, { handle, cancel: stop.bind(window) });
      return id;
    }
    const scope = {
      setTimeout: (fn, ms) => schedule(fn, ms, "timeout"),
      setInterval: (fn, ms) => schedule(fn, ms, "interval"),
      requestAnimationFrame: (fn) => schedule(fn, 0, "frame"),
      clearTimeout: cancel,
      clearInterval: cancel,
      cancelAnimationFrame: cancel,
      cancel() {
        for (const id of jobs.keys()) cancel(id);
      },
    };
    scopes.push(scope);
    return scope;
  };
  root.cancelStoryMotion = () => scopes.forEach((scope) => scope.cancel());
})(typeof window === "undefined" ? globalThis : window);
