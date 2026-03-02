// Simple wiki path for this page. In a multi-page app this would
// come from the URL or a data attribute.
var YWIKI_PATH = 'montage-mountain';

function renderFromMarkdown(text) {
  var target = document.querySelector('.js-resort-body');
  if (!target) return;

  var converter = new showdown.Converter();
  var html = converter.makeHtml(text || '');
  target.innerHTML = html;

  var firstP = target.querySelector('p');
  if (firstP) firstP.classList.add('resort-body-first');
}

function run() {
  var text = document.getElementById('sourceTA').value || '';
  renderFromMarkdown(text);
}

async function saveEntry() {
  var textarea = document.getElementById('sourceTA');
  if (!textarea) return;

  var content = textarea.value || '';
  var titleEl = document.querySelector('.resort-title');
  var title = titleEl ? titleEl.textContent.trim() : YWIKI_PATH;

  var user = (window.ywikiAuth && typeof ywikiAuth.getUser === 'function')
    ? (ywikiAuth.getUser() || '')
    : '';

  var token = (window.ywikiAuth && typeof ywikiAuth.getToken === 'function')
    ? ywikiAuth.getToken()
    : null;

  var body = {
    path: YWIKI_PATH,
    title: title,
    user: user || 'anonymous',
    content: content
  };

  var headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }

  try {
    var resp = await fetch('/wiki', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });

    if (resp.ok) {
      alert('Saved!');
    } else if (resp.status === 401) {
      alert('Sign in required to save changes.');
    } else {
      alert('Save failed: ' + resp.status + ' ' + (resp.statusText || ''));
    }
  } catch (e) {
    alert('Save failed (network error).');
  }
}

async function loadEntry() {
  var textarea = document.getElementById('sourceTA');
  if (!textarea) return;

  try {
    var resp = await fetch('/wiki/' + encodeURIComponent(YWIKI_PATH));
    if (!resp.ok) return;
    var entry = await resp.json();
    if (!entry || !entry.content) return;
    textarea.value = entry.content;
    renderFromMarkdown(entry.content);
  } catch (e) {
    // ignore; page will keep its default content
  }
}
