(function () {
  var sectionSelector = '[data-delivery-difference]';
  var reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var observedSections = new WeakSet();
  var activeSections = new Set();
  var animationFrame = null;
  var sectionObserver = null;
  var cardObserver = null;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function updateSectionProgress(section) {
    if (!section || reduceMotionQuery.matches) {
      return;
    }

    var rect = section.getBoundingClientRect();
    var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    var start = viewportHeight * 0.88;
    var end = viewportHeight * 0.2;
    var progress = clamp((start - rect.top) / (start - end), 0, 1);

    section.style.setProperty('--delivery-progress', progress.toFixed(4));
  }

  function runProgressLoop() {
    animationFrame = null;

    activeSections.forEach(function (section) {
      updateSectionProgress(section);
    });

    if (activeSections.size > 0) {
      animationFrame = window.requestAnimationFrame(runProgressLoop);
    }
  }

  function ensureProgressLoop() {
    if (animationFrame !== null || reduceMotionQuery.matches || activeSections.size === 0) {
      return;
    }

    animationFrame = window.requestAnimationFrame(runProgressLoop);
  }

  function setupObservers() {
    if (!sectionObserver) {
      sectionObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            var section = entry.target;

            if (entry.isIntersecting) {
              section.classList.add('is-visible');
              activeSections.add(section);
              updateSectionProgress(section);
              ensureProgressLoop();
            } else {
              activeSections.delete(section);
            }
          });

          if (activeSections.size === 0 && animationFrame !== null) {
            window.cancelAnimationFrame(animationFrame);
            animationFrame = null;
          }
        },
        {
          threshold: 0.12,
          rootMargin: '0px 0px -8% 0px'
        }
      );
    }

    if (!cardObserver) {
      cardObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              cardObserver.unobserve(entry.target);
            }
          });
        },
        {
          threshold: 0.2,
          rootMargin: '0px 0px -10% 0px'
        }
      );
    }
  }

  function initSection(section) {
    if (!section || observedSections.has(section)) {
      return;
    }

    observedSections.add(section);

    if (reduceMotionQuery.matches) {
      section.classList.add('is-visible');
      section.style.setProperty('--delivery-progress', '1');
      section.querySelectorAll('[data-delivery-card]').forEach(function (card) {
        card.classList.add('is-visible');
      });
      return;
    }

    setupObservers();
    sectionObserver.observe(section);

    section.querySelectorAll('[data-delivery-card]').forEach(function (card) {
      cardObserver.observe(card);
    });
  }

  function initAllSections(root) {
    var scope = root || document;
    scope.querySelectorAll(sectionSelector).forEach(initSection);
  }

  function handleReducedMotionChange(event) {
    if (event.matches) {
      activeSections.forEach(function (section) {
        section.style.setProperty('--delivery-progress', '1');
        section.classList.add('is-visible');
      });

      document.querySelectorAll(sectionSelector + ' [data-delivery-card]').forEach(function (card) {
        card.classList.add('is-visible');
      });

      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }

      activeSections.clear();
      return;
    }

    document.querySelectorAll(sectionSelector).forEach(function (section) {
      section.style.setProperty('--delivery-progress', '0');
      updateSectionProgress(section);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initAllSections(document);
    });
  } else {
    initAllSections(document);
  }

  document.addEventListener('shopify:section:load', function (event) {
    initAllSections(event.target);
  });

  if (typeof reduceMotionQuery.addEventListener === 'function') {
    reduceMotionQuery.addEventListener('change', handleReducedMotionChange);
  } else if (typeof reduceMotionQuery.addListener === 'function') {
    reduceMotionQuery.addListener(handleReducedMotionChange);
  }
})();
