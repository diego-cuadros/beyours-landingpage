if (!customElements.get('active-ingredients-v2-component')) {
  class ActiveIngredientsV2Component extends HTMLElement {
    constructor() {
      super();

      this.slider = this.querySelector('[id^="ActiveIngredients-"]');
      this.slides = Array.from(this.querySelectorAll('[id^="Slide-"]'));
      this.dots = Array.from(this.querySelectorAll('.active-ingredients-v2__dot'));
      this.mobileMedia = window.matchMedia('(max-width: 749px)');
      this.mobileCarouselEnabled = this.dataset.mobileCarousel === 'true';
      this.currentIndex = 0;
      this.flickity = null;
      this.scrollFrame = null;
      this.boundDotHandlers = [];
      this.boundMediaChange = this.handleViewportChange.bind(this);
      this.boundScroll = this.handleScroll.bind(this);
    }

    connectedCallback() {
      if (!this.slider || this.slides.length === 0) return;

      this.bindDots();

      if (this.mobileMedia.addEventListener) {
        this.mobileMedia.addEventListener('change', this.boundMediaChange);
      } else {
        this.mobileMedia.addListener(this.boundMediaChange);
      }

      if (this.mobileCarouselEnabled) {
        this.updateState(0);
      }

      this.handleViewportChange();
    }

    disconnectedCallback() {
      this.destroySlider();
      this.disableScrollFallback();

      this.boundDotHandlers.forEach(({ dot, handler }) => {
        dot.removeEventListener('click', handler);
      });
      this.boundDotHandlers = [];

      if (this.mobileMedia.removeEventListener) {
        this.mobileMedia.removeEventListener('change', this.boundMediaChange);
      } else {
        this.mobileMedia.removeListener(this.boundMediaChange);
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
      if (!this.mobileCarouselEnabled) {
        this.destroySlider();
        this.disableScrollFallback();
        this.classList.remove('is-mobile-carousel');
        return;
      }

      const shouldUseSlider = this.mobileMedia.matches && this.slides.length > 1 && typeof window.Flickity !== 'undefined';

      if (shouldUseSlider) {
        this.disableScrollFallback();
        this.initSlider();
        return;
      }

      this.destroySlider();

      if (this.mobileMedia.matches) {
        this.enableScrollFallback();
      } else {
        this.disableScrollFallback();
      }

      this.classList.remove('is-mobile-carousel');
      this.updateState(0);
    }

    initSlider() {
      if (this.flickity || !this.slider) return;

      this.classList.add('is-mobile-carousel');
      this.flickity = new window.Flickity(this.slider, {
        accessibility: false,
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
      });

      this.flickity.on('change', (index) => {
        this.currentIndex = index;
        this.updateState(index);
      });

      this.flickity.on('settle', () => {
        this.currentIndex = this.flickity.selectedIndex || 0;
        this.updateState(this.currentIndex);
      });
    }

    destroySlider() {
      if (!this.flickity) return;

      this.flickity.destroy();
      this.flickity = null;
      this.classList.remove('is-mobile-carousel');
      this.resetSlideState();
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

      if (!this.mobileCarouselEnabled) return;

      const targetSlide = this.slides[index];
      if (!targetSlide) return;

      this.currentIndex = index;
      this.updateState(index);
      this.slider.scrollTo({ left: targetSlide.offsetLeft, behavior: 'smooth' });
    }

    updateState(activeIndex) {
      if (activeIndex < 0 || activeIndex >= this.slides.length) return;

      this.currentIndex = activeIndex;
      this.resetSlideState();

      const activeSlide = this.slides[activeIndex];
      if (activeSlide) {
        activeSlide.classList.add('is-selected');
      }

      if (this.slides.length > 1) {
        this.slides[this.getWrappedIndex(activeIndex + 1)].classList.add('is-next');
        this.slides[this.getWrappedIndex(activeIndex - 1)].classList.add('is-previous');
      }

      this.dots.forEach((dot, index) => {
        const isActive = index === activeIndex;
        dot.classList.toggle('is-active', isActive);
        dot.setAttribute('aria-current', isActive ? 'true' : 'false');
      });
    }

    resetSlideState() {
      this.slides.forEach((slide) => slide.classList.remove('is-selected', 'is-next', 'is-previous'));
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

    getWrappedIndex(index) {
      if (!this.slides.length) return 0;
      return (index + this.slides.length) % this.slides.length;
    }
  }

  customElements.define('active-ingredients-v2-component', ActiveIngredientsV2Component);
}
