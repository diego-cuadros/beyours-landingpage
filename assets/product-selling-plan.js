if (!customElements.get('selling-plan-picker')) {
  customElements.define(
    'selling-plan-picker',
    class SellingPlanPicker extends HTMLElement {
      connectedCallback() {
        this.modeInputs = Array.from(this.querySelectorAll('.product-selling-plan__mode-input'));
        this.hiddenInputs = Array.from(this.querySelectorAll('.product-selling-plan__hidden-input'));
        this.planSelect = this.querySelector('[data-selling-plan-select]');
        this.modeTabs = Array.from(this.querySelectorAll('[data-mode-tab]'));
        this.modePanels = Array.from(this.querySelectorAll('[data-mode-panel]'));
        this.priceNode = this.querySelector('[data-selling-plan-price]');
        this.comparePriceNode = this.querySelector('[data-selling-plan-compare-price]');
        this.badgeNode = this.querySelector('[data-selling-plan-badge]');
        this.priceContainers = Array.from(
          document.querySelectorAll(`[id="price-${this.dataset.sectionId}"], [id="Price-Alt-${this.dataset.sectionId}"]`)
        );
        this.priceSnapshots = this.priceContainers.map((container) => ({
          container,
          html: container.innerHTML,
        }));
        this.paymentButtons = this.hiddenInputs
          .map((input) => document.getElementById(input.getAttribute('form')))
          .filter(Boolean)
          .map((form) => form.querySelector('.shopify-payment-button'))
          .filter(Boolean);

        this.handleModeChange = this.handleModeChange.bind(this);
        this.handlePlanChange = this.handlePlanChange.bind(this);

        this.modeInputs.forEach((input) => input.addEventListener('change', this.handleModeChange));
        this.planSelect?.addEventListener('change', this.handlePlanChange);

        this.syncState();
      }

      disconnectedCallback() {
        this.modeInputs?.forEach((input) => input.removeEventListener('change', this.handleModeChange));
        this.planSelect?.removeEventListener('change', this.handlePlanChange);
      }

      handleModeChange() {
        this.syncState();
      }

      handlePlanChange() {
        this.syncState();
      }

      get selectedMode() {
        return this.querySelector('.product-selling-plan__mode-input:checked')?.value || 'one-time';
      }

      get selectedPlanOption() {
        return this.planSelect?.selectedOptions?.[0];
      }

      syncState() {
        const isSubscription = this.selectedMode === 'subscription';
        const selectedPlan = this.selectedPlanOption;
        const sellingPlanId = isSubscription ? selectedPlan?.value || '' : '';

        this.modeTabs.forEach((tab) => {
          const active = tab.dataset.modeTab === this.selectedMode;
          tab.classList.toggle('is-active', active);
          tab.setAttribute('aria-selected', active ? 'true' : 'false');
        });

        this.modePanels.forEach((panel) => {
          panel.classList.toggle('is-active', panel.dataset.modePanel === this.selectedMode);
        });

        if (this.planSelect) {
          this.planSelect.disabled = !isSubscription;
        }

        this.hiddenInputs.forEach((input) => {
          input.disabled = !isSubscription || !sellingPlanId;
          input.value = sellingPlanId;
        });

        this.paymentButtons.forEach((button) => {
          button.hidden = isSubscription;
        });

        this.updateProductPagePrices({
          isSubscription,
          formattedPrice: selectedPlan?.dataset.formattedPrice || '',
          formattedComparePrice: selectedPlan?.dataset.formattedComparePrice || '',
          hasDiscount: Boolean(selectedPlan?.dataset.badge),
        });

        this.updateInlineSubscriptionPrice(selectedPlan);
      }

      updateInlineSubscriptionPrice(selectedPlan) {
        if (!selectedPlan || !this.priceNode) return;

        const formattedPrice = selectedPlan.dataset.formattedPrice || '';
        const formattedComparePrice = selectedPlan.dataset.formattedComparePrice || '';
        const badge = selectedPlan.dataset.badge || '';

        this.priceNode.textContent = formattedPrice;

        if (this.comparePriceNode) {
          this.comparePriceNode.textContent = formattedComparePrice;
          this.comparePriceNode.classList.toggle('hidden', !badge);
        }

        if (this.badgeNode) {
          this.badgeNode.textContent = badge;
          this.badgeNode.classList.toggle('hidden', !badge);
        }
      }

      updateProductPagePrices({ isSubscription, formattedPrice, formattedComparePrice, hasDiscount }) {
        if (!this.priceSnapshots.length) return;

        if (!isSubscription) {
          this.priceSnapshots.forEach(({ container, html }) => {
            container.innerHTML = html;
          });
          return;
        }

        this.priceSnapshots.forEach(({ container }) => {
          const priceRoot = container.querySelector('.price');
          if (!priceRoot) return;

          const regularPriceNodes = container.querySelectorAll('.price__regular .price-item--regular bdi');
          const salePriceNode = container.querySelector('.price__sale .price-item--sale bdi');
          const saleCompareNode = container.querySelector('.price__sale .price-item--regular bdi');

          if (hasDiscount && salePriceNode && saleCompareNode) {
            priceRoot.classList.add('price--on-sale');
            priceRoot.classList.remove('price--no-compare');
            salePriceNode.textContent = formattedPrice;
            saleCompareNode.textContent = formattedComparePrice;
          } else {
            priceRoot.classList.remove('price--on-sale');
            regularPriceNodes.forEach((node) => {
              node.textContent = formattedPrice;
            });
          }
        });
      }
    }
  );
}
