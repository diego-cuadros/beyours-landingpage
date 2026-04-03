if (!customElements.get('subscription-grid-tabs')) {
  customElements.define('subscription-grid-tabs', class SubscriptionGridTabs extends HTMLElement {
    constructor() {
      super();
      this.fakeTabs = [];
      this.realDetails = [];
      this.realSummaries = [];
    }

    connectedCallback() {
      this.fakeTabs = Array.from(this.querySelectorAll('.fake-tab-item'));
      this.realDetails = Array.from(this.querySelectorAll('.tabs-grid details'));
      this.realSummaries = Array.from(this.querySelectorAll('.tabs-grid details > summary'));

      if (this.realDetails.length === 0) return;

      this.ensureActiveTab();
      this.setupFakeTabs();
      this.setupRealDetails();
    }

    setupFakeTabs() {
      this.fakeTabs.forEach((fakeTab) => {
        fakeTab.addEventListener('click', this.handleFakeTabClick.bind(this));
      });
    }

    setupRealDetails() {
      this.realDetails.forEach((details) => {
        details.addEventListener('toggle', this.handleDetailsToggle.bind(this));
      });

      this.realSummaries.forEach((summary) => {
        summary.addEventListener('click', this.handleSummaryClick.bind(this));
      });
    }

    ensureActiveTab() {
      const openDetails = this.realDetails.find((details) => details.open) || this.realDetails[0];
      if (!openDetails) return;

      openDetails.open = true;
      const detailsIndex = parseInt(openDetails.style.getPropertyValue('--tab-index'), 10);
      this.setActiveTab(detailsIndex);
    }

    handleFakeTabClick(event) {
      const clickedTab = event.currentTarget;
      const tabIndex = parseInt(clickedTab.dataset.tabIndex, 10);

      this.setActiveTab(tabIndex);
      this.triggerRealTab(tabIndex);
      this.scrollTabIntoView(clickedTab);
    }

    handleSummaryClick(event) {
      const details = event.currentTarget.closest('details');
      if (!details || !details.open) return;

      event.preventDefault();
    }

    handleDetailsToggle(event) {
      const details = event.currentTarget;
      if (!details.open) return;

      const detailsIndex = parseInt(details.style.getPropertyValue('--tab-index'), 10);
      this.setActiveTab(detailsIndex);

      const activeTabs = this.querySelectorAll(`.fake-tab-item[data-tab-index="${detailsIndex}"]`);
      activeTabs.forEach((activeTab) => this.scrollTabIntoView(activeTab));
    }

    setActiveTab(index) {
      this.fakeTabs.forEach((tab) => {
        const tabIndex = parseInt(tab.dataset.tabIndex, 10);
        tab.classList.toggle('active', tabIndex === index);
      });
    }

    triggerRealTab(index) {
      const targetDetails = this.realDetails.find((details) => {
        return parseInt(details.style.getPropertyValue('--tab-index'), 10) === index;
      });

      if (targetDetails && !targetDetails.open) {
        const summary = targetDetails.querySelector('summary');
        if (summary) summary.click();
      }
    }

    scrollTabIntoView(tab) {
      const container = tab.closest('.fake-tabs-desktop, .fake-tabs-mobile');
      if (!container) return;

      const scrollLeft = tab.offsetLeft - (container.offsetWidth / 2) + (tab.offsetWidth / 2);
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  });
}

function handleSubscriptionGridAddToCart(event) {
  const button = event.target.closest('add-to-cart[data-selling-plan-id]');
  if (!button) return;

  const section = button.closest('.multicollection-subscription-grid');
  if (!section) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  const variantId = button.dataset.variantId;
  const sellingPlanId = button.dataset.sellingPlanId;
  if (!variantId || !sellingPlanId) return;

  const miniCart = document.querySelector('mini-cart');
  if (document.body.classList.contains('template-cart') || !theme.shopSettings.cartDrawer) {
    Shopify.postLink(theme.routes.cart_add_url, {
      parameters: {
        id: variantId,
        quantity: 1,
        selling_plan: sellingPlanId
      },
    });
    return;
  }

  button.setAttribute('disabled', true);
  button.classList.add('loading');
  const sections = miniCart ? miniCart.getSectionsToRender().map((item) => item.id) : [];

  const body = JSON.stringify({
    id: variantId,
    quantity: 1,
    selling_plan: sellingPlanId,
    sections,
    sections_url: window.location.pathname
  });

  fetch(`${theme.routes.cart_add_url}`, { ...fetchConfig('javascript'), body })
    .then((response) => response.json())
    .then((parsedState) => {
      if (parsedState.status === 422) {
        document.dispatchEvent(new CustomEvent('ajaxProduct:error', {
          detail: {
            errorMessage: parsedState.description
          }
        }));
      } else {
        if (miniCart) miniCart.renderContents(parsedState);

        document.dispatchEvent(new CustomEvent('ajaxProduct:added', {
          detail: {
            product: parsedState
          }
        }));
      }
    })
    .catch((error) => {
      console.error(error);
    })
    .finally(() => {
      button.classList.remove('loading');
      button.removeAttribute('disabled');
    });
}

document.addEventListener('click', handleSubscriptionGridAddToCart, true);
