if (!customElements.get('open-roles-board')) {
  class OpenRolesBoard extends HTMLElement {
    constructor() {
      super();
      this.onFilterClick = this.onFilterClick.bind(this);
    }

    connectedCallback() {
      this.filterButtons = Array.from(this.querySelectorAll('[data-filter-trigger]'));
      this.roleItems = Array.from(this.querySelectorAll('[data-role-item]'));
      this.emptyState = this.querySelector('[data-empty-state]');

      this.filterButtons.forEach((button) => button.addEventListener('click', this.onFilterClick));

      const activeFilter = this.querySelector('[data-filter-trigger].is-active')?.dataset.filter || 'all';
      this.applyFilter(activeFilter);
    }

    disconnectedCallback() {
      if (!this.filterButtons) return;
      this.filterButtons.forEach((button) => button.removeEventListener('click', this.onFilterClick));
    }

    onFilterClick(event) {
      event.preventDefault();
      this.applyFilter(event.currentTarget.dataset.filter || 'all');
    }

    applyFilter(filter) {
      const visibleItems = [];

      this.filterButtons.forEach((button) => {
        const isActive = (button.dataset.filter || 'all') === filter;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });

      this.roleItems.forEach((item) => {
        const matches = filter === 'all' || item.dataset.filterValue === filter;
        item.hidden = !matches;
        item.classList.remove('is-last-visible');

        if (matches) {
          visibleItems.push(item);
        }
      });

      const lastVisibleItem = visibleItems[visibleItems.length - 1];
      if (lastVisibleItem) {
        lastVisibleItem.classList.add('is-last-visible');
      }

      if (this.emptyState) {
        this.emptyState.hidden = visibleItems.length > 0;
        this.emptyState.classList.toggle('hidden', visibleItems.length > 0);
      }
    }
  }

  customElements.define('open-roles-board', OpenRolesBoard);
}
