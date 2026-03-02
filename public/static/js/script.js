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
      loadRevisions();
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

async function loadRevisions() {
  var el = document.getElementById('revisions-list');
  if (!el) return;
  try {
    var resp = await fetch('/wiki/' + encodeURIComponent(YWIKI_PATH) + '/revisions?limit=20');
    if (!resp.ok) return;
    var data = await resp.json();
    var list = (data && data.revisions) ? data.revisions : [];
    if (list.length === 0) {
      el.innerHTML = '<p class="resort-list-empty">No revisions yet.</p>';
    } else {
      el.innerHTML = list.map(function (r) {
        var ts = r.timestamp ? new Date(r.timestamp).toLocaleString() : '';
        var user = r.userId || 'anonymous';
        var summary = (r.summary || 'Edit').replace(/</g, '&lt;');
        return '<div class="resort-revision-item"><span class="resort-revision-time">' + ts + '</span> <span class="resort-revision-user">' + user + '</span>: ' + summary + '</div>';
      }).join('');
    }
  } catch (e) {
    el.innerHTML = '<p class="resort-list-empty">Could not load revisions.</p>';
  }
}

async function loadComments() {
  var el = document.getElementById('comments-list');
  if (!el) return;
  try {
    var resp = await fetch('/wiki/' + encodeURIComponent(YWIKI_PATH) + '/comments?limit=100');
    if (!resp.ok) return;
    var data = await resp.json();
    var list = (data && data.comments) ? data.comments : [];
    if (list.length === 0) {
      el.innerHTML = '<p class="resort-list-empty">No comments yet.</p>';
    } else {
      el.innerHTML = list.map(function (c) {
        var ts = c.timestamp ? new Date(c.timestamp).toLocaleString() : '';
        var user = c.userId || 'anonymous';
        var content = (c.content || '').replace(/</g, '&lt;').replace(/\n/g, '<br/>');
        return '<div class="resort-comment-item"><span class="resort-comment-meta">' + user + ' · ' + ts + '</span><p class="resort-comment-content">' + content + '</p></div>';
      }).join('');
    }
  } catch (e) {
    el.innerHTML = '<p class="resort-list-empty">Could not load comments.</p>';
  }
}

async function postComment() {
  var input = document.getElementById('comment-input');
  var btn = document.getElementById('comment-submit-btn');
  if (!input || !btn) return;

  var content = (input.value || '').trim();
  if (!content) {
    alert('Enter a comment.');
    return;
  }

  var token = (window.ywikiAuth && typeof ywikiAuth.getToken === 'function') ? ywikiAuth.getToken() : null;
  if (!token) {
    alert('Sign in required to post a comment.');
    return;
  }

  btn.disabled = true;
  try {
    var resp = await fetch('/wiki/' + encodeURIComponent(YWIKI_PATH) + '/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ content: content })
    });
    if (resp.ok) {
      input.value = '';
      loadComments();
    } else if (resp.status === 401) {
      alert('Sign in required to post a comment.');
    } else {
      alert('Failed to post comment: ' + resp.status);
    }
  } catch (e) {
    alert('Failed to post comment.');
  }
  btn.disabled = false;
}
