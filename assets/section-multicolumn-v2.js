if (!customElements.get('multicolumn-v2-component')) {
  class MulticolumnV2Component extends HTMLElement {
    constructor() {
      super();

      this.slider = this.querySelector('[id^="Slider-"]');
      this.slides = Array.from(this.querySelectorAll('[id^="Slide-"]'));
      this.cards = Array.from(this.querySelectorAll('.multicolumn-card'));
      this.dots = Array.from(this.querySelectorAll('.multicolumn-v2__dot'));
      this.mobileMedia = window.matchMedia('(max-width: 749px)');
      this.matchCardHeights = this.dataset.matchCardHeights !== 'false';
      this.matchCardHeightsMobile = this.dataset.matchCardHeightsMobile === 'true';
      this.squareCardsDesktop = this.dataset.squareCardsDesktop === 'true';
      this.squareCardsMobile = this.dataset.squareCardsMobile === 'true';
      this.currentIndex = 0;
      this.flickity = null;
      this.scrollFrame = null;
      this.resizeFrame = null;
      this.mediaNodes = [];
      this.boundDotHandlers = [];
      this.boundMediaChange = this.handleViewportChange.bind(this);
      this.boundScroll = this.handleScroll.bind(this);
      this.boundResize = this.scheduleSyncCardHeights.bind(this);
      this.boundMediaLoad = this.scheduleSyncCardHeights.bind(this);
    }

    connectedCallback() {
      if (!this.slider || this.slides.length === 0) return;

      this.mediaNodes = Array.from(this.querySelectorAll('img, video'));

      if (this.mobileMedia.addEventListener) {
        this.mobileMedia.addEventListener('change', this.boundMediaChange);
      } else {
        this.mobileMedia.addListener(this.boundMediaChange);
      }

      window.addEventListener('resize', this.boundResize);

      this.mediaNodes.forEach((node) => {
        const eventName = node.tagName === 'VIDEO' ? 'loadeddata' : 'load';
        node.addEventListener(eventName, this.boundMediaLoad);
      });

      this.bindDots();
      this.updateState(0);
      this.handleViewportChange();
      this.scheduleSyncCardHeights();
    }

    disconnectedCallback() {
      this.destroySlider();
      this.disableScrollFallback();

      if (this.mobileMedia.removeEventListener) {
        this.mobileMedia.removeEventListener('change', this.boundMediaChange);
      } else {
        this.mobileMedia.removeListener(this.boundMediaChange);
      }

      window.removeEventListener('resize', this.boundResize);

      this.mediaNodes.forEach((node) => {
        const eventName = node.tagName === 'VIDEO' ? 'loadeddata' : 'load';
        node.removeEventListener(eventName, this.boundMediaLoad);
      });

      this.boundDotHandlers.forEach(({ dot, handler }) => {
        dot.removeEventListener('click', handler);
      });
      this.boundDotHandlers = [];

      if (this.resizeFrame) {
        cancelAnimationFrame(this.resizeFrame);
        this.resizeFrame = null;
      }
    }

    bindDots() {
      this.dots.forEach((dot, index) => {
        const handler = () => this.goToIndex(index);
        this.boundDotHandlers.push({ dot, handler });
        dot.addEventListener('click', handler);
      });
    }

    handleViewportChange() {
      const shouldUseSlider = this.mobileMedia.matches && this.slides.length > 1 && typeof window.Flickity !== 'undefined';

      if (shouldUseSlider) {
        this.disableScrollFallback();
        this.initSlider();
      } else {
        this.destroySlider();

        if (this.mobileMedia.matches && this.slides.length > 1) {
          this.enableScrollFallback();
        } else {
          this.disableScrollFallback();
        }

        this.updateState(0);
      }

      this.scheduleSyncCardHeights();
    }

    initSlider() {
      if (this.flickity || !this.slider) return;

      this.classList.add('is-mobile-slider');
      this.flickity = new window.Flickity(this.slider, {
        accessibility: false,
        adaptiveHeight: !(this.matchCardHeightsMobile || this.squareCardsMobile),
        rightToLeft: window.theme && window.theme.config ? window.theme.config.rtl : false,
        prevNextButtons: false,
        pageDots: false,
        wrapAround: true,
        draggable: true,
        cellAlign: 'center',
        contain: false,
        selectedAttraction: 0.18,
        friction: 0.82
      });

      this.flickity.on('ready', () => {
        this.currentIndex = this.flickity.selectedIndex || 0;
        this.updateState(this.currentIndex);
        this.scheduleSyncCardHeights();
      });

      this.flickity.on('change', (index) => {
        this.currentIndex = index;
        this.updateState(index);
      });

      this.flickity.on('settle', () => {
        this.currentIndex = this.flickity.selectedIndex || 0;
        this.updateState(this.currentIndex);
        this.scheduleSyncCardHeights();
      });
    }

    destroySlider() {
      if (!this.flickity) {
        this.classList.remove('is-mobile-slider');
        return;
      }

      this.flickity.destroy();
      this.flickity = null;
      this.classList.remove('is-mobile-slider');
      this.slides.forEach((slide) => slide.classList.remove('is-selected', 'is-next', 'is-previous'));
    }

    enableScrollFallback() {
      this.slider.removeEventListener('scroll', this.boundScroll);
      this.slider.addEventListener('scroll', this.boundScroll, { passive: true });
    }

    disableScrollFallback() {
      if (!this.slider) return;

      this.slider.removeEventListener('scroll', this.boundScroll);

      if (this.scrollFrame) {
        cancelAnimationFrame(this.scrollFrame);
        this.scrollFrame = null;
      }
    }

    handleScroll() {
      if (this.flickity) return;

      if (this.scrollFrame) {
        cancelAnimationFrame(this.scrollFrame);
      }

      this.scrollFrame = requestAnimationFrame(() => {
        this.scrollFrame = null;
        this.currentIndex = this.getClosestSlideIndex();
        this.updateState(this.currentIndex);
      });
    }

    goToIndex(index) {
      if (index < 0 || index >= this.slides.length) return;

      if (this.flickity) {
        this.flickity.select(index);
        return;
      }

      const targetSlide = this.slides[index];
      if (!targetSlide) return;

      this.currentIndex = index;
      this.updateState(index);
      this.slider.scrollTo({ left: targetSlide.offsetLeft, behavior: 'smooth' });
    }

    updateState(activeIndex) {
      if (activeIndex < 0 || activeIndex >= this.slides.length) return;

      this.currentIndex = activeIndex;
      const totalSlides = this.slides.length;
      const hasWrapAround = Boolean(this.flickity);
      const previousIndex =
        totalSlides > 1
          ? activeIndex === 0
            ? hasWrapAround
              ? totalSlides - 1
              : -1
            : activeIndex - 1
          : -1;
      const nextIndex =
        totalSlides > 1
          ? activeIndex === totalSlides - 1
            ? hasWrapAround
              ? 0
              : -1
            : activeIndex + 1
          : -1;

      this.slides.forEach((slide, index) => {
        slide.classList.toggle('is-selected', index === activeIndex);
        slide.classList.toggle('is-previous', index === previousIndex);
        slide.classList.toggle('is-next', index === nextIndex);
      });

      this.dots.forEach((dot, index) => {
        const isActive = index === activeIndex;
        dot.classList.toggle('is-active', isActive);
        dot.setAttribute('aria-current', isActive ? 'true' : 'false');
      });
    }

    getClosestSlideIndex() {
      const scrollLeft = this.slider.scrollLeft;
      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      this.slides.forEach((slide, index) => {
        const distance = Math.abs(slide.offsetLeft - scrollLeft);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      return closestIndex;
    }

    scheduleSyncCardHeights() {
      if (this.resizeFrame) {
        cancelAnimationFrame(this.resizeFrame);
      }

      this.resizeFrame = requestAnimationFrame(() => {
        this.resizeFrame = null;
        this.syncCardHeights();
      });
    }

    syncCardHeights() {
      this.style.removeProperty('--multicolumn-v2-equal-card-height');

      const isMobile = this.mobileMedia.matches;
      const shouldSync = isMobile ? this.matchCardHeightsMobile : this.matchCardHeights;
      const hasSquareCards = isMobile ? this.squareCardsMobile : this.squareCardsDesktop;

      if (hasSquareCards || !shouldSync || this.cards.length === 0) {
        return;
      }

      let maxHeight = 0;

      this.cards.forEach((card) => {
        maxHeight = Math.max(maxHeight, card.offsetHeight);
      });

      if (maxHeight > 0) {
        this.style.setProperty('--multicolumn-v2-equal-card-height', `${maxHeight}px`);
      }
    }
  }

  customElements.define('multicolumn-v2-component', MulticolumnV2Component);
}
