if (!customElements.get('carousel-component')) {
  class CarouselComponent extends HTMLElement {
    constructor() {
      super();
      this.track = this.querySelector('.carousel__track');
      this.indicators = Array.from(this.querySelectorAll('.carousel__indicator'));
      this.slides = Array.from(this.querySelectorAll('.carousel__slide'));
      this.statusElement = this.querySelector('.carousel__status');
      this.mobileMedia = window.matchMedia('(max-width: 749px)');
      this.handleViewportChange = this.handleViewportChange.bind(this);
      this.boundIndicatorHandlers = [];
      this.boundMouseEnter = this.stopAutorotate.bind(this);
      this.boundMouseLeave = this.startAutorotate.bind(this);
      this.boundTouchStart = this.stopAutorotate.bind(this);
    }

    connectedCallback() {
      this.bindEvents();
      this.autorotate = this.dataset.autorotate === 'true';
      this.autorotateSpeed = parseInt(this.dataset.autorotateSpeed || '5000', 10);
      this.currentIndex = 0;

      if (this.autorotate) {
        this.addEventListener('mouseenter', this.boundMouseEnter);
        this.addEventListener('mouseleave', this.boundMouseLeave);
        this.track && this.track.addEventListener('touchstart', this.boundTouchStart, { passive: true });
      }

      if (this.mobileMedia.addEventListener) {
        this.mobileMedia.addEventListener('change', this.handleViewportChange);
      } else {
        this.mobileMedia.addListener(this.handleViewportChange);
      }

      this.handleViewportChange();
    }

    handleViewportChange() {
      const shouldUseSlider = this.mobileMedia.matches && this.slides.length > 1 && typeof window.Flickity !== 'undefined';

      this.classList.toggle('is-mobile-slider', shouldUseSlider);

      if (shouldUseSlider) {
        this.initSlider();
      } else {
        this.destroySlider();
        this.updateStaticSelection(this.currentIndex);
        this.updateIndicators(this.currentIndex);
      }
    }

    bindEvents() {
      this.indicators.forEach((indicator, index) => {
        const handler = () => {
          if (this.flickity) {
            this.flickity.select(index);
            return;
          }

          this.scrollToSlide(index);
        };

        this.boundIndicatorHandlers.push({ indicator, handler });
        indicator.addEventListener('click', handler);
      });
    }

    initSlider() {
      if (!this.track || this.flickity) return;

      this.flickity = new window.Flickity(this.track, {
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
        this.updateIndicators(this.currentIndex);
        this.startAutorotate();
      });

      this.flickity.on('change', (index) => {
        this.currentIndex = index;
        this.updateIndicators(index);
      });

      this.flickity.on('settle', () => {
        this.currentIndex = this.flickity.selectedIndex || 0;
        this.updateIndicators(this.currentIndex);
      });
    }

    destroySlider() {
      if (!this.flickity) return;

      this.stopAutorotate();
      this.flickity.destroy();
      this.flickity = null;
      this.slides.forEach((slide) => slide.classList.remove('is-selected', 'is-next', 'is-previous'));
    }

    startAutorotate() {
      if (!this.autorotate || !this.flickity || this.slides.length < 2 || !this.mobileMedia.matches) return;

      this.stopAutorotate();
      this.interval = setInterval(() => {
        if (!this.flickity) return;

        const nextIndex = this.currentIndex + 1;
        if (nextIndex >= this.slides.length) {
          this.currentIndex = 0;
          this.flickity.select(0, false, true);
          this.updateIndicators(0);
          return;
        }

        this.flickity.select(nextIndex);
      }, this.autorotateSpeed);
    }

    stopAutorotate() {
      if (this.interval) {
        clearInterval(this.interval);
        this.interval = null;
      }
    }

    scrollToSlide(index) {
      if (!this.track || !this.slides[index]) return;

      this.currentIndex = index;
      this.updateStaticSelection(index);
      this.updateIndicators(index);

      const slide = this.slides[index];
      slide.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }

    updateStaticSelection(activeIndex) {
      this.slides.forEach((slide, index) => {
        slide.classList.toggle('is-selected', index === activeIndex);
      });
    }

    updateIndicators(activeIndex) {
      if (activeIndex === -1 || !this.slides.length) return;

      if (this.indicators.length) {
        this.indicators.forEach((indicator, index) => {
          if (index === activeIndex) {
            indicator.classList.add('is-active');
            indicator.setAttribute('aria-selected', 'true');
          } else {
            indicator.classList.remove('is-active');
            indicator.setAttribute('aria-selected', 'false');
          }
        });
      }

      if (this.statusElement && this.slides.length) {
        this.statusElement.textContent = `Slide ${activeIndex + 1} of ${this.slides.length}`;
      }
    }

    disconnectedCallback() {
      this.destroySlider();
      this.stopAutorotate();

      this.boundIndicatorHandlers.forEach(({ indicator, handler }) => {
        indicator.removeEventListener('click', handler);
      });
      this.boundIndicatorHandlers = [];

      if (this.autorotate) {
        this.removeEventListener('mouseenter', this.boundMouseEnter);
        this.removeEventListener('mouseleave', this.boundMouseLeave);
        this.track && this.track.removeEventListener('touchstart', this.boundTouchStart);
      }

      if (this.mobileMedia.removeEventListener) {
        this.mobileMedia.removeEventListener('change', this.handleViewportChange);
      } else {
        this.mobileMedia.removeListener(this.handleViewportChange);
      }
    }
  }

  customElements.define('carousel-component', CarouselComponent);
}
