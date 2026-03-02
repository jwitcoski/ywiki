function run() {
  var text = document.getElementById('sourceTA').value,
      target = document.querySelector('.js-resort-body'),
      converter = new showdown.Converter();

  if (!target) return;

  var html = converter.makeHtml(text || '');
  target.innerHTML = html;

  var firstP = target.querySelector('p');
  if (firstP) firstP.classList.add('resort-body-first');
}
