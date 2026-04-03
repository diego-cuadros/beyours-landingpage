if (!customElements.get('team-directory-section')) {
  customElements.define(
    'team-directory-section',
    class TeamDirectorySection extends HTMLElement {
      constructor() {
        super();

        this.activeCell = null;
        this.activeTrigger = null;
        this.detailShell = document.createElement('div');
        this.detailShell.className = 'team-directory__detail-shell';
        this.detailShell.hidden = true;
        this.isAnimating = false;

        this.onClick = this.onClick.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onResize = this.onResize.bind(this);
      }

      connectedCallback() {
        this.detailHome = this.querySelector('[data-team-detail-home]');
        this.detailScienceHome = this.querySelector('[data-team-detail-science]');
        this.mobileBreakpoint = Number(this.dataset.mobileBreakpoint || 749);
        this.addEventListener('click', this.onClick);
        document.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('resize', this.onResize);
      }

      disconnectedCallback() {
        this.removeEventListener('click', this.onClick);
        document.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('resize', this.onResize);
      }

      onClick(event) {
        if (this.isAnimating) return;

        const closeButton = event.target.closest('[data-team-close]');
        if (closeButton) {
          event.preventDefault();
          this.closeDetail();
          return;
        }

        const trigger = event.target.closest('[data-member-trigger]');
        if (!trigger || !this.contains(trigger)) return;

        const cell = trigger.closest('[data-member-cell]');
        if (!cell) return;

        event.preventDefault();

        if (this.activeCell === cell) {
          this.closeDetail();
          return;
        }

        this.openDetail(cell, trigger);
      }

      onKeyDown(event) {
        if (event.key === 'Escape' && this.activeCell && !this.isAnimating) {
          this.closeDetail();
        }
      }

      onResize() {
        if (!this.activeCell || !this.activeTrigger) return;
        this.placeDetail(this.activeCell);
      }

      openDetail(cell, trigger) {
        const template = cell.querySelector('[data-member-template]');
        if (!template) return;

        this.detailShell.classList.remove('is-entering', 'is-exiting');
        this.detailShell.innerHTML = template.innerHTML;
        this.detailShell.hidden = false;

        if (this.activeTrigger) {
          this.activeTrigger.setAttribute('aria-expanded', 'false');
        }

        if (this.activeCell) {
          this.activeCell.classList.remove('is-active');
        }

        this.activeCell = cell;
        this.activeTrigger = trigger;
        this.activeCell.classList.add('is-active');
        this.activeTrigger.setAttribute('aria-expanded', 'true');

        this.placeDetail(cell);

        requestAnimationFrame(() => {
          this.detailShell.classList.add('is-entering');

          const onEnd = () => {
            this.detailShell.classList.remove('is-entering');
            this.detailShell.removeEventListener('animationend', onEnd);
          };
          this.detailShell.addEventListener('animationend', onEnd);

          this.detailShell.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      }

      placeDetail(cell) {
        const grid = cell.closest('[data-team-grid]');
        if (!grid) return;

        const isScience = grid.dataset.teamGrid === 'science';

        if (isScience && this.detailScienceHome) {
          this.detailScienceHome.insertAdjacentElement('afterend', this.detailShell);
        } else if (this.detailHome) {
          this.detailHome.insertAdjacentElement('afterend', this.detailShell);
        }
      }

      closeDetail() {
        if (!this.activeCell) return;

        const returnFocus = this.activeTrigger;

        if (this.activeTrigger) {
          this.activeTrigger.setAttribute('aria-expanded', 'false');
        }
        if (this.activeCell) {
          this.activeCell.classList.remove('is-active');
        }

        this.activeTrigger = null;
        this.activeCell = null;
        this.isAnimating = true;

        this.detailShell.classList.remove('is-entering');
        this.detailShell.classList.add('is-exiting');

        const onEnd = () => {
          this.detailShell.classList.remove('is-exiting');
          this.detailShell.hidden = true;
          this.detailShell.innerHTML = '';
          this.isAnimating = false;

          if (this.detailHome) {
            this.detailHome.insertAdjacentElement('afterend', this.detailShell);
          }

          this.detailShell.removeEventListener('animationend', onEnd);
        };
        this.detailShell.addEventListener('animationend', onEnd);

        if (returnFocus) {
          returnFocus.focus({ preventScroll: true });
        }
      }
    }
  );
}
