(function () {
  function getPlayOverlay(videoElement) {
    if (!videoElement) return null;
    const wrapper = videoElement.closest('.troche-diff-v2__responsive-video');
    if (!wrapper) return null;
    return wrapper.querySelector('[data-video-play-button]');
  }

  document.addEventListener('click', function (event) {
    const trigger = event.target.closest('[data-video-play-button]');
    if (!trigger) return;

    const wrapper = trigger.closest('.troche-diff-v2__responsive-video');
    if (!wrapper) return;

    const video = wrapper.querySelector('video.troche-diff-v2__video');
    if (!video) return;

    const playPromise = video.play();
    trigger.classList.add('is-hidden');

    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(function () {
        trigger.classList.remove('is-hidden');
      });
    }
  });

  document.addEventListener(
    'play',
    function (event) {
      if (!(event.target instanceof HTMLVideoElement)) return;
      if (!event.target.classList.contains('troche-diff-v2__video')) return;
      const overlay = getPlayOverlay(event.target);
      if (overlay) overlay.classList.add('is-hidden');
    },
    true
  );

  document.addEventListener(
    'pause',
    function (event) {
      if (!(event.target instanceof HTMLVideoElement)) return;
      if (!event.target.classList.contains('troche-diff-v2__video')) return;
      if (event.target.ended) return;
      const overlay = getPlayOverlay(event.target);
      if (overlay) overlay.classList.remove('is-hidden');
    },
    true
  );

  document.addEventListener(
    'ended',
    function (event) {
      if (!(event.target instanceof HTMLVideoElement)) return;
      if (!event.target.classList.contains('troche-diff-v2__video')) return;
      const overlay = getPlayOverlay(event.target);
      if (overlay) overlay.classList.remove('is-hidden');
    },
    true
  );
})();
