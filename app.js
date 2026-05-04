document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const root = document.documentElement; 

  const mobileToggleBtn = document.querySelector('.mostraContattiMobile');
  const contattiHeader = document.querySelector('.contattiHeader');
  const toTopLink = document.querySelector('a#toTop');

  const getScrollTop = () => Math.max(body.scrollTop, root.scrollTop);

  const updateFixedHeader = () => {
    const isScrolled = getScrollTop() > 85;
    const isMobile = window.innerWidth < 992;

    document.querySelectorAll('header, .fixedHeader').forEach((el) => {
      el.classList.toggle('scrollato', isScrolled && isMobile);
    });

    if (!isScrolled) {
      document
        .querySelectorAll('.mostraContattiMobile, .contattiHeader')
        .forEach((el) => el.classList.remove('cliccato'));
    }
  };

  const updateTopScroller = () => {
    const show = getScrollTop() > window.innerHeight / 2;
    document.querySelectorAll('footer').forEach((el) => {
      el.classList.toggle('scrollato', show);
    });
  };

  const onScroll = () => {
    updateFixedHeader();
    updateTopScroller();
  };

  window.addEventListener('scroll', onScroll);
  window.addEventListener('resize', onScroll);
  onScroll();

  if (mobileToggleBtn) {
    mobileToggleBtn.addEventListener('click', () => {
      mobileToggleBtn.classList.toggle('cliccato');
      if (contattiHeader) contattiHeader.classList.toggle('cliccato');
    });
  }

  if (toTopLink) {
    toTopLink.addEventListener('click', (e) => {
      e.preventDefault();
      const targetSelector = toTopLink.getAttribute('href');
      const target = targetSelector ? document.querySelector(targetSelector) : null;
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
});