const EASE = "cubic-bezier(0.65, 0, 0.35, 1)";

const PAIRS = {
  "article-image": [".card__figure", ".hero"],
  "article-title": [".card__title", ".article__title"],
};

function init() {
  const listView = document.getElementById("list");
  const articleView = document.getElementById("article");
  if (!listView || !articleView) return;

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let busy = false;

  function commit(hide, show, { focus = true } = {}) {
    hide.classList.remove("is-active");
    hide.setAttribute("aria-hidden", "true");
    show.classList.add("is-active");
    show.removeAttribute("aria-hidden");
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    if (focus) {
      const target = show === articleView
        ? show.querySelector(".article__title")
        : document.getElementById("toArticle");
      if (target) {
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      }
    }
  }

  function measure(view) {
    const rects = {};
    for (const [name, sels] of Object.entries(PAIRS)) {
      for (const sel of sels) {
        const el = view.querySelector(sel);
        if (el) {
          rects[name] = el.getBoundingClientRect();
          break;
        }
      }
    }
    return rects;
  }

  function flip(hide, show) {
    const first = measure(hide);
    commit(hide, show);
    const last = measure(show);
    const anims = [];

    for (const name of Object.keys(PAIRS)) {
      const a = first[name];
      const b = last[name];
      if (!a || !b || !b.width || !b.height) continue;

      const el = PAIRS[name].map((s) => show.querySelector(s)).find(Boolean);
      if (!el) continue;

      const dx = a.left - b.left;
      const dy = a.top - b.top;
      const sx = a.width / b.width;
      const sy = a.height / b.height;
      if (!isFinite(sx) || !isFinite(sy) || sx <= 0 || sy <= 0) continue;

      const isTitle = name === "article-title";
      const prevOrigin = el.style.transformOrigin;
      el.style.transformOrigin = "top left";

      anims.push(
        el.animate(
          [
            { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${isTitle ? sx : sy})` },
            { transform: "none" },
          ],
          { duration: 620, easing: EASE, fill: "both" }
        ).finished.then(() => {
          el.style.transformOrigin = prevOrigin;
        })
      );
    }

    const body = show.querySelector(
      show === articleView ? ".article__content" : ".card__body"
    );

    if (body) {
      anims.push(
        body.animate(
          [
            { opacity: 0, transform: "translateY(28px)" },
            { opacity: 1, transform: "none" },
          ],
          { duration: 500, delay: 60, easing: EASE, fill: "backwards" }
        ).finished
      );
    }

    return Promise.allSettled(anims);
  }

  function swap(hide, show) {
    if (busy) return;
    busy = true;
    const done = () => { busy = false; };

    if (reduced) {
      commit(hide, show);
      done();
      return;
    }

    if (document.startViewTransition) {
      document.startViewTransition(() => commit(hide, show)).finished.then(done, done);
    } else {
      flip(hide, show).then(done, done);
    }
  }

  const toArticle = document.getElementById("toArticle");
  const toList = document.getElementById("toList");

  function openArticle({ push = true } = {}) {
    if (push) history.pushState({ view: "article" }, "", "#article");
    swap(listView, articleView);
  }

  function openList({ push = true } = {}) {
    if (push) history.pushState({ view: "list" }, "", location.pathname);
    swap(articleView, listView);
  }

  toArticle.addEventListener("click", () => openArticle());
  toList.addEventListener("click", () => openList());

  addEventListener("popstate", () => {
    const wantsArticle = location.hash === "#article";
    const articleActive = articleView.classList.contains("is-active");
    if (wantsArticle && !articleActive) openArticle({ push: false });
    if (!wantsArticle && articleActive) openList({ push: false });
  });

  addEventListener("keydown", (event) => {
    if (event.key === "Escape" && articleView.classList.contains("is-active")) {
      history.back();
    }
  });

  if (location.hash === "#article") {
    commit(listView, articleView, { focus: false });
  } else {
    history.replaceState({ view: "list" }, "", location.pathname);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
