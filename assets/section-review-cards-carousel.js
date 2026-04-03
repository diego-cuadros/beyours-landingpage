if (!customElements.get('review-cards-carousel')) {
  class ReviewCardsCarousel extends HTMLElement {
    constructor() {
      super();

      this.slider = this.querySelector('[id^="Slider-"]');
      this.slides = Array.from(this.querySelectorAll('[id^="Slide-"]'));
      this.cards = Array.from(this.querySelectorAll('.review-cards-carousel__card'));
      this.dots = Array.from(this.querySelectorAll('.review-cards-carousel__dot'));
      this.prevButton = this.querySelector('.review-cards-carousel__sr-controls .slider-button--prev');
      this.nextButton = this.querySelector('.review-cards-carousel__sr-controls .slider-button--next');
      this.currentPage = this.querySelector('.slider-counter--current');
      this.totalPages = this.querySelector('.slider-counter--total');
      this.mobileMedia = window.matchMedia('(max-width: 749px)');
      this.matchCardHeightsMobile = this.dataset.matchCardHeightsMobile === 'true';
      this.currentIndex = 0;
      this.flickity = null;
      this.scrollFrame = null;
      this.resizeFrame = null;
      this.mediaNodes = [];
      this.boundDotHandlers = [];
      this.boundVideoHandlers = [];
      this.boundMediaChange = this.handleViewportChange.bind(this);
      this.boundPrevClick = this.handlePreviousClick.bind(this);
      this.boundNextClick = this.handleNextClick.bind(this);
      this.boundScroll = this.handleScroll.bind(this);
      this.boundResize = this.scheduleSyncCardHeights.bind(this);
      this.boundMediaLoad = this.scheduleSyncCardHeights.bind(this);
    }

    connectedCallback() {
      if (!this.slider || this.slides.length === 0) return;

      this.mediaNodes = Array.from(this.querySelectorAll('img, video'));

      if (this.totalPages) {
        this.totalPages.textContent = String(this.slides.length);
      }

      this.bindDots();
      this.bindVideoButtons();

      if (this.prevButton) {
        this.prevButton.addEventListener('click', this.boundPrevClick);
      }

      if (this.nextButton) {
        this.nextButton.addEventListener('click', this.boundNextClick);
      }

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

      this.handleViewportChange();
      this.updateState(0);
      this.scheduleSyncCardHeights();
    }

    disconnectedCallback() {
      this.destroySlider();
      this.disableScrollFallback();

      this.boundDotHandlers.forEach(({ dot, handler }) => {
        dot.removeEventListener('click', handler);
      });
      this.boundDotHandlers = [];

      this.boundVideoHandlers.forEach(({ el, event, handler }) => {
        el.removeEventListener(event, handler);
      });
      this.boundVideoHandlers = [];

      if (this.prevButton) {
        this.prevButton.removeEventListener('click', this.boundPrevClick);
      }

      if (this.nextButton) {
        this.nextButton.removeEventListener('click', this.boundNextClick);
      }

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

      if (this.resizeFrame) {
        cancelAnimationFrame(this.resizeFrame);
        this.resizeFrame = null;
      }
    }

    bindDots() {
      this.dots.forEach((dot, index) => {
        const handler = () => this.goToIndex(index);
        dot.addEventListener('click', handler);
        this.boundDotHandlers.push({ dot, handler });
      });
    }

    bindVideoButtons() {
      const wrappers = Array.from(this.querySelectorAll('.review-cards-carousel__video-wrapper'));

      wrappers.forEach((wrapper) => {
        const video = wrapper.querySelector('video');
        const button = wrapper.querySelector('.review-cards-carousel__play-button');
        if (!video || !button) return;

        const clickHandler = (event) => {
          event.preventDefault();
          event.stopPropagation();

          const isPlaying = !video.paused && !video.ended;

          if (isPlaying) {
            video.pause();
            wrapper.classList.remove('is-playing');
            return;
          }

          this.pauseAllVideos(video);

          if (video.ended) {
            video.currentTime = 0;
          }

          video.muted = false;
          wrapper.classList.add('is-playing');
          video.play().catch(() => {
            wrapper.classList.remove('is-playing');
          });
        };

        const pauseHandler = () => wrapper.classList.remove('is-playing');
        const endedHandler = () => {
          wrapper.classList.remove('is-playing');
          video.currentTime = 0;
        };

        button.addEventListener('click', clickHandler);
        video.addEventListener('pause', pauseHandler);
        video.addEventListener('ended', endedHandler);

        this.boundVideoHandlers.push(
          { el: button, event: 'click', handler: clickHandler },
          { el: video, event: 'pause', handler: pauseHandler },
          { el: video, event: 'ended', handler: endedHandler }
        );
      });
    }

    pauseAllVideos(activeVideo = null) {
      const videos = Array.from(this.querySelectorAll('.review-cards-carousel__video-wrapper video'));

      videos.forEach((video) => {
        if (activeVideo && video === activeVideo) return;
        video.pause();

        const wrapper = video.closest('.review-cards-carousel__video-wrapper');
        if (wrapper) {
          wrapper.classList.remove('is-playing');
        }
      });
    }

    handleViewportChange() {
      const shouldUseSlider =
        this.mobileMedia.matches &&
        this.slides.length > 1 &&
        typeof window.Flickity !== 'undefined';

      if (shouldUseSlider) {
        this.disableScrollFallback();
        this.initSlider();
      } else {
        this.destroySlider();

        if (this.mobileMedia.matches) {
          this.enableScrollFallback();
        } else {
          this.disableScrollFallback();
          this.pauseAllVideos();
        }
      }

      this.updateState(this.currentIndex);
      this.scheduleSyncCardHeights();
    }

    initSlider() {
      if (this.flickity || !this.slider) return;

      this.classList.add('is-mobile-slider');
      this.flickity = new window.Flickity(this.slider, {
        accessibility: false,
        adaptiveHeight: !this.matchCardHeightsMobile,
        rightToLeft: window.theme && window.theme.config ? window.theme.config.rtl : false,
        prevNextButtons: false,
        pageDots: false,
        wrapAround: false,
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
        this.syncVideos(index);
        this.scheduleSyncCardHeights();
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
        this.clearMobileViewportHeight();
        return;
      }

      this.flickity.destroy();
      this.flickity = null;
      this.classList.remove('is-mobile-slider');
      this.clearMobileViewportHeight();
      this.slides.forEach((slide) => slide.classList.remove('is-selected', 'is-next', 'is-previous'));
    }

    enableScrollFallback() {
      this.slider.removeEventListener('scroll', this.boundScroll);
      this.slider.addEventListener('scroll', this.boundScroll, { passive: true });
    }

    disableScrollFallback() {
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
        this.syncVideos(this.currentIndex);
      });
    }

    handlePreviousClick(event) {
      event.preventDefault();

      if (this.flickity) {
        this.flickity.previous();
        return;
      }

      this.goToIndex(Math.max(0, this.currentIndex - 1));
    }

    handleNextClick(event) {
      event.preventDefault();

      if (this.flickity) {
        this.flickity.next();
        return;
      }

      this.goToIndex(Math.min(this.slides.length - 1, this.currentIndex + 1));
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
      this.syncVideos(index);
      const targetLeft = targetSlide.offsetLeft - (this.slider.clientWidth - targetSlide.clientWidth) / 2;
      this.slider.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
    }

    updateState(activeIndex) {
      if (activeIndex < 0 || activeIndex >= this.slides.length) return;

      this.currentIndex = activeIndex;
      const totalSlides = this.slides.length;
      const hasWrapAround = this.isWrapAroundEnabled();
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

      if (this.currentPage) {
        this.currentPage.textContent = String(activeIndex + 1);
      }
    }

    isWrapAroundEnabled() {
      return Boolean(this.flickity && this.flickity.options && this.flickity.options.wrapAround);
    }

    syncVideos(activeIndex) {
      const activeSlide = this.slides[activeIndex];
      const activeVideo = activeSlide ? activeSlide.querySelector('.review-cards-carousel__video-wrapper video') : null;
      this.pauseAllVideos(activeVideo);
    }

    getClosestSlideIndex() {
      const scrollLeft = this.slider.scrollLeft;
      const viewportCenter = scrollLeft + this.slider.clientWidth / 2;
      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      this.slides.forEach((slide, index) => {
        const slideCenter = slide.offsetLeft + slide.clientWidth / 2;
        const distance = Math.abs(slideCenter - viewportCenter);
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
      this.style.removeProperty('--review-cards-carousel-equal-card-height');

      if (this.cards.length === 0) {
        this.syncMobileViewportHeight();
        if (this.flickity) {
          this.flickity.resize();
        }
        return;
      }

      const isMobile = this.mobileMedia.matches;
      if (isMobile && !this.matchCardHeightsMobile) {
        if (this.flickity) {
          this.flickity.resize();
        }
        return;
      }

      let maxHeight = 0;
      this.cards.forEach((card) => {
        maxHeight = Math.max(maxHeight, card.offsetHeight);
      });

      if (maxHeight > 0) {
        this.style.setProperty('--review-cards-carousel-equal-card-height', `${maxHeight}px`);
      }

      if (this.flickity) {
        this.flickity.resize();
      }

      this.syncMobileViewportHeight();
    }

    syncMobileViewportHeight() {
      const viewport = this.slider ? this.slider.querySelector('.flickity-viewport') : null;

      if (!viewport || !this.flickity || !this.mobileMedia.matches || !this.matchCardHeightsMobile) {
        this.clearMobileViewportHeight();
        return;
      }

      let measuredHeight = 0;

      this.slides.forEach((slide) => {
        const stack = slide.querySelector('.review-cards-carousel__item-stack');
        measuredHeight = Math.max(measuredHeight, stack?.offsetHeight || slide.offsetHeight || 0);
      });

      if (measuredHeight <= 0) return;

      viewport.style.height = `${measuredHeight}px`;
      this.style.setProperty('--review-cards-carousel-mobile-height', `${measuredHeight}px`);
    }

    clearMobileViewportHeight() {
      const viewport = this.slider ? this.slider.querySelector('.flickity-viewport') : null;

      if (viewport) {
        viewport.style.removeProperty('height');
      }

      this.style.removeProperty('--review-cards-carousel-mobile-height');
    }
  }

  customElements.define('review-cards-carousel', ReviewCardsCarousel);
}
