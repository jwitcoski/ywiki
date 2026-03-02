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
  var commentInput = document.getElementById('revision-comment');
  if (!textarea) return;

  var content = textarea.value || '';
  var comment = commentInput ? (commentInput.value || '').trim() : '';
  if (!comment) {
    alert('Revision comment is required. Describe what you changed.');
    if (commentInput) commentInput.focus();
    return;
  }

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
    content: content,
    comment: comment
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
      if (resp.status === 202) {
        alert('Proposed. Pending accept/reject.');
        loadRevisions();
        loadComments();
        if (commentInput) commentInput.value = '';
      } else {
        alert('Saved!');
        loadRevisions();
        loadEntry();
        loadComments();
        if (commentInput) commentInput.value = '';
      }
    } else if (resp.status === 401) {
      alert('Sign in required to save changes.');
    } else if (resp.status === 400) {
      var err = await resp.json().catch(function () { return {}; });
      alert(err.message || 'Comment required.');
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
    var currentUserId = (window.ywikiAuth && typeof ywikiAuth.getUserId === 'function') ? ywikiAuth.getUserId() : null;
    if (list.length === 0) {
      el.innerHTML = '<p class="resort-list-empty">No revisions yet.</p>';
    } else {
      el.innerHTML = list.map(function (r) {
        var ts = r.timestamp ? new Date(r.timestamp).toLocaleString() : '';
        var user = (r.userId || 'anonymous').replace(/</g, '&lt;');
        var summary = (r.summary || 'Edit').replace(/</g, '&lt;');
        var status = (r.status || 'approved').toLowerCase();
        var statusLabel = status === 'pending' ? 'pending' : status === 'rejected' ? 'rejected' : 'accepted';
        var statusClass = 'resort-revision-status resort-revision-status-' + statusLabel;
        var actions = '';
        if (status === 'pending') {
          var isOwnRevision = currentUserId && r.userId && currentUserId === r.userId;
          if (!isOwnRevision) {
            actions = ' <button type="button" class="resort-revision-action resort-revision-accept" data-revision-id="' + (r.revisionId || '').replace(/"/g, '&quot;') + '" onclick="acceptRevision(this.getAttribute(\'data-revision-id\'))">Accept</button>';
          }
          actions += ' <button type="button" class="resort-revision-action resort-revision-reject" data-revision-id="' + (r.revisionId || '').replace(/"/g, '&quot;') + '" onclick="rejectRevision(this.getAttribute(\'data-revision-id\'))">Reject</button>';
        }
        return '<div class="resort-revision-item"><span class="resort-revision-time">' + ts + '</span> <span class="resort-revision-user">' + user + '</span>: ' + summary + ' <span class="' + statusClass + '">(' + statusLabel + ')</span>' + actions + '</div>';
      }).join('');
    }
  } catch (e) {
    el.innerHTML = '<p class="resort-list-empty">Could not load revisions.</p>';
  }
}

async function acceptRevision(revisionId) {
  if (!revisionId) return;
  var token = (window.ywikiAuth && typeof ywikiAuth.getToken === 'function') ? ywikiAuth.getToken() : null;
  if (!token) {
    alert('Sign in required to accept a revision.');
    return;
  }
  var comment = window.prompt('Comment (required): Why are you accepting this revision?');
  if (comment === null) return;
  comment = (comment || '').trim();
  if (!comment) {
    alert('Comment is required.');
    return;
  }
  try {
    var resp = await fetch('/wiki/' + encodeURIComponent(YWIKI_PATH) + '/revisions/' + encodeURIComponent(revisionId) + '/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ comment: comment })
    });
    if (resp.ok) {
      loadRevisions();
      loadEntry();
      loadComments();
    } else if (resp.status === 401) {
      alert('Sign in required.');
    } else if (resp.status === 403) {
      var err = await resp.json().catch(function () { return {}; });
      alert(err.message || 'You cannot accept your own revision; another user must accept it.');
    } else if (resp.status === 400) {
      alert('Comment is required.');
    } else if (resp.status === 404) {
      alert('Revision not found or already handled.');
    } else {
      alert('Failed to accept: ' + resp.status);
    }
  } catch (e) {
    alert('Failed to accept revision.');
  }
}

async function rejectRevision(revisionId) {
  if (!revisionId) return;
  var token = (window.ywikiAuth && typeof ywikiAuth.getToken === 'function') ? ywikiAuth.getToken() : null;
  if (!token) {
    alert('Sign in required to reject a revision.');
    return;
  }
  var comment = window.prompt('Comment (required): Why are you rejecting this revision?');
  if (comment === null) return;
  comment = (comment || '').trim();
  if (!comment) {
    alert('Comment is required.');
    return;
  }
  try {
    var resp = await fetch('/wiki/' + encodeURIComponent(YWIKI_PATH) + '/revisions/' + encodeURIComponent(revisionId) + '/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ comment: comment })
    });
    if (resp.ok) {
      loadRevisions();
      loadComments();
    } else if (resp.status === 401) {
      alert('Sign in required.');
    } else if (resp.status === 400) {
      alert('Comment is required.');
    } else if (resp.status === 404) {
      alert('Revision not found or already handled.');
    } else {
      alert('Failed to reject: ' + resp.status);
    }
  } catch (e) {
    alert('Failed to reject revision.');
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
