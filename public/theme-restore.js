(function () {
  try {
    var mode = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = mode === 'dark' || (mode !== 'light' && prefersDark);
    document.documentElement.classList.toggle('dark', dark);

    var theme = localStorage.getItem('user_theme_preference');
    if (theme) {
      document.documentElement.setAttribute('data-theme', theme);
    }
  } catch (_) {}
})();
