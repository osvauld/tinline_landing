// Light or dark, by choice. Without this script the site simply follows the system setting (tokens.css).
// Loaded in <head> so the chosen theme applies before the first paint; the choice stays in this browser only.
(function () {
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem('theme'); } catch (e) {}
  if (saved === 'light' || saved === 'dark') root.dataset.theme = saved;
  var current = function () {
    return root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  };
  document.addEventListener('DOMContentLoaded', function () {
    var button = document.getElementById('theme');
    if (!button) return;
    var label = function () { button.setAttribute('aria-label', current() === 'dark' ? 'Use light mode' : 'Use dark mode'); };
    label();
    button.hidden = false;
    button.addEventListener('click', function () {
      var next = current() === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (e) {}
      label();
    });
  });
})();
