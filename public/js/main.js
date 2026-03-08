document.addEventListener('DOMContentLoaded', () => {
  const externalAffiliateLinks = document.querySelectorAll('a[rel*="sponsored"]');
  externalAffiliateLinks.forEach((link) => {
    link.addEventListener('click', () => {
      link.classList.add('is-clicked');
    });
  });
});
