(() => {
  const TROPERKS_PATH = '/troperks/customers/';
  const TROPERKS_FALLBACK_ENDPOINT = '/apps/b2b/troperks/customers/';
  const BOUND_ATTRIBUTE = 'data-troperks-bound';

  const debounce = (fn, delay) => {
    let timeoutId;

    return function debounced(...args) {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => fn.apply(this, args), delay);
    };
  };

  const escapeHtml = (value = '') => {
    if (typeof value !== 'string') {
      return '';
    }

    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const ensureLeadingSlash = (value = '') => (value.startsWith('/') ? value : `/${value}`);

  const getApiBase = () => {
    if (typeof window === 'undefined') {
      return '/apps/b2b';
    }

    const candidate = typeof window.apiBaseUrl === 'string' ? window.apiBaseUrl.trim() : '';

    if (!candidate) {
      return '/apps/b2b';
    }

    if (/^https?:\/\//i.test(candidate)) {
      return candidate.replace(/\/+$/, '');
    }

    return ensureLeadingSlash(candidate).replace(/\/+$/, '');
  };

  const resolveTroperksEndpoint = () => {
    if (typeof window !== 'undefined' && typeof window.troperksEndpointUrl === 'string' && window.troperksEndpointUrl.trim() !== '') {
      return window.troperksEndpointUrl.trim();
    }

    if (typeof window !== 'undefined') {
      return `${getApiBase()}${TROPERKS_PATH}`;
    }

    return TROPERKS_FALLBACK_ENDPOINT;
  };

  const buildRequestUrl = (queryParams) => {
    let endpoint = resolveTroperksEndpoint();

    if (!endpoint || typeof endpoint !== 'string') {
      return '';
    }

    if (!/^https?:\/\//i.test(endpoint) && !endpoint.startsWith('//')) {
      endpoint = ensureLeadingSlash(endpoint);
    }

    if (queryParams.length > 0) {
      const separator = endpoint.includes('?') ? '&' : '?';
      endpoint = `${endpoint}${separator}${queryParams.join('&')}`;
    }

    return endpoint;
  };

  const getTemplateHtml = (button, selector, fallback = '') => {
    const template = button.parentElement.querySelector(selector);

    if (!template) {
      return fallback;
    }

    const html = template.innerHTML.trim();

    return html || fallback;
  };

  const buildSuccessMessageFromTemplate = (template, discountCode) => {
    let successMessageTemplate = template;

    if (!successMessageTemplate || successMessageTemplate.trim() === '') {
      successMessageTemplate = '<p>Your discount code is: {{ discount_code }}</p>';
    }

    const includesPlaceholder = /{{\s*discount_code\s*}}/i.test(successMessageTemplate);
    let successMessage = successMessageTemplate;

    if (includesPlaceholder) {
      successMessage = successMessageTemplate.replace(/{{\s*discount_code\s*}}/gi, discountCode || '');
    } else if (discountCode) {
      const separator = successMessage.trim().length > 0 ? '' : '<p>Your discount code is:</p>';
      successMessage = `${successMessage}${separator}<p>${discountCode}</p>`;
    }

    if (!successMessage || successMessage.trim() === '') {
      successMessage = discountCode ? `<p>Your discount code is: ${discountCode}</p>` : '<p>Your perk is ready.</p>';
    }

    return successMessage;
  };

  const showModal = (button, title, message, onClose) => {
    const modal = button.parentElement.querySelector('modal-dialog.troperks-theme-modal');

    if (!modal || typeof modal.show !== 'function') {
      if (typeof onClose === 'function') {
        onClose();
      }
      return;
    }

    const dialog = modal.querySelector('[role="dialog"]');
    const titleNode = modal.querySelector('.troperks-theme-modal__title');
    const bodyNode = modal.querySelector('.troperks-theme-modal__body');

    if (dialog) {
      dialog.setAttribute('aria-label', title || 'Notice');
    }

    if (titleNode) {
      titleNode.textContent = title || 'Notice';
    }

    if (bodyNode) {
      bodyNode.innerHTML = message || '';
    }

    if (modal.__troperksObserver) {
      modal.__troperksObserver.disconnect();
      modal.__troperksObserver = null;
    }

    if (typeof onClose === 'function') {
      let hasOpened = false;
      const observer = new MutationObserver(() => {
        if (modal.hasAttribute('open')) {
          return;
        }

        if (!hasOpened) {
          return;
        }

        observer.disconnect();
        modal.__troperksObserver = null;
        onClose();
      });

      observer.observe(modal, {
        attributes: true,
        attributeFilter: ['open']
      });

      modal.__troperksObserver = observer;
      modal.show(button);
      hasOpened = true;
      return;
    }

    modal.show(button);
  };

  const buildRevealedState = ({ button, headingText, codeText, linkText, linkUrl }) => {
    const finalMessageContainer = button.parentElement.querySelector('.troperks-final-message');
    const disclaimerText = button.parentElement.querySelector('.troperks-disclaimer-text');

    if (!finalMessageContainer) {
      return;
    }

    finalMessageContainer.innerHTML = '';

    const revealedWrapper = document.createElement('div');
    revealedWrapper.className = 'troperks-revealed-code';

    if (headingText) {
      const heading = document.createElement('h4');
      heading.textContent = headingText;
      revealedWrapper.appendChild(heading);
    }

    if (codeText) {
      const codeParagraph = document.createElement('p');
      codeParagraph.textContent = codeText;
      revealedWrapper.appendChild(codeParagraph);
    } else if (linkText && linkUrl) {
      const linkWrapper = document.createElement('p');
      const link = document.createElement('a');
      link.href = linkUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = linkText;
      linkWrapper.appendChild(link);
      revealedWrapper.appendChild(linkWrapper);
    }

    finalMessageContainer.appendChild(revealedWrapper);
    finalMessageContainer.style.display = 'block';

    if (disclaimerText) {
      disclaimerText.style.display = 'none';
    }
  };

  const handlePreviewReveal = (button) => {
    button.classList.remove('working');
    button.disabled = false;

    const previewCode = (button.dataset.previewCode || 'SAMPLECODE123').trim();
    const successTitle = button.dataset.successModalTitle || 'Success';
    const successTemplate = getTemplateHtml(button, '.troperks-success-template', '<p>Your discount code is: {{ discount_code }}</p>');
    const successMessage = buildSuccessMessageFromTemplate(successTemplate, escapeHtml(previewCode));

    showModal(button, successTitle, successMessage, () => {
      buildRevealedState({
        button,
        headingText: 'Preview Discount Code:',
        codeText: previewCode || 'SAMPLECODE123'
      });
    });
  };

  const handleButtonClick = function handleButtonClick() {
    const button = this;
    const isPreviewReveal = button.dataset.previewReveal === 'true';

    if (isPreviewReveal) {
      handlePreviewReveal(button);
      return;
    }

    const customerId = button.dataset.customerId;

    if (!customerId) {
      const loggedOutTitle = button.dataset.loggedOutModalTitle || 'Login Required';
      const loggedOutMessage = getTemplateHtml(
        button,
        '.troperks-logged-out-template',
        '<p>Please log in to reveal your discount.</p>'
      );

      showModal(button, loggedOutTitle, loggedOutMessage);
      return;
    }

    button.classList.add('working');
    button.disabled = true;

    const perkName = button.dataset.perkName;
    const queryParams = [`logged_in_customer_id=${encodeURIComponent(customerId)}`];

    if (perkName) {
      queryParams.push(`perk_handle=${encodeURIComponent(perkName)}`);
    }

    const requestUrl = buildRequestUrl(queryParams);

    if (!requestUrl) {
      const errorTitle = button.dataset.errorModalTitle || 'Error';
      showModal(button, errorTitle, '<p>This perk is not configured correctly. Please contact support.</p>', () => {
        button.classList.remove('working');
        button.disabled = false;
      });
      return;
    }

    fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().catch(() => {
            throw new Error('Network response was not ok');
          }).then((error) => {
            throw error;
          });
        }

        return response.json();
      })
      .then((data) => {
        button.classList.remove('working');

        const hasActiveSubscription = data?.has_active_subscription === true
          || data?.has_active_subscription === 'true'
          || data?.has_active_subscription === 1
          || data?.has_active_subscription === '1';

        if (!hasActiveSubscription) {
          const noSubscriptionTitle = button.dataset.noSubscriptionModalTitle || 'Subscription Required';
          const noSubscriptionMessage = getTemplateHtml(
            button,
            '.troperks-no-subscription-template',
            '<p>You need an active subscription to reveal this discount.</p>'
          );

          showModal(button, noSubscriptionTitle, noSubscriptionMessage, () => {
            button.disabled = false;
          });

          return;
        }

        const accessUrl = typeof data?.access_url === 'string' ? data.access_url.trim() : '';
        const parsedDiscountCode = typeof data?.discount_code === 'string' ? data.discount_code.trim() : '';
        const normalizedDiscountCode = parsedDiscountCode.toUpperCase ? parsedDiscountCode.toUpperCase() : '';
        const isAmaLiveCode = normalizedDiscountCode === 'DRSCOTTAMA';
        const isAmaRecordingsCode = normalizedDiscountCode === 'DRSCOTTAMARECORD';
        const discountCode = (isAmaLiveCode || isAmaRecordingsCode) ? '' : parsedDiscountCode;
        const hasDiscountCode = Boolean(discountCode);
        const hasAccessUrl = Boolean(accessUrl);

        if (!hasDiscountCode && !hasAccessUrl) {
          const successTitle = button.dataset.successModalTitle || 'Success';
          const noDiscountMessage = getTemplateHtml(
            button,
            '.troperks-no-discount-template',
            '<p>No active discount code is available right now. Please try again later.</p>'
          );

          showModal(button, successTitle, noDiscountMessage, () => {
            button.disabled = false;
          });

          return;
        }

        const escapedDiscountCode = escapeHtml(discountCode);
        const successTitle = button.dataset.successModalTitle || 'Success';
        const successTemplate = getTemplateHtml(
          button,
          '.troperks-success-template',
          '<p>Your discount code is: {{ discount_code }}</p>'
        );

        let successMessage = buildSuccessMessageFromTemplate(successTemplate, escapedDiscountCode);
        let revealedHeading = hasDiscountCode ? 'Your Discount Code:' : 'Perk Ready';
        let revealedLinkText = 'Access your perk';

        if (isAmaLiveCode && hasAccessUrl) {
          successMessage = `<p>Your AMA session is ready.</p><p><a href="${escapeHtml(accessUrl)}" target="_blank" rel="noopener noreferrer">Join the Zoom</a></p>`;
          revealedHeading = 'Your AMA Link:';
          revealedLinkText = 'Join the Zoom';
        } else if (isAmaRecordingsCode && hasAccessUrl) {
          successMessage = `<p>Your AMA recordings are ready.</p><p><a href="${escapeHtml(accessUrl)}" target="_blank" rel="noopener noreferrer">Watch the recordings</a></p>`;
          revealedHeading = 'AMA Recordings:';
          revealedLinkText = 'Watch the recordings';
        }

        showModal(button, successTitle, successMessage, () => {
          buildRevealedState({
            button,
            headingText: revealedHeading,
            codeText: hasDiscountCode ? discountCode : '',
            linkText: !hasDiscountCode && hasAccessUrl ? revealedLinkText : '',
            linkUrl: !hasDiscountCode && hasAccessUrl ? accessUrl : ''
          });

          if (hasDiscountCode) {
            button.remove();
          } else {
            button.disabled = false;
          }

          if (hasAccessUrl) {
            try {
              window.open(accessUrl, '_blank', 'noopener,noreferrer');
            } catch (error) {
              console.warn('Failed to open redirect URL:', error);
            }
          }
        });
      })
      .catch((error) => {
        console.error('Troperks error:', error);
        button.classList.remove('working');
        const errorTitle = button.dataset.errorModalTitle || 'Error';

        showModal(button, errorTitle, '<p>An error occurred. Please try again later.</p>', () => {
          button.disabled = false;
        });
      });
  };

  const initTroperksButtons = (root = document) => {
    const buttons = root.querySelectorAll(`.troperks-action-button:not([${BOUND_ATTRIBUTE}])`);

    buttons.forEach((button) => {
      button.setAttribute(BOUND_ATTRIBUTE, 'true');
      button.addEventListener('click', debounce(handleButtonClick, 500));
    });
  };

  document.addEventListener('DOMContentLoaded', () => initTroperksButtons());
  document.addEventListener('shopify:section:load', (event) => initTroperksButtons(event.target));
})();
